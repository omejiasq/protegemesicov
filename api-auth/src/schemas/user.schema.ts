import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserInfo, UserInfoSchema } from './user-info.schema';
import { Role, RoleSchema } from './role.schema';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: UserInfoSchema, required: true })
  usuario: UserInfo;

  @Prop()
  password: string;

  @Prop()
  token: string;

  @Prop({ type: RoleSchema })
  rol: Role;

  @Prop({ required: false })
  enterprise_id: string;

  @Prop({ type: Number, default: null })
  vigiladoId?: number | null;

  // Nuevo: token o string asociado al vigilado (puede ser JWT u otro token)
  @Prop({ type: String, default: null })
  vigiladoToken?: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
