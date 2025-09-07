import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnlistmentDetail, EnlistmentDetailSchema } from '../schema/enlistment-schema';
import { Maintenance, MaintenanceSchema } from '../schema/maintenance.schema';
import { AlistamientoService } from './enlistment.service';
import { EnlistmentController } from './enlistment.controller';
import { MaintenanceExternalApiService } from 'src/libs/external-api';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EnlistmentDetail.name, schema: EnlistmentDetailSchema },
      { name: Maintenance.name, schema: MaintenanceSchema },
    ]),
  ],
  controllers: [EnlistmentController],
  providers: [AlistamientoService, MaintenanceExternalApiService],
  exports: [AlistamientoService],
})
export class EnlistmentModule {}