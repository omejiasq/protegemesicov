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

  async log(entry: Partial<Audit>): Promise<void> {
    try {
      // Si te pasan userId explícito, lo respetás; si no, lo tomás del request
      const userId = entry.userId ?? this.getCurrentUserId();

      await this.auditModel.create({
        ...entry,
        userId,
      });
    } catch (err) {
      // no bloquear el flujo si falla la auditoría
      // eslint-disable-next-line no-console
      console.error('Audit log failed:', err);
    }
  }
}