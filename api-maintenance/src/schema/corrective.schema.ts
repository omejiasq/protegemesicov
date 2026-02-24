import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CorrectiveDetailDocument =
  HydratedDocument<CorrectiveDetail>;

@Schema({
  collection: 'corrective_details',
  timestamps: true,
})
export class CorrectiveDetail {
  @Prop()
  externalId?: string;

  @Prop({ type: Object })
  externalData?: Record<string, unknown>;

  @Prop({ required: true })
  mantenimientoId!: string;

  @Prop({ required: true, trim: true })
  placa!: string;

  // 👇 vienen del frontend como string
  @Prop({ required: true, trim: true })
  fecha!: string; // "2025-09-02"

  @Prop({ required: true, trim: true })
  hora!: string; // "09:30"

  @Prop({ required: true })
  nit!: number;

  @Prop({ required: true, trim: true })
  razonSocial!: string;

  @Prop({ required: true, trim: true })
  tipoIdentificacion!: string;

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

  // 🔥 FECHA REAL DEL EVENTO (derivada, NO required)
  @Prop({ type: Date, index: true })
  occurredAt?: Date;

  @Prop({ type: String, default: null })
  evidencia_foto?: string;
}

export const CorrectiveDetailSchema =
  SchemaFactory.createForClass(CorrectiveDetail);

//
// 🔥 INDEXES
//
CorrectiveDetailSchema.index(
  { enterprise_id: 1, mantenimientoId: 1 },
  { unique: true },
);

CorrectiveDetailSchema.index({
  enterprise_id: 1,
  occurredAt: -1,
});

//
// 🔥 AUTO-CONSTRUCCIÓN SEGURA DE occurredAt
//
CorrectiveDetailSchema.pre<CorrectiveDetailDocument>(
  'save',
  function (next) {

    // 🟢 CASO 1: hora ya viene como fecha-hora completa
    if (this.hora) {
      const dateFromHora = new Date(this.hora);

      if (!isNaN(dateFromHora.getTime())) {
        this.occurredAt = dateFromHora;
        return next();
      }
    }

    // 🟡 CASO 2: fallback antiguo (fecha + hora separados)
    if (this.fecha && this.hora) {
      const fechaParts = this.fecha.split('-').map(Number);
      const horaParts = this.hora.split(':').map(Number);

      if (
        fechaParts.length === 3 &&
        horaParts.length >= 2 &&
        !fechaParts.some(isNaN) &&
        !horaParts.slice(0, 2).some(isNaN)
      ) {
        const [y, m, d] = fechaParts;
        const [hh, mm] = horaParts;

        const occurred = new Date(y, m - 1, d, hh, mm, 0);

        if (!isNaN(occurred.getTime())) {
          this.occurredAt = occurred;
        }
      }
    }

    next();
  },
);

