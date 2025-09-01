import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type IncidentDriverDocument = HydratedDocument<IncidentDriver>;

@Schema({
  collection: 'incident_drivers',
  timestamps: true,
})
export class IncidentDriver {
  @Prop({ type: Types.ObjectId, ref: 'Incident', required: true, index: true })
  incidentId!: Types.ObjectId;

  @Prop({ type: Number, index: true })
  novedadIdExterno?: number;

  @Prop({ required: true, trim: true }) tipoIdentificacionConductor!: string;
  @Prop({ required: true, trim: true, index: true })
  numeroIdentificacion!: string;

  @Prop({ required: true, trim: true }) primerNombreConductor!: string;
  @Prop({ trim: true }) segundoNombreConductor?: string;
  @Prop({ required: true, trim: true }) primerApellidoConductor!: string;
  @Prop({ trim: true }) segundoApellidoConductor?: string;

  @Prop({ required: true, trim: true }) idPruebaAlcoholimetria!: string;
  @Prop({ required: true, trim: true }) resultadoPruebaAlcoholimetria!: string;
  @Prop({ type: Date, required: true }) fechaUltimaPruebaAlcoholimetria!: Date;

  @Prop({ required: true, trim: true }) licenciaConduccion!: string;

  @Prop({ required: true, trim: true }) idExamenMedico!: string;
  @Prop({ type: Date, required: true }) fechaUltimoExamenMedico!: Date;

  @Prop({ trim: true }) observaciones?: string;
  @Prop({ type: String, index: true })
  enterprise_id?: string;

  @Prop({ type: Boolean, default: true, index: true })
  estado!: boolean;
}

export const IncidentDriverSchema =
  SchemaFactory.createForClass(IncidentDriver);

IncidentDriverSchema.index({ createdAt: -1 });

IncidentDriverSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});
