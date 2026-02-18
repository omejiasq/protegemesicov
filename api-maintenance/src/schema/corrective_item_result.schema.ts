// src/schema/corrective_item_result.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import {
  TipoVehiculoTipoMantenimiento,
} from '../schema/tipos-vehiculos-tipos-mantenimientos.schema';

export type CorrectiveItemResultDocument =
  HydratedDocument<CorrectiveItemResult>;

@Schema({
  collection: 'corrective_item_results',
  timestamps: true,
})
export class CorrectiveItemResult {
  @Prop({ required: true, index: true })
  mantenimientoId!: string;

  @Prop({
    type: Types.ObjectId,
    ref: TipoVehiculoTipoMantenimiento.name,
    required: true,
  })
  itemId!: Types.ObjectId;

  @Prop({ enum: ['A', 'B', 'OK'], required: true })
  tipoFalla!: 'A' | 'B' | 'OK';

  @Prop() observacion!: string;
  @Prop() planAccion!: string;
  @Prop() responsable!: string;
}

export const CorrectiveItemResultSchema =
  SchemaFactory.createForClass(CorrectiveItemResult);
