// src/auth/guards/jwt-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { Enterprise, EnterpriseDocument } from '../../schemas/enterprise.schema';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @InjectModel(Enterprise.name)
    private readonly enterpriseModel: Model<EnterpriseDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Token inválido');
    }

    try {
      // 🔐 Verifica el token
      const payload = this.jwtService.verify(token);

      // ✅ Busca el usuario por ID
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      // 🚫 Verificar que el usuario esté activo
      if (user.active === false) {
        throw new ForbiddenException('Su usuario está desactivado');
      }

      // 🏢 Verificar empresa activa (solo si tiene enterprise_id)
      if (payload.enterprise_id) {
        const enterprise = await this.enterpriseModel
          .findById(
            new Types.ObjectId(payload.enterprise_id),
            { active: 1, deactivationReason: 1 }, // solo trae estos 2 campos
          )
          .lean();

        if (!enterprise) {
          throw new UnauthorizedException('Empresa no encontrada');
        }

        if (!enterprise.active) {
          throw new ForbiddenException(
            enterprise.deactivationReason
              ? `Empresa desactivada: ${enterprise.deactivationReason}`
              : 'Su empresa no tiene acceso activo a la plataforma',
          );
        }
      }

      // 🔥 Adjunta usuario al request (igual que antes)
      request.user = {
        ...user,
        enterprise_id: payload.enterprise_id,
      };

      return true;

    } catch (error) {
      // Re-lanzar ForbiddenException sin envolverla
      if (error instanceof ForbiddenException) throw error;
      if (error instanceof UnauthorizedException) throw error;

      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}