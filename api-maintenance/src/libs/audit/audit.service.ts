import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Audit, AuditDocument } from './audit.schema';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(Audit.name)
    private readonly auditModel: Model<AuditDocument>,
  ) {}

  async log(entry: Partial<Audit>): Promise<void> {
    try {
      await this.auditModel.create(entry);
    } catch (err) {
      // no bloquear el flujo si falla la auditoría
      // eslint-disable-next-line no-console
      console.error('Audit log failed:', err);
    }
  }
}
