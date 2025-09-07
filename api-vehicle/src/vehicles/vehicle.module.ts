import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { Vehicle, VehicleSchema } from '../schema/vehicle.schema';
import { VehiclesService } from './vehicle.service';
import { VehiclesController } from './vehicle.controller';
import { JwtStrategy } from '../libs/auth/jwt.strategy';

import { VehicleExternalApiService } from '../libs/exteral-api';
import { AuditModule } from '../libs/audit/audit.module'; // ⬅️ agregado

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Vehicle.name, schema: VehicleSchema }]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({ secret: process.env.JWT_SECRET }),
    AuditModule, // ⬅️ indispensable para inyectar AuditService
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService, JwtStrategy, VehicleExternalApiService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
