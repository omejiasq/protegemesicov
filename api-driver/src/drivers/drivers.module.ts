import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { Driver, DriverSchema } from '../schema/drivers.schema';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { JwtStrategy } from '../libs/auth/jwt.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Driver.name, schema: DriverSchema }]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({ secret: process.env.JWT_SECRET }),
  ],
  controllers: [DriversController],
  providers: [DriversService, JwtStrategy],
  exports: [DriversService],
})
export class DriversModule {}
