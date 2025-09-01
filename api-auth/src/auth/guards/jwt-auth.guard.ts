import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService, private usersService: UsersService) {}

async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest<Request>();
  const authHeader = request.headers['authorization'];
  
  if (!authHeader) throw new UnauthorizedException('Token no proporcionado');

  const [, token] = authHeader.split(' ');

  if (!token) throw new UnauthorizedException('Token inválido');

  try {
    const payload = this.jwtService.verify(token, { secret: 'SUPER_SECRET_KEY' });
    const user = await this.usersService.findByUsername(payload.username.usuario);

    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    request.user = user; 
    return true;
  } catch (err) {
    throw new UnauthorizedException('Token inválido o expirado');
  }
}
}