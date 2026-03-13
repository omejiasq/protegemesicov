import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PreventiveDetailDocument =
  HydratedDocument<PreventiveDetail>;

@Schema({ collection: 'preventive_details', timestamps: true })
export class PreventiveDetail {
  @Prop() externalId?: string;

  @Prop({ type: Object })
  externalData?: Record<string, unknown>;

  @Prop({ required: true })
  mantenimientoId!: string;

  @Prop({ required: true, trim: true })
  placa!: string;

  @Prop({ required: true })
  nit!: number;

  @Prop({ required: true, trim: true })
  razonSocial!: string;

  @Prop({ required: true })
  tipoIdentificacion!: number;

  @Prop({ required: true, trim: true })
  numeroIdentificacion!: string;

  @Prop({ required: true, trim: true })
  nombresResponsable!: string;

  @Prop({ required: true, trim: true })
  detalleActividades!: string;

  @Prop({ index: true })
  enterprise_id?: string;

  @Prop()
  createdBy?: string;

  @Prop({ default: true, index: true })
  estado!: boolean;

  // Legacy / frontend
  @Prop({ required: true, trim: true })
  fecha!: string;

  @Prop({ required: true, trim: true })
  hora!: string;

  // Fechas operativas
  @Prop({ type: Date, index: true })
  scheduledAt!: Date;   // Planeada

  @Prop({ type: Date, index: true })
  executedAt?: Date;    // Ejecutada (REAL)

  @Prop({ type: Date, index: true })
  dueDate!: Date;       // Vencimiento

  @Prop({ type: String, default: null })
  evidencia_foto?: string;

  @Prop({
    enum: ['pending', 'synced', 'failed', 'demo'],
    default: 'synced',
    index: true,
  })
  sicov_sync_status!: 'pending' | 'synced' | 'failed' | 'demo';

  @Prop({ enum: ['frontend', 'external_api'], default: 'frontend' })
  source?: 'frontend' | 'external_api';

  /** Fecha/hora en que fue enviado y aceptado por SICOV. Null si pendiente. */
  @Prop({ type: Date, default: null, index: true })
  fechaSyncSicov?: Date;
}

export const PreventiveDetailSchema =
  SchemaFactory.createForClass(PreventiveDetail);

PreventiveDetailSchema.index(
  { enterprise_id: 1, mantenimientoId: 1 },
  { unique: true },
);

// Búsquedas por placa dentro de una empresa (listados y updateMany en create)
PreventiveDetailSchema.index({ enterprise_id: 1, placa: 1, estado: 1 });
// Listado general por empresa ordenado por fecha
PreventiveDetailSchema.index({ enterprise_id: 1, createdAt: -1 });

//
// 🔥 AUTO-CONSTRUCCIÓN ROBUSTA
//
PreventiveDetailSchema.pre('save', function (next) {
  if (!this.fecha || !this.hora) {
    return next();
  }

  try {
    let scheduled: Date;

    // --------------------------------------------
    // Caso 1: hora viene como ISO (app web)
    // --------------------------------------------
    if (this.hora.includes('T')) {
      scheduled = new Date(this.hora);
    } 
    // --------------------------------------------
    // Caso 2: hora viene como "HH:mm" (curl)
    // --------------------------------------------
    else {
      const fechaBase = new Date(this.fecha);

      const [hours, minutes] = this.hora.split(':').map(Number);

      if (isNaN(hours) || isNaN(minutes)) {
        return next();
      }

      scheduled = new Date(
        fechaBase.getFullYear(),
        fechaBase.getMonth(),
        fechaBase.getDate(),
        hours,
        minutes,
        0,
        0,
      );
    }

    // Validar fecha válida
    if (isNaN(scheduled.getTime())) {
      return next();
    }

    // 🔹 Planeada
    this.scheduledAt = scheduled;

    // 🔹 Ejecutada (si no existe)
    if (!this.executedAt) {
      this.executedAt = scheduled;
    }

    // 🔹 Vencimiento (+2 meses)
    const due = new Date(scheduled);
    due.setMonth(due.getMonth() + 2);
    this.dueDate = due;

  } catch (err) {
    console.error('Error construyendo fechas preventivo:', err);
  }

  next();
});


