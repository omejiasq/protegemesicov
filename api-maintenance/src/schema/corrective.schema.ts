import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CorrectiveDetailDocument = HydratedDocument<CorrectiveDetail>;

@Schema({ collection: 'corrective_details', timestamps: true })
export class CorrectiveDetail {
  @Prop() externalId?: string;
    @Prop({ type: Object, required: false })
externalData?: Record<string, unknown>;
  @Prop({ required: true }) mantenimientoId!: string;
  @Prop({ required: true, trim: true }) placa!: string;
  @Prop({ required: true, trim: true }) fecha!: string;
  @Prop({ required: true, trim: true }) hora!: string;

  @Prop({ required: true }) nit!: number;
  @Prop({ required: true, trim: true }) razonSocial!: string;
  @Prop({ required: true, trim: true }) descripcionFalla!: string;
  @Prop({ required: true, trim: true }) accionesRealizadas!: string;

  @Prop({ index: true }) enterprise_id?: string;
  @Prop() createdBy?: string;
  @Prop({ default: true, index: true }) estado!: boolean;
}
export const CorrectiveDetailSchema =
  SchemaFactory.createForClass(CorrectiveDetail);
CorrectiveDetailSchema.index(
  { enterprise_id: 1, mantenimientoId: 1 },
  { unique: true },
);
