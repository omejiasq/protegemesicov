import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EnlistmentDetailDocument = HydratedDocument<EnlistmentDetail>;

@Schema({ collection: 'enlistments', timestamps: true })
export class EnlistmentDetail {
  @Prop() externalId?: string;
  @Prop({ type: Object, required: false })
  externalData?: Record<string, unknown>;
  @Prop({ required: true, index: true })
  mantenimientoId!: string;

  @Prop({ required: true, trim: true, index: true })
  placa!: string;

  @Prop({ required: true }) tipoIdentificacion!: number;
  @Prop({ required: true, trim: true }) numeroIdentificacion!: string;
  @Prop({ required: true, trim: true }) nombresResponsable!: string;

  @Prop({ required: true, trim: true }) tipoIdentificacionConductor!: string;
  @Prop({ required: true, trim: true }) numeroIdentificacionConductor!: string;
  @Prop({ required: true, trim: true }) nombresConductor!: string;

  @Prop({ trim: true }) detalleActividades?: string;

  @Prop({ index: true }) enterprise_id?: string;
  @Prop() createdBy?: string;

  @Prop({ default: true, index: true }) estado!: boolean;
  @Prop({ type: [String], default: [] })
  actividades?: string[];
}
export const EnlistmentDetailSchema =
  SchemaFactory.createForClass(EnlistmentDetail);

EnlistmentDetailSchema.index(
  { enterprise_id: 1, mantenimientoId: 1 },
  { unique: true },
);
