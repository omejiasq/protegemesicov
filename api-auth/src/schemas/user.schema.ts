import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

/* ======================================================
   SUBDOCUMENTO: USUARIO (DATOS PERSONALES / LOGIN)
====================================================== */

@Schema({ _id: false }) // 👈 importante: evita _id en subdocumento
export class Usuario {

  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  })
  usuario: string;

  @Prop({
    type: String,
    trim: true,
    set: (value: string) => value?.toUpperCase(),
  })
  nombre?: string;

  @Prop({
    type: String,
    trim: true,
    set: (value: string) => value?.toUpperCase(),
  })
  apellido?: string;

  @Prop({ type: String, trim: true })
  telefono?: string;

  @Prop({
    type: String,
    trim: true,
    lowercase: true,
  })
  correo?: string;

  @Prop({
    type: Number,
    enum: [1,2,3,4,5,6,7,8,9],
    default: 1,
  })
  document_type?: number;

  @Prop({ type: String, trim: true })
  documentNumber?: string;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);


/* ======================================================
   SCHEMA PRINCIPAL: USER
====================================================== */

@Schema({ timestamps: true })
export class User {

  // =============================
  // SUBDOCUMENTO USUARIO
  // =============================
  @Prop({ type: UsuarioSchema, required: true })
  usuario: Usuario;

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
    index: true, // 🔥 importante para performance multiempresa
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

  @Prop({ type: String, default: null }) no_licencia_conduccion?: string;
  @Prop({ type: Date, default: null })
  vencimiento_licencia_conduccion?: Date;

  /** Obliga al usuario a cambiar su contraseña en el próximo inicio de sesión */
  @Prop({ type: Boolean, default: false })
  must_change_password: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);


/* ======================================================
   ÍNDICES IMPORTANTES (MUY RECOMENDADO)
====================================================== */

// Usuario único (login)
UserSchema.index({ 'usuario.usuario': 1 }, { unique: true });

// Búsqueda rápida por enterprise
UserSchema.index({ enterprise_id: 1 });

// Filtro común SaaS
UserSchema.index({ enterprise_id: 1, roleType: 1, active: 1 });

// Correo único (sparse: ignora documentos sin correo)
UserSchema.index({ 'usuario.correo': 1 }, { unique: true, sparse: true });