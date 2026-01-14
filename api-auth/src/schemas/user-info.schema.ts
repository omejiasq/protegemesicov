// src/schemas/user-info.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class UserInfo {
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  usuario: string;

  @Prop()
  email?: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop()
  phone?: string;

  @Prop({
    type: Number,
    enum: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    default: 1,
  })
  document_type?: number;

  @Prop()
  documentNumber?: string;
}

export const UserInfoSchema = SchemaFactory.createForClass(UserInfo);
