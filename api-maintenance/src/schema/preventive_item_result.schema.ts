import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import {
  TipoVehiculoTipoMantenimiento,
} from '../schema/tipos-vehiculos-tipos-mantenimientos.schema';

export type PreventiveItemResultDocument =
  HydratedDocument<PreventiveItemResult>;

@Schema({ collection: 'preventive_item_results', timestamps: true })
export class PreventiveItemResult {
  @Prop({ required: true, index: true })
  mantenimientoId!: string;

  @Prop({
    type: Types.ObjectId,
    ref: TipoVehiculoTipoMantenimiento.name, // ✅ igual que el correctivo
    required: true,
    index: true,
  })
  itemId!: Types.ObjectId;

  @Prop({ enum: ['A', 'B', 'OK'], required: true })
  tipoFalla!: 'A' | 'B' | 'OK';

  @Prop() observacion!: string;
  @Prop() planAccion!: string;
  @Prop() responsable!: string;
}

export const PreventiveItemResultSchema =
  SchemaFactory.createForClass(PreventiveItemResult);