import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type VehicleDocument = HydratedDocument<Vehicle>;

@Schema({ timestamps: true })
export class Vehicle {

  // 🔥 CAMBIO CLAVE
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Enterprise',
    index: true,
    required: true,
  })
  enterprise_id!: Types.ObjectId;

  @Prop({ type: Number, required: true })
  nivelServicio!: number;

  @Prop({ type: Boolean, default: false, index: true })
  estado!: boolean;

  // 🔥 CAMBIO CLAVE
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: false,
  })
  driver_id?: Types.ObjectId;

  // =============================
  // DISPOSITIVOS GPS/TRACKING (SIMPLIFICADO)
  // =============================
  @Prop({ type: String, sparse: true, index: true })
  imei?: string; // IMEI del dispositivo GPS/smartphone asignado

  @Prop({ type: String, sparse: true })
  serial?: string; // Serial del dispositivo (si aplica)

  @Prop({ type: String, default: 'vehiculo', enum: ['vehiculo', 'alcoholimetro_moto', 'alcoholimetro_carro', 'smartphone', 'dispositivo_distracciones', 'gps_tradicional', 'otro'] })
  device_type?: string; // Tipo de dispositivo de seguimiento

  // =============================
  // AUDITORÍA
  // =============================
  @Prop({ type: String })
  createdBy?: string;

  @Prop({ type: String })
  updatedBy?: string;

  // ===== campos vehiculo eestandar =====
  @Prop({ type: String, index: true, required: true })
  placa!: string;
  @Prop({ type: String })
  clase?: string;

  @Prop({ type: String, default: null }) marca?: string;
  @Prop({ type: String, default: null }) Linea?: string;
  @Prop({ type: String, default: null }) servicio?: string;
  @Prop({ type: Number, default: null }) kilometraje?: number | null;
  @Prop({ type: String, default: null }) modelo?: string;
  @Prop({ type: String, default: null }) combustible?: string;
  @Prop({ type: String, default: null }) color?: string;
  @Prop({ type: Number, default: null }) cilindraje?: number | null;

  @Prop({ type: String, default: null }) no_rtm?: string;
  @Prop({ type: Date, default: null })
  expedition_rtm?: Date;
  @Prop({ type: Date, default: null })
  expiration_rtm?: Date;
  @Prop({ type: String, default: null }) no_soat?: string;
  @Prop({ type: Date, default: null })
  expedition_soat?: Date;
  @Prop({ type: Date, default: null })
  expiration_soat?: Date;
  @Prop({ type: String, default: null }) no_rcc?: string;
  @Prop({ type: Date, default: null })
  expiration_rcc?: Date; 
  @Prop({ type: String, default: null }) no_rce?: string;
  @Prop({ type: Date, default: null })
  expiration_rce?: Date; 
  @Prop({ type: String, default: null }) no_tecnomecanica?: string; //el 15 de abril 2026 se cambio para guardar aca No carta ténica
  @Prop({ type: Date, default: null })
  expiration_tecnomecanica?: Date;   //el 15 de abril 2026 se cambio para guardar aca vencimiento carta ténica
  @Prop({ type: String, default: null }) no_tarjeta_opera?: string;
  @Prop({ type: Date, default: null })
  expiration_tarjeta_opera?: Date; 

  @Prop({ type: String, default: null }) nombre_aseguradora?: string;
  @Prop({ type: String, default: null }) tipo_vehiculo?: string;
  @Prop({ type: String, default: null }) modalidad?: string;
  @Prop({ type: String, default: null }) no_interno?: string;
  @Prop({ type: String, default: null }) motor?: string;
  @Prop({ type: String, default: null }) to?: string;
  @Prop({ type: String, default: null }) vencim?: string;
  @Prop({ type: String, default: null }) no_chasis?: string;
  @Prop({ type: String, default: null }) tipo?: string;
  @Prop({ type: String, default: null }) capacidad?: string
  @Prop({ type: String, default: null }) nombre_propietario?: string;
  @Prop({ type: String, default: null }) cedula_propietario?: string;
  @Prop({ type: String, default: null }) telefono_propietario?: string;
  @Prop({ type: String, default: null }) direccion_propietario?: string;
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: false,
  })
  driver2_id?: Types.ObjectId;
  @Prop({ type: Boolean, default: false }) active!: boolean;

  @Prop({
    type: Number,
    enum: [1,2,3,4,5,6,7,8,9],
    default: 1,
  })
  document_type_driver2?: number;
  
  @Prop({ type: String, default: null })
  documentNumber_driver2?: string;
  
  @Prop({ type: String, default: null })
  name_driver2?: string;

  @Prop({
    type: Date,
    default: null, // null hasta que el superadmin active el vehículo
  })
  fecha_activacion?: Date | null;

  @Prop({ type: Date, default: null })
  fecha_ultima_desactivacion?: Date | null;

  @Prop({ type: String, default: null })
  nota_desactivacion?: string | null;

  /** Fecha en que la empresa solicitó la desactivación (aún activo, pendiente de aprobación superadmin) */
  @Prop({ type: Date, default: null })
  fecha_solicitud_desactivacion?: Date | null;

  /** Estado de la solicitud de desactivación: null = sin solicitud, 'pendiente' = esperando superadmin, 'aprobada' = desactivado */
  @Prop({ type: String, enum: ['pendiente', 'aprobada', null], default: null })
  deactivation_estado?: 'pendiente' | 'aprobada' | null;

  // ── Solicitud de activación ────────────────────────────────────────────
  @Prop({ type: String, default: null })
  nota_activacion?: string | null;

  @Prop({ type: Date, default: null })
  fecha_solicitud_activacion?: Date | null;

  /** Estado de la solicitud de activación: null = sin solicitud, 'pendiente' = esperando superadmin */
  @Prop({ type: String, enum: ['pendiente', null], default: null })
  activation_estado?: 'pendiente' | null;

  // ── Tipo de servicio del vehículo ──────────────────────────────────
  /**
   * CARRETERA: vehículo de transporte intermunicipal, reporta a SICOV.
   * ESPECIAL:  vehículo de transporte especial, NO reporta a SICOV.
   * Para empresas MIXTO cada vehículo define su propio tipo.
   */
  @Prop({
    type: String,
    enum: ['CARRETERA', 'ESPECIAL'],
    default: 'CARRETERA',
  })
  tipo_servicio!: 'CARRETERA' | 'ESPECIAL';

  // ── Control SICOV ──────────────────────────────────────────────────
  /** Superadmin puede desactivar el envío a Supertransporte */
  @Prop({ type: Boolean, default: true })
  sicov_sync_enabled!: boolean;

  /** Referencia al contrato de habilitación */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'VehicleContract',
    default: null,
  })
  contrato_id?: Types.ObjectId | null;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);

// índice compuesto correcto
VehicleSchema.index({ enterprise_id: 1, placa: 1 }, { unique: true });
