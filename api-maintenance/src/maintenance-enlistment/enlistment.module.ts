import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnlistmentDetail, EnlistmentDetailSchema } from '../schema/enlistment-schema';
import { Maintenance, MaintenanceSchema } from '../schema/maintenance.schema';
import { EnlistmentService } from './enlistment.service';
import { EnlistmentController } from './enlistment.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EnlistmentDetail.name, schema: EnlistmentDetailSchema },
      { name: Maintenance.name, schema: MaintenanceSchema },
    ]),
  ],
  controllers: [EnlistmentController],
  providers: [EnlistmentService],
  exports: [EnlistmentService],
})
export class EnlistmentModule {}