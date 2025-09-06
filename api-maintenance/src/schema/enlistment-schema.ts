import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EnlistmentDetailDocument = HydratedDocument<EnlistmentDetail>;

@Schema({ collection: 'enlistments', timestamps: true })
export class EnlistmentDetail {
  @Prop() externalId?: string;
  @Prop({ required: true, index: true })
  mantenimientoId!: string;

  @Prop({ required: true, trim: true, index: true })
  placa!: string;

  @Prop({ required: true, trim: true })
  fecha!: string; 

  @Prop({ required: true, trim: true })
  hora!: string; 

  @Prop({ required: true }) tipoIdentificacion!: number;
  @Prop({ required: true, trim: true }) numeroIdentificacion!: string;
  @Prop({ required: true, trim: true }) nombresResponsable!: string;

  @Prop({ trim: true }) detalleActividades?: string;

  @Prop({ index: true }) enterprise_id?: string;
  @Prop() createdBy?: string;

  @Prop({ default: true, index: true }) estado!: boolean;
}
export const EnlistmentDetailSchema = SchemaFactory.createForClass(EnlistmentDetail);

EnlistmentDetailSchema.index({ enterprise_id: 1, mantenimientoId: 1 }, { unique: true });