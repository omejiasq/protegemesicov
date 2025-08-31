import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: { usuario: string; password: string }) {
    const user = await this.authService.validateUser(body.usuario, body.password);
    if (!user) return { error: 'Credenciales inválidas' };
    return this.authService.login(user);
  }
}