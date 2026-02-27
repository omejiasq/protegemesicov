import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EnterpriseDocument = Enterprise & Document;

@Schema({ timestamps: true })
export class Enterprise {
  // ───────────── Datos básicos ─────────────
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  logo?: string;

  // ───────────── Configuración de formatos ─────────────
  @Prop({ trim: true })
  formato_type?: string; // Ej: A4, Carta

  @Prop({ trim: true })
  format_enlistment_consecutive?: string; // EL-{YYYY}-{0001}

  @Prop({ trim: true })
  format_enlistment_maintenance?: string; // EM-{YYYY}-{0001}

  // ───────────── Información legal ─────────────
  @Prop({ required: true, trim: true })
  document_number: string; // NIT, CC, etc

  @Prop({ required: true, trim: true })
  document_type: string; // NIT, CC, CE

  // ───────────── Contacto ─────────────
  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  movil_number?: string;

  @Prop({ trim: true })
  phone_number?: string;

  // ───────────── Vigilancia / Integraciones ─────────────
  @Prop()
  vigiladoId?: number;

  @Prop({ trim: true })
  vigiladoToken?: string;


  @Prop({ trim: true })
  packageType?: string;  //basic, enterprise

  @Prop({ type: Number, enum: [1,2,3,4,5,6,7,8,9], default: 1 })
  mechanic_document_type?: number;

  @Prop({ trim: true })
  mechanic_document_number?: string;

  @Prop({ trim: true })
  mechanic_name?: string;

  // ───────────── Superadmin: administrador de empresas, superadmin ─────────────
  @Prop({ default: false })
  admin: boolean;

  @Prop({ trim: true })
  specialized_center_name?: string;

  @Prop({ type: Number, enum: [12], default: 12 })
  specialized_center_document_type?: number;

  @Prop({ trim: true })
  specialized_center_document_number?: string;

  // ───────────── Formatos PDF ─────────────
  @Prop({ type: Object, default: null })
  formato_correctivo?: Record<string, any>;

  @Prop({ type: Object, default: null })
  formato_preventivo?: Record<string, any>;

  @Prop({ type: Object, default: null })
  formato_alistamiento?: Record<string, any>;

  // ───────────── Control de acceso / Suscripción ─────────────
  @Prop({ default: true })
  active: boolean; // ya lo tiene, solo confirme que está

  // ───────────── Control de acceso ─────────────
  @Prop({ type: Date, default: null })
  activatedAt?: Date;

  @Prop({ type: Date, default: null })
  deactivatedAt?: Date;

  @Prop({ type: String, default: null, trim: true })
  deactivationReason?: string | null;
}

export const EnterpriseSchema = SchemaFactory.createForClass(Enterprise);