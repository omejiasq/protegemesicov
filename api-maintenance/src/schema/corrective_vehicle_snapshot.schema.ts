// src/schema/corrective_vehicle_snapshot.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CorrectiveVehicleSnapshotDocument =
  HydratedDocument<CorrectiveVehicleSnapshot>;

@Schema({
  collection: 'corrective_vehicle_snapshots',
  timestamps: true,
})
export class CorrectiveVehicleSnapshot {
  @Prop({ required: true, index: true })
  mantenimientoId!: string;

  @Prop() clase!: string;
  @Prop() marca!: string;
  @Prop() linea!: string;
  @Prop() servicio!: string;
  @Prop() kilometraje!: number;
  @Prop() modelo!: number;
  @Prop() combustible!: string;
  @Prop() color!: string;
  @Prop() cilindrada!: string;

  @Prop() rtmNumero!: string;
  @Prop() rtmExpedicion!: string;
  @Prop() rtmVencimiento!: string;

  @Prop() soatNumero!: string;
  @Prop() soatExpedicion!: string;
  @Prop() soatVencimiento!: string;
  @Prop() aseguradora!: string;

  @Prop() propietarioNombre!: string;
  @Prop() propietarioCedula!: string;
  @Prop() propietarioTelefono!: string;
  @Prop() propietarioDireccion!: string;
}

export const CorrectiveVehicleSnapshotSchema =
  SchemaFactory.createForClass(CorrectiveVehicleSnapshot);
