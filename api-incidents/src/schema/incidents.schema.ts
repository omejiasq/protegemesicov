import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type IncidentDocument = HydratedDocument<Incident>;

@Schema({
  collection: 'incidents',
  timestamps: true,
})
export class Incident {
  @Prop({ required: true })
  idDespacho!: number;

  @Prop({ required: true, enum: [1, 2] })
  tipoNovedadId!: 1 | 2;

  @Prop({ required: true, maxlength: 500, trim: true })
  descripcion!: string;

  @Prop({ maxlength: 500, trim: true })
  otros?: string;

  @Prop({ type: Boolean, default: true, index: true })
  estado!: boolean;

  @Prop({ type: String, index: true })
  enterprise_id?: string;

  @Prop({ type: String })
  createdBy?: string;

  @Prop({ type: Number, index: true })
  externalId?: number;
}

export const IncidentSchema = SchemaFactory.createForClass(Incident);

IncidentSchema.index({ idDespacho: 1, createdAt: -1 });
IncidentSchema.index({ descripcion: 'text', otros: 'text' });