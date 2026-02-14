import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PreventiveController } from './preventive.controller';
import { PreventiveService } from './preventive.service';
import {
  PreventiveDetail,
  PreventiveDetailSchema,
} from '../schema/preventive.schema';
import { MaintenanceExternalApiService } from 'src/libs/external-api';
import { AuditModule } from 'src/libs/audit/audit.module';
import { MaintenanceModule } from 'src/maintenance/maintenance.module';

import {
  PreventiveVehicleSnapshot,
  PreventiveVehicleSnapshotSchema,
} from '../schema/preventive_vehicle_snapshot.schema';

import {
  PreventivePeopleSnapshot,
  PreventivePeopleSnapshotSchema,
} from '../schema/preventive_people_snapshot.schema';

import {
  PreventiveItemResult,
  PreventiveItemResultSchema,
} from '../schema/preventive_item_result.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PreventiveDetail.name, schema: PreventiveDetailSchema },
      {
        name: PreventiveVehicleSnapshot.name,
        schema: PreventiveVehicleSnapshotSchema,
      },
      {
        name: PreventivePeopleSnapshot.name,
        schema: PreventivePeopleSnapshotSchema,
      },
      {
        name: PreventiveItemResult.name,
        schema: PreventiveItemResultSchema,
      },
    ]),
    AuditModule,
    MaintenanceModule
  ],
  controllers: [PreventiveController],
  providers: [PreventiveService, MaintenanceExternalApiService],
  exports: [PreventiveService, MongooseModule],
})
export class PreventiveModule {}
