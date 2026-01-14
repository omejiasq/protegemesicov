import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
}
