// src/terminales/schema/terminal-salida.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TerminalSalidaDocument = HydratedDocument<TerminalSalida>;

@Schema({ collection: 'terminal_salidas', timestamps: true })
export class TerminalSalida {
  // ── Datos del despacho (API Supertransporte) ─────────────────────────
  @Prop({ required: true, trim: true })
  idDespachoTerminal!: string;

  @Prop({ required: true, trim: true })
  terminalDespacho!: string;

  @Prop({ required: true, trim: true })
  nitEmpresaTransporte!: string;

  @Prop({ trim: true })
  razonSocial?: string;

  @Prop({ type: Number })
  numeroPasajero?: number;

  @Prop({ type: Number })
  valorTiquete?: number;

  @Prop({ type: Number })
  valorTotalTasaUso?: number;

  @Prop({ type: Number })
  valorPruebaAlcoholimetria?: number;

  @Prop({ trim: true })
  observaciones?: string;

  // ── Trazabilidad interna ─────────────────────────────────────────────
  @Prop({ required: true, index: true })
  enterprise_id!: string;

  @Prop()
  createdBy?: string;

  @Prop({ default: true, index: true })
  estado!: boolean;

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
}

export const TerminalSalidaSchema = SchemaFactory.createForClass(TerminalSalida);
TerminalSalidaSchema.index({ enterprise_id: 1, createdAt: -1 });
TerminalSalidaSchema.index({ enterprise_id: 1, sync_status: 1 });
