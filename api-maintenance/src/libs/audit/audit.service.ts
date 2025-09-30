import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Audit, AuditDocument } from './audit.schema';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(Audit.name) private readonly auditModel: Model<AuditDocument>,
  ) {}

  async log(entry: Partial<Audit>): Promise<void> {
    try {
      const base: Partial<Audit> = {
        module: entry.module ?? 'maintenance',
        operation: entry.operation ?? 'unknown',
        endpoint: entry.endpoint ?? 'unknown',
        responseStatus: entry.responseStatus ?? 0,
        success: entry.success ?? false,
        durationMs: entry.durationMs,
        requestPayload: entry.requestPayload,
        responseBody: entry.responseBody,
        userId: entry.userId,
        enterpriseId: entry.enterpriseId,
      };
      await this.auditModel.create(base);
    } catch (err) {
      // si algo falla en auditoría, no rompas el flujo de negocio
      this.logger.error(`Audit create failed: ${(err as Error).message}`);
    }
  }
}
