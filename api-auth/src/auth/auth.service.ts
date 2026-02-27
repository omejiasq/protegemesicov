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

    // 1️⃣ Verificar que el usuario esté activo
    if (user.active === false) {
      throw new ForbiddenException('Su usuario está desactivado');
    }

    // 2️⃣ Verificar que la empresa esté activa (si tiene enterprise_id)
    if (user.enterprise_id) {
      const enterprise = await this.enterpriseModel
        .findById(user.enterprise_id, {
          active: 1,
          deactivationReason: 1,
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
    }

    // 3️⃣ Generar token solo si todo está OK
    const info = user.userInfo ?? {};

    const payload = {
      sub: String(user._id),
      username: info.usuario,
      role: user.roleType,
      enterprise_id: user.enterprise_id ?? null,
      vigiladoId: user.vigiladoId ?? null,
      vigiladoToken: user.vigiladoToken ?? null,
    };

    const token = this.jwtService.sign(payload);

    return {
      user: {
        _id: user._id,
        username: info.usuario ?? null,
        email: info.email ?? null,
        firstName: info.firstName ?? null,
        lastName: info.lastName ?? null,
        phone: info.phone ?? null,
        documentType: info.documentType ?? null,
        documentNumber: info.documentNumber ?? null,
        roleType: user.roleType,
      },
      token,
      enterprise_id: user.enterprise_id ?? null,
    };
  }
}