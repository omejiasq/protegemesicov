// src/terminales/schema/terminal-llegada.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TerminalLlegadaDocument = HydratedDocument<TerminalLlegada>;

// ── Documento principal ───────────────────────────────────────────────────────
@Schema({ collection: 'terminal_llegadas', timestamps: true })
export class TerminalLlegada {
  // ── Referencia a la salida ───────────────────────────────────────────────
  @Prop({ type: Types.ObjectId, required: true, ref: 'TerminalSalida', index: true })
  salidaId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 6, index: true })
  placa!: string;

  // ── Datos de llegada ─────────────────────────────────────────────────────
  @Prop({ type: Number, required: true, min: 0 })
  numeroPasajeros!: number;

  @Prop({ required: true, type: Date })
  fechaLlegada!: Date;

  @Prop({ required: true, trim: true })
  horaLlegada!: string; // Formato HH:mm

  @Prop({ trim: true })
  observaciones?: string;

  // ── Estado del despacho ──────────────────────────────────────────────────
  @Prop({
    enum: ['completado', 'cerrado'],
    default: 'completado',
    index: true
  })
  estado!: 'completado' | 'cerrado';

  // ── Datos para API Supertransporte (legacy) ─────────────────────────────
  @Prop({ type: Number })
  tipollegada_id?: number;

  @Prop({ type: Number })
  despacho_id?: number;

  @Prop({ trim: true })
  terminalllegada?: string;

  // ── Sub-documento: datos del vehículo en llegada (legacy) ────────────────
  @Prop({ type: Object })
  vehiculo?: {
    placa?: string;
    soat?: string;
    fechavencimientoSoat?: string;
    revisiontecnicomecanica?: string;
    fecharevisiontecnicomecanica?: string;
    idpolizas?: number;
    tipopoliza?: string;
    vigencia?: string;
    tarjetaoperacion?: string;
    fechatarjetaoperacion?: string;
    idmatenimiento?: number;
    fechamantenimiento?: string;
    idprotocoloalistamientodiario?: number;
    fechaprotocoloalistamientodiario?: string;
    observaciones?: string;
    clase?: string;
    nivelservicio?: string;
  };

  // ── Sub-documento: datos del conductor en llegada (legacy) ───────────────
  @Prop({ type: Object })
  conductor?: {
    tipoidentificacionconductor?: number;
    numeroidentificacion?: string;
    primernombreconductor?: string;
    segundonombreconductor?: string;
    primerapellidoconductor?: string;
    segundoapellidoconductor?: string;
    idpruebaalcoholimetria?: number;
    resultadopruebaalcoholimetria?: string;
    fechaUltimapruebaalcoholimetria?: string;
    licenciaconduccion?: string;
    idexamenmedico?: number;
    fechaultimoexamenMedico?: string;
    observaciones?: string;
  };

  // ── Trazabilidad interna ──────────────────────────────────────────────
  @Prop({ required: true, index: true })
  enterprise_id!: string;

  @Prop()
  createdBy?: string;

  @Prop({ default: true, index: true })
  activo!: boolean;

  // ── Sincronización: IDs externos de las 3 entidades Supertransporte ──
  @Prop({ type: Number, default: null })
  externalLlegadaId?: number | null;

  @Prop({ type: Number, default: null })
  externalVehiculoId?: number | null;

  @Prop({ type: Number, default: null })
  externalConductorId?: number | null;

  @Prop({
    enum: ['pending', 'synced', 'partial', 'failed'],
    default: 'pending',
    index: true,
  })
  sync_status!: 'pending' | 'synced' | 'partial' | 'failed';

  @Prop({ type: Date, default: null })
  fechaSync?: Date | null;

  @Prop({ trim: true })
  syncError?: string;
}

export const TerminalLlegadaSchema = SchemaFactory.createForClass(TerminalLlegada);
TerminalLlegadaSchema.index({ enterprise_id: 1, createdAt: -1 });
TerminalLlegadaSchema.index({ enterprise_id: 1, sync_status: 1 });
