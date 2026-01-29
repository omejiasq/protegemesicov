import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TipoVehiculoTipoInspeccion,
  TipoVehiculoTipoInspeccionSchema,
} from '../schema/tipos-vehiculos-tipos-inspecciones.schema';
import { InspectionTypesService } from './inspection-types.service';
import { InspectionTypesController } from './inspection-types.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: TipoVehiculoTipoInspeccion.name,
        schema: TipoVehiculoTipoInspeccionSchema,
      },
    ]),
  ],
  controllers: [InspectionTypesController],
  providers: [InspectionTypesService],
})
export class InspectionTypesModule {}
