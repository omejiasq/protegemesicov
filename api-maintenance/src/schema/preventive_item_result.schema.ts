import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PreventiveItemResultDocument =
  HydratedDocument<PreventiveItemResult>;

@Schema({ collection: 'preventive_item_results', timestamps: true })
export class PreventiveItemResult {
  @Prop({ required: true, index: true })
  mantenimientoId!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'tipos_vehiculos_tipos_mantenimientos',
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
