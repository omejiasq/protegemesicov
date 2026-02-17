// src/schema/preventive_vehicle_snapshot.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PreventiveVehicleSnapshotDocument =
  HydratedDocument<PreventiveVehicleSnapshot>;

@Schema({
  collection: 'preventive_vehicle_snapshots',
  timestamps: true,
})
export class PreventiveVehicleSnapshot {
  @Prop({ required: true, index: true })
  mantenimientoId!: string;

  @Prop({ index: true })
  placa!: string;

  // =============================
  // Datos generales
  // =============================
  @Prop() clase!: string;
  @Prop() marca!: string;
  @Prop() linea!: string;
  @Prop() servicio!: string;
  @Prop() kilometraje!: number;
  @Prop() modelo!: number;
  @Prop() combustible!: string;
  @Prop() color!: string;
  @Prop() cilindraje!: string;

  // =============================
  // RTM
  // =============================
  @Prop() no_rtm!: string;
  @Prop() expedition_rtm!: string;
  @Prop() expiration_rtm!: string;

  // =============================
  // SOAT
  // =============================
  @Prop() no_soat!: string;
  @Prop() expedition_soat!: string;
  @Prop() expiration_soat!: string;

  // =============================
  // RCC / RCE
  // =============================
  @Prop() no_rcc!: string;
  @Prop() expiration_rcc!: string;
  @Prop() no_rce!: string;
  @Prop() expiration_rce!: string;

  // =============================
  // Tecnomecánica
  // =============================
  @Prop() no_tecnomecanica!: string;
  @Prop() expiration_tecnomecanica!: string;

  // =============================
  // Tarjeta operación
  // =============================
  @Prop() no_tarjeta_opera!: string;
  @Prop() expiration_tarjeta_opera!: string;

  // =============================
  // Otros datos
  // =============================
  @Prop() nombre_aseguradora!: string;
  @Prop() tipo_vehiculo!: string;
  @Prop() modalidad!: string;
  @Prop() no_interno!: string;
  @Prop() motor!: string;
  @Prop() to!: string;
  @Prop() vencim!: string;
  @Prop() no_chasis!: string;
  @Prop() tipo!: string;
  @Prop() capacidad!: string;

  // =============================
  // Propietario
  // =============================
  @Prop() nombre_propietario!: string;
  @Prop() cedula_propietario!: string;
  @Prop() telefono_propietario!: string;
  @Prop() direccion_propietario!: string;
}

export const PreventiveVehicleSnapshotSchema =
  SchemaFactory.createForClass(PreventiveVehicleSnapshot);
