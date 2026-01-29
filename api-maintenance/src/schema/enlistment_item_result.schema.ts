// enlistment_item_result.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EnlistmentItemResultDocument =
  HydratedDocument<EnlistmentItemResult>;

@Schema({ collection: 'enlistment_item_results', timestamps: true })
export class EnlistmentItemResult {
  @Prop({ required: true, index: true })
  mantenimientoId!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'TiposVehiculosTiposInspecciones',
    required: true,
  })
  itemId!: Types.ObjectId;

  @Prop({ required: true, enum: ['OK', 'NC', 'NA'] })
  estado!: 'OK' | 'NC' | 'NA';

  @Prop({ trim: true })
  observacion?: string;
}

export const EnlistmentItemResultSchema =
  SchemaFactory.createForClass(EnlistmentItemResult);
