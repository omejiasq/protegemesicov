import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type FuecDocument = HydratedDocument<Fuec>;

@Schema({ collection: 'fuecs', timestamps: true })
export class Fuec {

  // ── Consecutivo ────────────────────────────────────────────────────
  /** Número de FUEC. Formato: FUEC-{YYYY}-{0001} */
  @Prop({ type: String, required: true, index: true })
  numero_fuec!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  enterprise_id!: Types.ObjectId;

  // ── Datos del contrato ────────────────────────────────────────────
  @Prop({ type: String, required: true, trim: true })
  contratante_nombre!: string;

  @Prop({ type: String, required: true, trim: true })
  contratante_nit!: string;

  @Prop({ type: String, required: true, trim: true })
  descripcion_servicio!: string;

  @Prop({ type: String, required: true, trim: true })
  origen!: string;

  @Prop({ type: String, required: true, trim: true })
  destino!: string;

  @Prop({ type: Date, required: true })
  fecha_servicio!: Date;

  @Prop({ type: String, required: true, trim: true })
  hora_servicio!: string;

  // ── Snapshot del vehículo ─────────────────────────────────────────
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Vehicle', required: true })
  vehicle_id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  placa!: string;

  @Prop({ type: String, default: null }) clase?: string;
  @Prop({ type: String, default: null }) marca?: string;
  @Prop({ type: String, default: null }) modelo?: string;
  @Prop({ type: String, default: null }) color?: string;

  @Prop({ type: String, default: null }) no_tarjeta_opera?: string;
  @Prop({ type: Date, default: null })   expiration_tarjeta_opera?: Date;
  @Prop({ type: String, default: null }) no_soat?: string;
  @Prop({ type: Date, default: null })   expiration_soat?: Date;
  @Prop({ type: String, default: null }) no_rtm?: string;
  @Prop({ type: Date, default: null })   expiration_rtm?: Date;

  // ── Snapshot del conductor ────────────────────────────────────────
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  driver_id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  conductor_nombre!: string;

  @Prop({ type: String, required: true, trim: true })
  conductor_cedula!: string;

  @Prop({ type: String, default: null }) conductor_no_licencia?: string;
  @Prop({ type: String, default: null }) conductor_categoria_licencia?: string;
  @Prop({ type: Date, default: null })   conductor_vencimiento_licencia?: Date;

  // ── Estado ────────────────────────────────────────────────────────
  @Prop({
    type: String,
    enum: ['borrador', 'emitido', 'anulado'],
    default: 'borrador',
  })
  estado!: 'borrador' | 'emitido' | 'anulado';

  @Prop({ type: String, default: null })
  motivo_anulacion?: string;

  @Prop({ type: String, default: null })
  created_by?: string;

  // ── Snapshot de la empresa (para impresión PDF) ───────────────────
  @Prop({
    type: {
      name:            { type: String, default: '' },
      document_number: { type: String, default: '' },
      address:         { type: String, default: '' },
      phone_number:    { type: String, default: '' },
    },
    default: {},
    _id: false,
  })
  enterprise_snapshot?: {
    name: string;
    document_number: string;
    address: string;
    phone_number: string;
  };
}

export const FuecSchema = SchemaFactory.createForClass(Fuec);

FuecSchema.index({ enterprise_id: 1, numero_fuec: 1 }, { unique: true });
FuecSchema.index({ enterprise_id: 1, fecha_servicio: -1 });
FuecSchema.index({ enterprise_id: 1, placa: 1 });
