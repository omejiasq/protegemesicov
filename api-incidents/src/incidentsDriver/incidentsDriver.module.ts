import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IncidentDriver, IncidentDriverSchema } from '../schema/incidentsDriver.schema';
import { IncidentsDriverController } from './incidentsDriver.controller';
import { IncidentsDriverService } from './incidentsDriver.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: IncidentDriver.name, schema: IncidentDriverSchema }]),
  ],
  controllers: [IncidentsDriverController],
  providers: [IncidentsDriverService],
  exports: [IncidentsDriverService],
})
export class IncidentsDriverModule {}