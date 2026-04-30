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

      if (auditMetadata.operation === 'create') {
        request.body.createdBy = currentUserId;
      } else if (auditMetadata.operation === 'update') {
        request.body.updatedBy = currentUserId;
      }
    }

    return next.handle().pipe(
      map((data) => {
        // Aquí se puede agregar lógica adicional post-procesamiento si es necesario
        return data;
      }),
    );
  }
}