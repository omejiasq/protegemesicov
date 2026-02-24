import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /** Registro: delega al UsersService con los datos del DTO completo */
  async register(userInfo: any) {
    //return this.usersService.create(userInfo);
    return this.usersService.register(userInfo);
  }

  /** Validación de credenciales */
  async validateUser(usuario: string, password: string) {
    return this.usersService.validateUser(usuario, password);
  }

  /** Login: construye el token + datos del usuario */
  async login(user: any) {
    if (!user) return null;

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
