// src/terminales/schema/terminal-llegada.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TerminalLlegadaDocument = HydratedDocument<TerminalLlegada>;

// ── Sub-documento: datos del vehículo en llegada ─────────────────────────────
@Schema({ _id: false })
export class LlegadaVehiculo {
  @Prop({ trim: true }) placa?: string;
  @Prop({ trim: true }) soat?: string;
  @Prop({ trim: true }) fechavencimientoSoat?: string;
  @Prop({ trim: true }) revisiontecnicomecanica?: string;
  @Prop({ trim: true }) fecharevisiontecnicomecanica?: string;
  @Prop({ type: Number }) idpolizas?: number;
  @Prop({ trim: true }) tipopoliza?: string;
  @Prop({ trim: true }) vigencia?: string;
  @Prop({ trim: true }) tarjetaoperacion?: string;
  @Prop({ trim: true }) fechatarjetaoperacion?: string;
  @Prop({ type: Number }) idmatenimiento?: number;
  @Prop({ trim: true }) fechamantenimiento?: string;
  @Prop({ type: Number }) idprotocoloalistamientodiario?: number;
  @Prop({ trim: true }) fechaprotocoloalistamientodiario?: string;
  @Prop({ trim: true }) observaciones?: string;
  @Prop({ trim: true }) clase?: string;
  @Prop({ trim: true }) nivelservicio?: string;
}
export const LlegadaVehiculoSchema = SchemaFactory.createForClass(LlegadaVehiculo);

// ── Sub-documento: datos del conductor en llegada ────────────────────────────
@Schema({ _id: false })
export class LlegadaConductor {
  @Prop({ type: Number }) tipoidentificacionconductor?: number;
  @Prop({ trim: true }) numeroidentificacion?: string;
  @Prop({ trim: true }) primernombreconductor?: string;
  @Prop({ trim: true }) segundonombreconductor?: string;
  @Prop({ trim: true }) primerapellidoconductor?: string;
  @Prop({ trim: true }) segundoapellidoconductor?: string;
  @Prop({ type: Number }) idpruebaalcoholimetria?: number;
  @Prop({ trim: true }) resultadopruebaalcoholimetria?: string;
  @Prop({ trim: true }) fechaUltimapruebaalcoholimetria?: string;
  @Prop({ trim: true }) licenciaconduccion?: string;
  @Prop({ type: Number }) idexamenmedico?: number;
  @Prop({ trim: true }) fechaultimoexamenMedico?: string;
  @Prop({ trim: true }) observaciones?: string;
}
export const LlegadaConductorSchema = SchemaFactory.createForClass(LlegadaConductor);

// ── Documento principal ───────────────────────────────────────────────────────
@Schema({ collection: 'terminal_llegadas', timestamps: true })
export class TerminalLlegada {
  // Datos llegada (API /llegada)
  @Prop({ required: true, type: Number })
  tipollegada_id!: number;

  @Prop({ required: true, type: Number })
  despacho_id!: number;

  @Prop({ required: true, trim: true })
  terminalllegada!: string;

  @Prop({ type: Number })
  numero_pasajero?: number;

  @Prop({ trim: true })
  horallegada?: string;

  @Prop({ trim: true })
  fechallegada?: string;

  // Sub-documentos embebidos (se guardan localmente y se envían como 3 POST a Supertransporte)
  @Prop({ type: LlegadaVehiculoSchema })
  vehiculo?: LlegadaVehiculo;

  @Prop({ type: LlegadaConductorSchema })
  conductor?: LlegadaConductor;

  // ── Trazabilidad interna ──────────────────────────────────────────────
  @Prop({ required: true, index: true })
  enterprise_id!: string;

  @Prop()
  createdBy?: string;

  @Prop({ default: true, index: true })
  estado!: boolean;

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
