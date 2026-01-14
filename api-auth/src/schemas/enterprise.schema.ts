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

  // ───────────── Estado ─────────────
  @Prop({ default: true })
  active: boolean;
}

export const EnterpriseSchema = SchemaFactory.createForClass(Enterprise);