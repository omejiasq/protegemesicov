// src/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {

  // =============================
  // DATOS DE LOGIN (LEGACY)
  // =============================
  @Prop({
    type: {
      usuario: { type: String, required: true, unique: true },
      nombre: { type: String },
      apellido: { type: String },
      telefono: { type: String },
      correo: { type: String },
      document_type: {
        type: Number,
        enum: [1,2,3,4,5,6,7,8,9],
        default: 1,
      },
      documentNumber: { type: String },
    },
    required: true,
  })
  usuario: {
    usuario: string;
    nombre?: string;
    apellido?: string;
    telefono?: string;
    correo?: string;
    document_type?: number;
    documentNumber?: string;
  };

  // =============================
  // SEGURIDAD
  // =============================
  @Prop({ type: String, required: true })
  password: string;

  // =============================
  // ROL
  // =============================
  @Prop({
    type: String,
    enum: ['superadmin','admin','driver','operator','viewer'],
    default: 'admin',
  })
  roleType: string;

  // =============================
  // RELACIÓN ENTERPRISE
  // =============================
  @Prop({
    type: Types.ObjectId,
    ref: 'Enterprise',
    required: false,
  })
  enterprise_id?: Types.ObjectId;

  // =============================
  // EXTRAS
  // =============================
  @Prop({ type: String, default: null })
  token?: string | null;

  @Prop({ type: Number, default: null })
  vigiladoId?: number | null;

  @Prop({ type: String, default: null })
  vigiladoToken?: string | null;

  @Prop({ default: true })
  active: boolean;



}

export const UserSchema = SchemaFactory.createForClass(User);
