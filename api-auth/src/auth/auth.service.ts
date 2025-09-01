import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async register(userInfo: any) {
    return this.usersService.create(userInfo);
  }

  async validateUser(usuario: string, password: string) {
    return this.usersService.validateUser(usuario, password);
  }

  async login(user: any) {
    const payload = { sub: user._id, username: user.usuario, enterprise_id: user.enterprise_id };
    const token = this.jwtService.sign(payload);

    return {
      usuario: {
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre,
        apellido: user.apellido || null,
        telefono: user.telefono || null,
        correo: user.correo || null,
      },
      token,
      rol: user.rol || null,
      enterprise_id: user.enterprise_id || null,
    };
  }
}