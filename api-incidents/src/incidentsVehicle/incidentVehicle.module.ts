import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IncidentVehicle, IncidentVehicleSchema } from '../schema/incidentsVehicle.schema';
import { IncidentsVehicleController } from './incidentVehicle.controller';
import { IncidentsVehicleService } from './incidentVehicle.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: IncidentVehicle.name, schema: IncidentVehicleSchema },
    ]),
  ],
  controllers: [IncidentsVehicleController],
  providers: [IncidentsVehicleService],
  exports: [IncidentsVehicleService],
})
export class IncidentsVehicleModule {}