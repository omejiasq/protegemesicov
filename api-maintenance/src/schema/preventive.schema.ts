import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PreventiveDetailDocument = HydratedDocument<PreventiveDetail>;

@Schema({ collection: 'preventive_details', timestamps: true })
export class PreventiveDetail {
  @Prop() externalId?: string;
  @Prop({ required: true }) mantenimientoId!: string;

  @Prop({ required: true, trim: true }) placa!: string;
  @Prop({ required: true, trim: true }) fecha!: string; 
  @Prop({ required: true, trim: true }) hora!: string;  
  @Prop({ required: true }) nit!: number;
  @Prop({ required: true, trim: true }) razonSocial!: string;

  @Prop({ required: true }) tipoIdentificacion!: number;
  @Prop({ required: true, trim: true }) numeroIdentificacion!: string;
  @Prop({ required: true, trim: true }) nombresResponsable!: string;

  @Prop({ required: true, trim: true }) detalleActividades!: string;

  @Prop({ index: true }) enterprise_id?: string;
  @Prop() createdBy?: string;
  @Prop({ default: true, index: true }) estado!: boolean;
}
export const PreventiveDetailSchema = SchemaFactory.createForClass(PreventiveDetail);
PreventiveDetailSchema.index({ enterprise_id: 1, mantenimientoId: 1 }, { unique: true });