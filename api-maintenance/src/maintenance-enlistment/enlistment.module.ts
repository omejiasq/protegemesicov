import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EnlistmentDetail,
  EnlistmentDetailSchema,
} from '../schema/enlistment-schema';

import {
  EnlistmentDailySnapshot,
  EnlistmentDailySnapshotSchema,
} from '../schema/enlistment_daily_snapshot.schema';

import {
  EnlistmentItemResult,
  EnlistmentItemResultSchema,
} from '../schema/enlistment_item_result.schema';

import { Maintenance, MaintenanceSchema } from '../schema/maintenance.schema';
import { AlistamientoService } from './enlistment.service';
import { EnlistmentController } from './enlistment.controller';
import { MaintenanceExternalApiService } from 'src/libs/external-api';
import { AuditModule } from 'src/libs/audit/audit.module';
import { MaintenanceModule } from 'src/maintenance/maintenance.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EnlistmentDetail.name, schema: EnlistmentDetailSchema },
      { name: Maintenance.name, schema: MaintenanceSchema },

      { name: EnlistmentDailySnapshot.name, schema: EnlistmentDailySnapshotSchema },
      { name: EnlistmentItemResult.name, schema: EnlistmentItemResultSchema },
    ]),
    AuditModule,
    MaintenanceModule
  ],
  controllers: [EnlistmentController],
  providers: [AlistamientoService, MaintenanceExternalApiService],
  exports: [AlistamientoService],
})
export class EnlistmentModule {}
