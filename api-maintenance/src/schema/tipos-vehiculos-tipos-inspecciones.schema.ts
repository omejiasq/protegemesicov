import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TipoVehiculoTipoInspeccionDocument =
  HydratedDocument<TipoVehiculoTipoInspeccion>;

@Schema({
  collection: 'tipos_vehiculos_tipos_inspecciones',
  timestamps: true,
})
export class TipoVehiculoTipoInspeccion {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  company!: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  clase_vehiculo!: string;

  @Prop({ required: true, trim: true })
  dispositivo!: string;

  @Prop({ required: true, trim: true, index: true })
  tipo_parte!: string;

  @Prop({ default: true, index: true })
  enabled!: boolean;

  @Prop({ default: true })
  obligatorio!: boolean;

  @Prop({ required: false, trim: true, index: true })
  nombre_compania!: string;

  @Prop({ required: false, trim: true, index: true })
  codigo_externo!: number;

}

export const TipoVehiculoTipoInspeccionSchema =
  SchemaFactory.createForClass(TipoVehiculoTipoInspeccion);

/**
 * Índice recomendado para evitar duplicados
 * por empresa + clase + dispositivo
 */
TipoVehiculoTipoInspeccionSchema.index(
  { company: 1, clase_vehiculo: 1, dispositivo: 1 },
  { unique: true },
);
