import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TipoVehiculoTipoMantenimiento,
  TipoVehiculoTipoMantenimientoSchema,
} from '../schema/tipos-vehiculos-tipos-mantenimientos.schema';
import { MaintenanceTypesService } from './maintenance-types.service';
import { MaintenanceTypesController } from './maintenance-types.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: TipoVehiculoTipoMantenimiento.name,
        schema: TipoVehiculoTipoMantenimientoSchema,
      },
    ]),
  ],
  controllers: [MaintenanceTypesController],
  providers: [MaintenanceTypesService],
})
export class MaintenanceTypesModule {}
