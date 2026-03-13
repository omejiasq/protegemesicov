import { Injectable, Scope, Inject, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { REQUEST } from '@nestjs/core';
import { Model } from 'mongoose';
// Tipamos liviano para Express/Fastify sin pelear con TS:
type AnyRequest = { user?: any } & Record<string, any>;

import { Audit, AuditDocument } from './audit.schema';

@Injectable({ scope: Scope.REQUEST }) // 👈 instancia por request
export class AuditService {
  constructor(
    @InjectModel(Audit.name)
    private readonly auditModel: Model<AuditDocument>,

    // 👇 Puede no existir (cron/microservicio), por eso @Optional
    @Optional() @Inject(REQUEST) private readonly req?: AnyRequest,
  ) {}

  private getCurrentUserId(): string | undefined {
    const u = this?.req?.user;
    return u?.sub != null ? String(u.sub) : undefined;
  }

  private getCurrentEnterpriseId(): string | undefined {
    return this?.req?.user?.enterprise_id ?? undefined;
  }

  async log(entry: Partial<Audit>): Promise<void> {
    try {
      const userId = entry.userId ?? this.getCurrentUserId();
      const enterpriseId = entry.enterpriseId ?? this.getCurrentEnterpriseId();

      // Redactar tokens del responseBody antes de persistir
      const safeBody = this.redactBody(entry.responseBody);

      // Detectar errores embebidos: SICOV a veces retorna HTTP 2xx pero con
      // responseBody.status 4xx/5xx. En ese caso success debe ser false.
      const embeddedStatus =
        safeBody != null &&
        typeof safeBody === 'object' &&
        'status' in (safeBody as any)
          ? Number((safeBody as any).status)
          : null;

      const realSuccess =
        entry.success === false
          ? false
          : embeddedStatus != null && embeddedStatus >= 400
            ? false
            : (entry.success ?? false);

      await this.auditModel.create({
        ...entry,
        responseBody: safeBody,
        userId,
        enterpriseId,
        success: realSuccess,
      });
    } catch (err) {
      // no bloquear el flujo si falla la auditoría
      // eslint-disable-next-line no-console
      console.error('Audit log failed:', err);
    }
  }

  /** Redacta campos sensibles del body de respuesta (token, etc.) */
  private redactBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;
    const SENSITIVE = ['token', 'access_token', 'password', 'contrasena', 'bearer'];
    const clone: any = JSON.parse(JSON.stringify(body));
    const redact = (obj: any) => {
      for (const k of Object.keys(obj)) {
        if (SENSITIVE.includes(k.toLowerCase())) {
          obj[k] = '***redacted***';
        } else if (obj[k] && typeof obj[k] === 'object') {
          redact(obj[k]);
        }
      }
    };
    redact(clone);
    return clone;
  }
}