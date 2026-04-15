// src/terminales/schema/terminal-novedad.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TerminalNovedadDocument = HydratedDocument<TerminalNovedad>;

// ── Sub-documento: datos del vehículo en novedad ─────────────────────────────
@Schema({ _id: false })
export class NovedadVehiculo {
  @Prop({ trim: true }) placa?: string;
  @Prop({ trim: true }) soat?: string;
  @Prop({ trim: true }) fechaVencimientoSoat?: string;
  @Prop({ trim: true }) revisionTecnicoMecanica?: string;
  @Prop({ trim: true }) fechaRevisionTecnicoMecanica?: string;
  @Prop({ type: Number }) idPolizas?: number;
  @Prop({ trim: true }) tipoPoliza?: string;
  @Prop({ trim: true }) vigencia?: string;
  @Prop({ trim: true }) tarjetaOperacion?: string;
  @Prop({ trim: true }) fechaTarjetaOperacion?: string;
  @Prop({ type: Number }) idMantenimiento?: number;
  @Prop({ trim: true }) fechaMantenimiento?: string;
  @Prop({ type: Number }) idProtocoloAlistamientoDiario?: number;
  @Prop({ trim: true }) fechaProtocoloAlistamientoDiario?: string;
  @Prop({ trim: true }) observaciones?: string;
  @Prop({ trim: true }) clase?: string;
  @Prop({ trim: true }) nivelServicio?: string;
  @Prop({ trim: true }) estado?: string;
}
export const NovedadVehiculoSchema = SchemaFactory.createForClass(NovedadVehiculo);

// ── Sub-documento: datos del conductor en novedad ────────────────────────────
@Schema({ _id: false })
export class NovedadConductor {
  @Prop({ type: Number }) tipoIdentificacionConductor?: number;
  @Prop({ trim: true }) numeroIdentificacion?: string;
  @Prop({ trim: true }) primerNombreConductor?: string;
  @Prop({ trim: true }) segundoNombreConductor?: string;
  @Prop({ trim: true }) primerApellidoConductor?: string;
  @Prop({ trim: true }) segundoApellidoConductor?: string;
  @Prop({ type: Number }) idPruebaAlcoholimetria?: number;
  @Prop({ trim: true }) resultadoPruebaAlcoholimetria?: string;
  @Prop({ trim: true }) fechaUltimaPruebaAlcoholimetria?: string;
  @Prop({ trim: true }) licenciaConduccion?: string;
  @Prop({ type: Number }) idExamenMedico?: number;
  @Prop({ trim: true }) fechaUltimoExamenMedico?: string;
  @Prop({ trim: true }) observaciones?: string;
}
export const NovedadConductorSchema = SchemaFactory.createForClass(NovedadConductor);

// ── Documento principal ───────────────────────────────────────────────────────
@Schema({ collection: 'terminal_novedades', timestamps: true })
export class TerminalNovedad {
  // Datos novedad (API /novedades)
  @Prop({ required: true, type: Number })
  id_despacho!: number;

  @Prop({ required: true, type: Number })
  tipo_novedad_id!: number;

  @Prop({ trim: true })
  descripcion?: string;

  @Prop({ trim: true })
  otros?: string;

  // Sub-documentos embebidos (se envían como 3 POST a Supertransporte)
  @Prop({ type: NovedadVehiculoSchema })
  vehiculo?: NovedadVehiculo;

  @Prop({ type: NovedadConductorSchema })
  conductor?: NovedadConductor;

  // ── Trazabilidad interna ──────────────────────────────────────────────
  @Prop({ required: true, index: true })
  enterprise_id!: string;

  @Prop()
  createdBy?: string;

  @Prop({ default: true, index: true })
  estado!: boolean;

  // ── IDs externos (3 entidades Supertransporte) ────────────────────────
  @Prop({ type: Number, default: null })
  externalNovedadId?: number | null;

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

export const TerminalNovedadSchema = SchemaFactory.createForClass(TerminalNovedad);
TerminalNovedadSchema.index({ enterprise_id: 1, createdAt: -1 });
TerminalNovedadSchema.index({ enterprise_id: 1, id_despacho: 1 });
TerminalNovedadSchema.index({ enterprise_id: 1, sync_status: 1 });
