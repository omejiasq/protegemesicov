// src/sicov-sync/sicov-sync.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  SicovSyncQueue,
  SicovSyncQueueSchema,
} from '../schema/sicov-sync-queue.schema';
import { Maintenance, MaintenanceSchema } from '../schema/maintenance.schema';
import {
  EnlistmentDetail,
  EnlistmentDetailSchema,
} from '../schema/enlistment-schema';
import {
  PreventiveDetail,
  PreventiveDetailSchema,
} from '../schema/preventive.schema';
import {
  CorrectiveDetail,
  CorrectiveDetailSchema,
} from '../schema/corrective.schema';

import { AuditModule } from '../libs/audit/audit.module';
import { MaintenanceExternalApiService } from '../libs/external-api';

import { SicovSyncService } from './sicov-sync.service';
import { SicovSyncController } from './sicov-sync.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SicovSyncQueue.name, schema: SicovSyncQueueSchema },
      { name: Maintenance.name, schema: MaintenanceSchema },
      { name: EnlistmentDetail.name, schema: EnlistmentDetailSchema },
      { name: PreventiveDetail.name, schema: PreventiveDetailSchema },
      { name: CorrectiveDetail.name, schema: CorrectiveDetailSchema },
    ]),
    AuditModule,
  ],
  controllers: [SicovSyncController],
  providers: [SicovSyncService, MaintenanceExternalApiService],
  exports: [SicovSyncService],
})
export class SicovSyncModule {}
