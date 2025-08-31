import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type IncidentVehicleDocument = HydratedDocument<IncidentVehicle>;

@Schema({
  collection: 'incident_vehicles',
  timestamps: true,
})
export class IncidentVehicle {
  @Prop({ type: Types.ObjectId, ref: 'Incident', required: true, index: true })
  incidentId!: Types.ObjectId;

  @Prop({ type: Number, index: true })
  novedadIdExterno?: number;

  @Prop({ required: true, trim: true }) placa!: string;

  @Prop({ required: true, trim: true }) soat!: string;
  @Prop({ type: Date, required: true }) fechaVencimientoSoat!: Date;

  @Prop({ required: true, trim: true }) revisionTecnicoMecanica!: string;
  @Prop({ type: Date, required: true }) fechaRevisionTecnicoMecanica!: Date;

  @Prop({ required: true, trim: true }) idPolizas!: string;
  @Prop({ trim: true }) tipoPoliza?: string;
  @Prop({ type: Date }) vigencia?: Date;

  @Prop({ required: true, trim: true }) tarjetaOperacion!: string;
  @Prop({ type: Date, required: true }) fechaTarjetaOperacion!: Date;

  @Prop({ required: true, trim: true }) idMantenimiento!: string;
  @Prop({ type: Date, required: true }) fechaMantenimiento!: Date;

  @Prop({ required: true, trim: true }) idProtocoloAlistamientoDiario!: string;
  @Prop({ type: Date, required: true }) fechaProtocoloAlistamientoDiario!: Date;

  @Prop({ trim: true }) observaciones?: string;

  @Prop({ type: Number, required: true, min: 0 }) clase!: number;
  @Prop({ type: Number, required: true, min: 0 }) nivelServicio!: number;

  @Prop({ type: Boolean, default: true, index: true }) estado!: boolean;
  @Prop({ type: String, index: true })
  enterprise_id?: string;
}

export const IncidentVehicleSchema =
  SchemaFactory.createForClass(IncidentVehicle);

IncidentVehicleSchema.index({ placa: 1 });
IncidentVehicleSchema.index({ createdAt: -1 });

IncidentVehicleSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});
