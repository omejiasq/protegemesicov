import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

import { Vehicle, VehicleSchema } from '../schema/vehicle.schema';
import { VehicleContract, VehicleContractSchema } from '../schema/vehicle-contract.schema';
import { UserRef, UserRefSchema } from '../schema/user-ref.schema';
import { Audit, AuditSchema } from '../libs/audit/audit.schema';

import { AuditModule } from '../libs/audit/audit.module';
import { VehicleExternalApiService } from '../libs/exteral-api';
import { EmailService } from '../libs/email/email.service';
import { SuperadminGuard } from '../common/guards/superadmin.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vehicle.name, schema: VehicleSchema },
      { name: VehicleContract.name, schema: VehicleContractSchema },
      { name: UserRef.name, schema: UserRefSchema },
      { name: Audit.name, schema: AuditSchema },
    ]),
    AuditModule,
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehicleExternalApiService, EmailService, SuperadminGuard],
  exports: [VehiclesService],
})
export class VehiclesModule {}
