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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CorrectiveDetail.name, schema: CorrectiveDetailSchema },
    ]),
    AuditModule,
    MaintenanceModule
  ],
  controllers: [CorrectiveController],
  providers: [CorrectiveService, MaintenanceExternalApiService],
  exports: [CorrectiveService],
})
export class CorrectiveModule {}
