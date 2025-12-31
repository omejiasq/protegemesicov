import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
  } from '@nestjs/common';
  
  @Injectable()
  export class EnterpriseGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const user = request.user;
  
      if (!user?.enterprise_id) {
        throw new ForbiddenException('Empresa no asociada al usuario');
      }
  
      return true;
    }
  }
  