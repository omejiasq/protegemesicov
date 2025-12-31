// src/libs/audit/audit.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditService } from './audit.service';
import { Audit, AuditSchema } from './audit.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Audit.name, schema: AuditSchema },
    ]),
  ],
  providers: [AuditService],
  exports: [AuditService], // 👈 CLAVE
})
export class AuditModule {}
