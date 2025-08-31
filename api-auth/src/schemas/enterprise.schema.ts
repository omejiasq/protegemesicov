import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EnterpriseDocument = Enterprise & Document;

@Schema({ timestamps: true })
export class Enterprise {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;
}

export const EnterpriseSchema = SchemaFactory.createForClass(Enterprise);