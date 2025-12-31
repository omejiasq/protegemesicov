// src/vehicles/vehicles.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

// 👇 AQUÍ VA ESTE IMPORT
import { Vehicle, VehicleSchema } from '../schema/vehicle.schema';

import { AuditModule } from '../libs/audit/audit.module';
import { VehicleExternalApiService } from '../libs/exteral-api';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vehicle.name, schema: VehicleSchema },
    ]),
    AuditModule, // 👈 IMPORTANTE
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehicleExternalApiService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
