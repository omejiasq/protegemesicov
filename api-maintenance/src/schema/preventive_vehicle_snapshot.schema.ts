import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PreventiveVehicleSnapshotDocument =
  HydratedDocument<PreventiveVehicleSnapshot>;

@Schema({ collection: 'preventive_vehicle_snapshots', timestamps: true })
export class PreventiveVehicleSnapshot {
  @Prop({ required: true }) preventiveId!: string;

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

export const PreventiveVehicleSnapshotSchema =
  SchemaFactory.createForClass(PreventiveVehicleSnapshot);
