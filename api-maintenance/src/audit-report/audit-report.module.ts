// src/audit-report/audit-report.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Audit, AuditSchema } from '../libs/audit/audit.schema';
import { AuditReportService } from './audit-report.service';
import { AuditReportController } from './audit-report.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Audit.name, schema: AuditSchema }]),
  ],
  controllers: [AuditReportController],
  providers: [AuditReportService],
})
export class AuditReportModule {}
