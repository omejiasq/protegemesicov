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
}

export const PreventiveDetailSchema =
  SchemaFactory.createForClass(PreventiveDetail);

PreventiveDetailSchema.index(
  { enterprise_id: 1, mantenimientoId: 1 },
  { unique: true },
);

//
// 🔥 AUTO-CONSTRUCCIÓN ROBUSTA
//
PreventiveDetailSchema.pre('save', function (next) {

  if (this.fecha && this.hora) {

    // Convertimos ambos a Date reales
    const fechaDate = new Date(this.fecha);
    const horaDate = new Date(this.hora);

    // Extraemos partes
    const year = fechaDate.getFullYear();
    const month = fechaDate.getMonth();
    const day = fechaDate.getDate();

    const hours = horaDate.getHours();
    const minutes = horaDate.getMinutes();

    // Unimos correctamente fecha + hora
    const scheduled = new Date(
      year,
      month,
      day,
      hours,
      minutes,
      0,
      0
    );

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
  }

  next();
});


