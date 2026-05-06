import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const path = request.url;
    const method = request.method;
    
    // Solo logear las rutas de placas para debugging
    if (path.includes('/placas/')) {
      console.log(`🔐 [JwtAuthGuard] ${method} ${path}`);
      console.log(`🔐 [JwtAuthGuard] Authorization header:`, request.headers.authorization ? 'Present' : 'Missing');
    }
    
    // 🔎 Verifica si la ruta o el controller es público
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 🔓 Si es público, NO aplica JWT
    if (isPublic) {
      return true;
    }

    // 🔐 Si no es público, TODO funciona igual que antes
    return super.canActivate(context);
  }
}
