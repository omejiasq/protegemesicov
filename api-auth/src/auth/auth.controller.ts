import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  /**
   * Registro de usuario
   * Se espera:
   * {
   *    userInfo: { usuario, email, firstName, lastName, ... },
   *    password,
   *    roleType,
   *    enterprise_id
   * }
   */
  @Post('register')
  async register(@Body() body: any) {
    if (!body.userInfo) {
      throw new BadRequestException('userInfo is required');
    }
    if (!body.password) {
      throw new BadRequestException('password is required');
    }
    if (!body.roleType) {
      throw new BadRequestException('roleType is required');
    }

    return this.authService.register(body);
  }

  /**
   * Login
   * Permite autenticación por usuario, email o username
   */
  @Post('login')
  async login(@Body() body: { usuario: string; password: string }) {
    if (!body?.usuario || !body?.password) {
      throw new BadRequestException('usuario and password are required');
    }

    const user = await this.authService.validateUser(
      body.usuario,
      body.password,
    );

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.authService.login(user);
  }

  /**
   * Recuperar contraseña por usuario o correo
   * POST /auth/forgot-password
   * Body: { identifier: "usuario_o_correo" }
   */
  @Post('forgot-password')
  async forgotPassword(@Body('identifier') identifier: string) {
    if (!identifier?.trim()) {
      throw new BadRequestException('El campo identifier (usuario o correo) es requerido');
    }
    return this.authService.forgotPassword(identifier);
  }

  /**
   * Cambiar contraseña — alias para el path que llega desde el proxy de producción
   * PATCH /auth/users/:id/password
   */
  @Patch('users/:id/password')
  async updatePassword(
    @Param('id') id: string,
    @Body('newPassword') newPassword: string,
  ) {
    if (!newPassword) {
      throw new BadRequestException('newPassword es requerido');
    }
    return this.usersService.updatePassword(id, newPassword);
  }
}
