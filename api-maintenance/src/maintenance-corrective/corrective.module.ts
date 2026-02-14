import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CorrectiveController } from './corrective.controller';
import { CorrectiveService } from './corrective.service';
import {
  CorrectiveDetail,
  CorrectiveDetailSchema,
} from '../schema/corrective.schema';
import { MaintenanceExternalApiService } from 'src/libs/external-api';
import { AuditModule } from 'src/libs/audit/audit.module';
import { MaintenanceModule } from 'src/maintenance/maintenance.module';


//import { MongooseModule } from '@nestjs/mongoose';
import {
  CorrectiveVehicleSnapshot,
  CorrectiveVehicleSnapshotSchema,
} from '../schema/corrective_vehicle_snapshot.schema';

import {
  CorrectivePeopleSnapshot,
  CorrectivePeopleSnapshotSchema,
} from '../schema/corrective_people_snapshot.schema';

import {
  CorrectiveItemResult,
  CorrectiveItemResultSchema,
} from '../schema/corrective_item_result.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CorrectiveDetail.name, schema: CorrectiveDetailSchema },
      {
        name: CorrectiveVehicleSnapshot.name,
        schema: CorrectiveVehicleSnapshotSchema,
      },
      {
        name: CorrectivePeopleSnapshot.name,
        schema: CorrectivePeopleSnapshotSchema,
      },
      {
        name: CorrectiveItemResult.name,
        schema: CorrectiveItemResultSchema,
      },
    ]),
    
    AuditModule,
    MaintenanceModule
  ],
  controllers: [CorrectiveController],
  providers: [CorrectiveService, MaintenanceExternalApiService],
  exports: [CorrectiveService, MongooseModule],
})
export class CorrectiveModule {}
