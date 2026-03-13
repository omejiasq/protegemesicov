// enlistment_item_result.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { TipoVehiculoTipoInspeccion } from '../schema/tipos-vehiculos-tipos-inspecciones.schema';

export type EnlistmentItemResultDocument =
  HydratedDocument<EnlistmentItemResult>;

@Schema({ collection: 'enlistment_item_results', timestamps: true })
export class EnlistmentItemResult {
  @Prop({ required: true, index: true })
  mantenimientoId!: string;

  @Prop({
    type: Types.ObjectId,
    ref: TipoVehiculoTipoInspeccion.name, // ✅ igual que correctivo/preventivo
    required: true,
    index: true,
  })
  itemId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  estado!: string;

  @Prop({ trim: true })
  observacion?: string;
}

export const EnlistmentItemResultSchema =
  SchemaFactory.createForClass(EnlistmentItemResult);
