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

  @Prop({ type: Boolean, default: true, index: true })
  estado!: boolean;

  // 🔥 CAMBIO CLAVE
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: false,
  })
  driver_id?: Types.ObjectId;

  @Prop({ type: String })
  createdBy?: string;

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
  @Prop({ type: String, default: null }) no_tecnomecanica?: string;
  @Prop({ type: Date, default: null })
  expiration_tecnomecanica?: Date; 
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
  @Prop({ type: Boolean, default: true }) active!: boolean;



}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);

// índice compuesto correcto
VehicleSchema.index({ enterprise_id: 1, placa: 1 }, { unique: true });
