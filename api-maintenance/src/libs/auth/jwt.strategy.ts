import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not set');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    console.log(`🔑 [JwtStrategy] Validating token for user:`, payload.username, 'enterprise:', payload.enterprise_id);
    return {
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
      enterprise_id: payload.enterprise_id,
      vigiladoId: payload.vigiladoId,
      vigiladoToken: payload.vigiladoToken,
      tipo_habilitacion: payload.tipo_habilitacion,
    };
  }
  
  
  
}