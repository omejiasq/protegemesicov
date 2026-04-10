// src/external-ingestion/external-ingestion.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ApiKey, ApiKeySchema } from '../schema/api-key.schema';
import { ExternalVehicle, ExternalVehicleSchema } from '../schema/external-vehicle.schema';
import { ExternalDriver, ExternalDriverSchema } from '../schema/external-driver.schema';
import { SyncSchedule, SyncScheduleSchema } from '../schema/sync-schedule.schema';
import { ApiKeyGuard } from './api-key.guard';
import { ExternalIngestionService } from './external-ingestion.service';
import {
  ApiKeyManagementController,
  ImportController,
  SyncScheduleController,
  ExternalIngestionController,
} from './external-ingestion.controller';

import { EnlistmentModule } from '../maintenance-enlistment/enlistment.module';
import { PreventiveModule } from '../maintenance-preventive/preventive.module';
import { CorrectiveModule } from '../maintenance-corrective/corrective.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ApiKey.name,           schema: ApiKeySchema },
      { name: ExternalVehicle.name,  schema: ExternalVehicleSchema },
      { name: ExternalDriver.name,   schema: ExternalDriverSchema },
      { name: SyncSchedule.name,     schema: SyncScheduleSchema },
    ]),
    EnlistmentModule,
    PreventiveModule,
    CorrectiveModule,
  ],
  controllers: [ApiKeyManagementController, ImportController, SyncScheduleController, ExternalIngestionController],
  providers: [ExternalIngestionService, ApiKeyGuard],
})
export class ExternalIngestionModule {}
