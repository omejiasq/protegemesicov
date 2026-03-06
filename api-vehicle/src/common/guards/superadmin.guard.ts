import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class SuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    // JWT payload: field is 'role' (set by api-auth)
    if (!user || user.role !== 'superadmin') {
      throw new ForbiddenException('Acceso restringido a superadministradores');
    }
    return true;
  }
}
