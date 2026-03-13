/**
 * Schema mínimo para escritura en la colección 'vehicles' desde api-maintenance.
 * Solo se usa en el módulo de ingesta externa (API Key).
 * La gestión completa de vehículos vive en api-vehicle.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ExternalVehicleDocument = HydratedDocument<ExternalVehicle>;

@Schema({ collection: 'vehicles', timestamps: true })
export class ExternalVehicle {
  @Prop({ type: Types.ObjectId }) enterprise_id: Types.ObjectId;

  @Prop({ type: String }) placa: string;
  @Prop({ type: String }) clase: string;
  @Prop({ type: String }) marca: string;
  @Prop({ type: String }) Linea: string;
  @Prop({ type: String }) modelo: string;
  @Prop({ type: String }) color: string;
  @Prop({ type: String }) combustible: string;
  @Prop({ type: Number }) cilindraje: number;
  @Prop({ type: Number }) nivelServicio: number;
  @Prop({ type: String }) servicio: string;
  @Prop({ type: String }) tipo_vehiculo: string;
  @Prop({ type: String }) modalidad: string;
  @Prop({ type: String }) no_interno: string;
  @Prop({ type: String }) motor: string;
  @Prop({ type: String }) no_chasis: string;
  @Prop({ type: Number }) capacidad: number;
  @Prop({ type: String }) tipo: string;
  @Prop({ type: String }) kilometraje: string;

  // Documentos
  @Prop({ type: String }) no_soat: string;
  @Prop({ type: Date })   expedition_soat: Date;
  @Prop({ type: Date })   expiration_soat: Date;
  @Prop({ type: String }) no_rtm: string;
  @Prop({ type: Date })   expedition_rtm: Date;
  @Prop({ type: Date })   expiration_rtm: Date;
  @Prop({ type: String }) no_tecnomecanica: string;
  @Prop({ type: Date })   expiration_tecnomecanica: Date;
  @Prop({ type: String }) no_tarjeta_opera: string;
  @Prop({ type: Date })   expiration_tarjeta_opera: Date;

  // Propietario
  @Prop({ type: String }) nombre_propietario: string;
  @Prop({ type: String }) cedula_propietario: string;
  @Prop({ type: String }) telefono_propietario: string;
  @Prop({ type: String }) direccion_propietario: string;

  @Prop({ type: Boolean, default: false }) active: boolean;
  @Prop({ type: Boolean, default: true })  sicov_sync_enabled: boolean;
  @Prop({ type: String }) createdBy: string;
  @Prop({ type: String }) source: string;
}

export const ExternalVehicleSchema = SchemaFactory.createForClass(ExternalVehicle);
ExternalVehicleSchema.index({ placa: 1, enterprise_id: 1 }, { unique: true });
