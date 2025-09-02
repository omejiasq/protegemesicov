import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { Vehicle, VehicleSchema } from '../schema/vehicle.schema';
import { VehiclesService } from './vehicle.service';
import { VehiclesController } from './vehicle.controller';

import { JwtStrategy } from '../libs/auth/jwt.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Vehicle.name, schema: VehicleSchema }]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService, JwtStrategy],
  exports: [VehiclesService],
})
export class VehiclesModule {}