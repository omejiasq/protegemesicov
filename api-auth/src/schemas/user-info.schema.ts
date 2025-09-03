import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserInfoDocument = UserInfo & Document;

@Schema()
export class UserInfo {

  @Prop({ required: true })
  usuario: string;

  @Prop()
  nombre: string;

  @Prop()
  apellido: string;

  @Prop()
  telefono: string;

  @Prop()
  correo: string;
}

export const UserInfoSchema = SchemaFactory.createForClass(UserInfo);