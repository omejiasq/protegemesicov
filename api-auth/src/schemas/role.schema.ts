import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Module, ModuleSchema } from './module.schema';

export type RoleDocument = Role & Document;

@Schema()
export class Role {

  @Prop({ required: true })
  nombre: string;

  @Prop({ type: [ModuleSchema], default: [] })
  modulos: Module[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);