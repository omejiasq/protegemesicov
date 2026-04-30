import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

export const AUDIT_KEY = 'audit';
export const Audit = (operation: string) => {
  return (target: any, key: string, descriptor: any) => {
    Reflect.defineMetadata(AUDIT_KEY, { operation }, descriptor.value);
    return descriptor;
  };
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const auditMetadata = this.reflector.get(AUDIT_KEY, context.getHandler());

    // Si no tiene metadatos de auditoría, continúa normalmente
    if (!auditMetadata) {
      return next.handle();
    }

    // Inyectar información del usuario actual en el body para operaciones de auditoría
    if (request.user && request.body) {
      const currentUserId = request.user.sub || request.user._id || request.user.userId;

      // Debug logs
      console.log('🔍 AuditInterceptor - req.user:', JSON.stringify(request.user, null, 2));
      console.log('🔍 AuditInterceptor - currentUserId:', currentUserId);
      console.log('🔍 AuditInterceptor - operation:', auditMetadata.operation);

      if (auditMetadata.operation === 'create') {
        request.body.createdBy = currentUserId;
        console.log('✅ AuditInterceptor - Set createdBy:', currentUserId);
      } else if (auditMetadata.operation === 'update') {
        request.body.updatedBy = currentUserId;
        console.log('✅ AuditInterceptor - Set updatedBy:', currentUserId);
      }
    } else {
      console.log('❌ AuditInterceptor - No user or body:', {
        hasUser: !!request.user,
        hasBody: !!request.body,
        user: request.user ? JSON.stringify(request.user, null, 2) : 'null'
      });
    }

    return next.handle().pipe(
      map((data) => {
        // Aquí se puede agregar lógica adicional post-procesamiento si es necesario
        return data;
      }),
    );
  }
}