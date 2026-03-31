/**
 * Referencia mínima a la colección 'vehicles' (gestionada por api-vehicle).
 * Solo se usa para lectura (verificar estado activo/síncronización SICOV).
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type VehicleRefDocument = HydratedDocument<VehicleRef>;

@Schema({ collection: 'vehicles', timestamps: false })
export class VehicleRef {
  @Prop({ type: String })
  placa: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  enterprise_id: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  active: boolean;

  @Prop({ type: Boolean, default: true })
  sicov_sync_enabled: boolean;

  @Prop({ type: String, enum: ['CARRETERA', 'ESPECIAL'], default: 'CARRETERA' })
  tipo_servicio: 'CARRETERA' | 'ESPECIAL';
}

export const VehicleRefSchema = SchemaFactory.createForClass(VehicleRef);
