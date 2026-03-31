import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EnlistmentDetail,
  EnlistmentDetailSchema,
} from '../schema/enlistment-schema';

import {
  EnlistmentDailySnapshot,
  EnlistmentDailySnapshotSchema,
} from '../schema/enlistment_daily_snapshot.schema';

import {
  EnlistmentItemResult,
  EnlistmentItemResultSchema,
} from '../schema/enlistment_item_result.schema';

import { Maintenance, MaintenanceSchema } from '../schema/maintenance.schema';
import { AlistamientoService } from './enlistment.service';
import { EnlistmentController } from './enlistment.controller';
import { MaintenanceExternalApiService } from 'src/libs/external-api';
import { AuditModule } from 'src/libs/audit/audit.module';
import { MaintenanceModule } from 'src/maintenance/maintenance.module';
import { SicovSyncModule } from '../sicov-sync/sicov-sync.module';

import {
  TipoVehiculoTipoInspeccion,
  TipoVehiculoTipoInspeccionSchema,
} from '../schema/tipos-vehiculos-tipos-inspecciones.schema';

import { VehicleRef, VehicleRefSchema } from '../schema/vehicle-ref.schema';
import {
  ItemResponseType,
  ItemResponseTypeSchema,
} from '../schema/item-response-type.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EnlistmentDetail.name, schema: EnlistmentDetailSchema },
      { name: Maintenance.name, schema: MaintenanceSchema },

      { name: EnlistmentDailySnapshot.name, schema: EnlistmentDailySnapshotSchema },
      { name: EnlistmentItemResult.name, schema: EnlistmentItemResultSchema },

      {
        name: TipoVehiculoTipoInspeccion.name,
        schema: TipoVehiculoTipoInspeccionSchema,
      },
      { name: VehicleRef.name, schema: VehicleRefSchema },
      { name: ItemResponseType.name, schema: ItemResponseTypeSchema },
    ]),
    AuditModule,
    MaintenanceModule,
    SicovSyncModule,
  ],
  controllers: [EnlistmentController],
  providers: [AlistamientoService, MaintenanceExternalApiService],
  // 👇 ESTA LÍNEA ES LA CLAVE
  exports: [MongooseModule, AlistamientoService],
})
export class EnlistmentModule {}
