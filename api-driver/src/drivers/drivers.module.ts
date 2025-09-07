import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { Driver, DriverSchema } from '../schema/drivers.schema';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { JwtStrategy } from '../libs/auth/jwt.strategy';
import { ExternalApiService } from '../libs/external-api';
import { AuditModule } from '../libs/audit/audit.module'; // ⬅️ nuevo import

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Driver.name, schema: DriverSchema }]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({ secret: process.env.JWT_SECRET }),
    AuditModule, // ⬅️ indispensable para inyectar AuditService en external
  ],
  controllers: [DriversController],
  providers: [DriversService, JwtStrategy, ExternalApiService],
  exports: [DriversService, ExternalApiService],
})
export class DriversModule {}
