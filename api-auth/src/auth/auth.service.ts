import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(userInfo: any) {
    return this.usersService.create(userInfo);
  }

  async validateUser(usuario: string, password: string) {
    return this.usersService.validateUser(usuario, password);
  }

  async login(user: any) {
    const u = user?.usuario ?? {};
    const payload = {
      sub: String(user._id),
      username: u.usuario,
      enterprise_id: user.enterprise_id,
    };
    const token = this.jwtService.sign(payload);

    return {
      usuario: {
        _id: String(u._id ?? ''),
        usuario: u.usuario ?? null,
        nombre: u.nombre ?? null,
        apellido: u.apellido ?? null,
        telefono: u.telefono ?? null,
        correo: u.correo ?? null,
      },
      token,
      rol: user.rol ?? null,
      enterprise_id: user.enterprise_id ?? null,
    };
  }
}
