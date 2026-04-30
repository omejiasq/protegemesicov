// src/terminales/schema/terminal-config.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TerminalConfigDocument = HydratedDocument<TerminalConfig>;

@Schema({ collection: 'terminal_configs', timestamps: true })
export class TerminalConfig {
  // ── Identificación ───────────────────────────────────────────────────────
  @Prop({ required: true, unique: true, index: true })
  enterprise_id!: string;

  // ── Configuración de URLs de Supertransporte ────────────────────────────
  @Prop({
    trim: true,
    default: 'https://rutasback.supertransporte.gov.co/api/v1'
  })
  supertransporteBaseUrl!: string;

  @Prop({
    trim: true,
    default: 'Bearer a6edc4af-4b84-4444-8c98-8afa14437cd1'
  })
  supertransporteAuthToken!: string;

  // ── Endpoints configurables ─────────────────────────────────────────────
  @Prop({
    trim: true,
    default: '/maestras/rutas-activas-empresa'
  })
  endpointRutas!: string;

  @Prop({
    trim: true,
    default: '/despachos/salida'
  })
  endpointCrearSalida!: string;

  @Prop({
    trim: true,
    default: '/despachos/salida'
  })
  endpointListarSalidas!: string;

  @Prop({
    trim: true,
    default: '/despachos/llegada'
  })
  endpointCrearLlegada!: string;

  @Prop({
    trim: true,
    default: '/despachos/llegada'
  })
  endpointListarLlegadas!: string;

  // ── Configuración de sincronización ─────────────────────────────────────
  @Prop({ default: false })
  habilitarSincronizacion!: boolean;

  @Prop({ default: true })
  modoTesting!: boolean;

  // ── Configuración de empresa ────────────────────────────────────────────
  @Prop({ trim: true })
  nitEmpresa?: string;

  @Prop({ trim: true })
  razonSocial?: string;

  // ── Metadatos ────────────────────────────────────────────────────────────
  @Prop()
  createdBy?: string;

  @Prop()
  updatedBy?: string;

  @Prop({ default: true })
  activo!: boolean;
}

export const TerminalConfigSchema = SchemaFactory.createForClass(TerminalConfig);
TerminalConfigSchema.index({ enterprise_id: 1 });