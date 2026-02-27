import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { Enterprise, EnterpriseDocument } from '../schemas/enterprise.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel(Enterprise.name)
    private readonly enterpriseModel: Model<EnterpriseDocument>,
  ) {}

  async register(userInfo: any) {
    return this.usersService.register(userInfo);
  }

  async validateUser(usuario: string, password: string) {
    return this.usersService.validateUser(usuario, password);
  }

  async login(user: any) {
    if (!user) return null;

    if (user.active === false) {
      throw new ForbiddenException('Su usuario está desactivado');
    }

    let vigiladoId = user.vigiladoId ?? null;
    let vigiladoToken = user.vigiladoToken ?? null;

    if (user.enterprise_id) {
      const enterprise = await this.enterpriseModel
        .findById(user.enterprise_id, {
          active: 1,
          deactivationReason: 1,
          vigiladoId: 1,
          vigiladoToken: 1,
        })
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

      vigiladoId = enterprise.vigiladoId ?? vigiladoId;
      vigiladoToken = enterprise.vigiladoToken ?? vigiladoToken;
    }

    // ✅ Los datos del usuario están en el subdocumento "usuario"
    const info = user.usuario ?? {};

    const payload = {
      sub: String(user._id),
      username: info.usuario ?? null,
      role: user.roleType,
      enterprise_id: user.enterprise_id ?? null,
      vigiladoId,
      vigiladoToken,
    };

    const token = this.jwtService.sign(payload);

    return {
      user: {
        _id: user._id,
        username: info.usuario ?? null,           // "cooperstram"
        email: info.correo ?? null,               // ✅ campo real en BD
        firstName: info.nombre ?? null,           // ✅ campo real en BD
        lastName: info.apellido ?? null,          // ✅ campo real en BD
        phone: info.telefono ?? null,             // ✅ campo real en BD
        documentType: info.document_type ?? null, // ✅ campo real en BD
        documentNumber: info.documentNumber ?? null,
        roleType: user.roleType,
      },
      token,
      enterprise_id: user.enterprise_id ?? null,
    };
  }
}