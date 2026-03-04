import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TipoVehiculoTipoMantenimientoDocument =
  HydratedDocument<TipoVehiculoTipoMantenimiento>;

@Schema({
  collection: 'tipos_vehiculos_tipos_mantenimientos',
  timestamps: true,
})
export class TipoVehiculoTipoMantenimiento {
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

  @Prop({ type: Number, default: 0, index: true })
  orden?: number;
}

export const TipoVehiculoTipoMantenimientoSchema =
  SchemaFactory.createForClass(TipoVehiculoTipoMantenimiento);

/**
 * Índice para evitar duplicados funcionales
 */
TipoVehiculoTipoMantenimientoSchema.index(
  { company: 1, clase_vehiculo: 1, dispositivo: 1 },
  { unique: true },
);
