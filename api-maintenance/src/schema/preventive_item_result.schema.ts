import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PreventiveItemResultDocument =
  HydratedDocument<PreventiveItemResult>;

@Schema({ collection: 'preventive_item_results', timestamps: true })
export class PreventiveItemResult {
  @Prop({ required: true }) preventiveId!: string;

  @Prop({ required: true }) itemId!: string;

  @Prop() tipoFalla!: 'A' | 'B' | 'OK';
  @Prop() observacion!: string;
  @Prop() planAccion!: string;
  @Prop() responsable!: string;
}

export const PreventiveItemResultSchema =
  SchemaFactory.createForClass(PreventiveItemResult);
