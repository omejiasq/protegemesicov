// src/terminales/schema/terminal-salida.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TerminalSalidaDocument = HydratedDocument<TerminalSalida>;

// ── Subesquemas ────────────────────────────────────────────────────────
@Schema({ _id: false })
export class RutaInfo {
  @Prop({ type: Number, required: true })
  idRuta!: number;

  @Prop({ trim: true, required: true })
  codOrigen!: string;

  @Prop({ trim: true, required: true })
  descripcionOrigen!: string;

  @Prop({ trim: true, required: true })
  codDestino!: string;

  @Prop({ trim: true, required: true })
  descripcionDestino!: string;

  @Prop({ trim: true })
  via?: string;
}

@Schema({ collection: 'terminal_salidas', timestamps: true })
export class TerminalSalida {
  // ── Datos del vehículo y conductores ─────────────────────────────────
  @Prop({ required: true, trim: true, maxlength: 6, index: true })
  placa!: string;

  @Prop({ trim: true })
  docConductorPrincipal?: string;

  @Prop({ trim: true })
  docConductorSecundario?: string;

  @Prop({ required: true, trim: true })
  nitEmpresaTransporte!: string;

  // ── Datos del despacho ───────────────────────────────────────────────
  @Prop({ required: true, trim: true })
  numeroUnicoPlanilla!: string;

  @Prop({ trim: true })
  terminal?: string;

  @Prop({ required: true, type: Date })
  fechaSalida!: Date;

  @Prop({ required: true, trim: true })
  horaSalida!: string; // Formato HH:mm

  @Prop({ type: RutaInfo, required: true })
  ruta!: RutaInfo;

  @Prop({ type: Number, required: true, min: 0 })
  numeroPasajeros!: number;

  @Prop({ type: Number, required: true, min: 0 })
  valorTasaUso!: number;

  @Prop({ trim: true })
  observaciones?: string;

  // ── Estado del despacho ──────────────────────────────────────────────
  @Prop({
    enum: ['pendiente', 'en_ruta', 'completado', 'cancelado'],
    default: 'pendiente',
    index: true
  })
  estado!: 'pendiente' | 'en_ruta' | 'completado' | 'cancelado';

  // ── Datos para API Supertransporte (legacy) ─────────────────────────
  @Prop({ trim: true })
  idDespachoTerminal?: string;

  @Prop({ trim: true })
  terminalDespacho?: string;

  @Prop({ trim: true })
  razonSocial?: string;

  @Prop({ type: Number })
  valorTiquete?: number;

  @Prop({ type: Number })
  valorPruebaAlcoholimetria?: number;

  // ── Trazabilidad interna ─────────────────────────────────────────────
  @Prop({ required: true, index: true })
  enterprise_id!: string;

  @Prop()
  createdBy?: string;

  @Prop({ default: true, index: true })
  activo!: boolean;

  // ── Sincronización con Supertransporte ───────────────────────────────
  @Prop({ type: Number, default: null })
  externalId?: number | null;

  @Prop({
    enum: ['pending', 'synced', 'failed'],
    default: 'pending',
    index: true,
  })
  sync_status!: 'pending' | 'synced' | 'failed';

  @Prop({ type: Date, default: null })
  fechaSync?: Date | null;

  @Prop({ trim: true })
  syncError?: string;

  // ── Datos de consulta SICOV Integradora ──────────────────────────────────
  @Prop({ type: Object, default: null })
  sicovIntegradoData?: any;
}

export const TerminalSalidaSchema = SchemaFactory.createForClass(TerminalSalida);
TerminalSalidaSchema.index({ enterprise_id: 1, createdAt: -1 });
TerminalSalidaSchema.index({ enterprise_id: 1, sync_status: 1 });
