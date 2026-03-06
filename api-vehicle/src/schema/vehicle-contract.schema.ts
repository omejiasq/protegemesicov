import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type VehicleContractDocument = HydratedDocument<VehicleContract>;

@Schema({ timestamps: true })
export class VehicleContract {
  /** Empresa a la que pertenece el contrato */
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  enterprise_id: Types.ObjectId;

  /** Vehículos incluidos en este contrato */
  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] })
  vehicle_ids: Types.ObjectId[];

  /** Placas (snapshot legible) */
  @Prop({ type: [String], default: [] })
  placas: string[];

  /** Número de contrato auto-generado: HAB-{YYYY}-{seq} */
  @Prop({ type: String, index: true })
  numero_contrato: string;

  /** Fecha de inicio de habilitación elegida por el superadmin */
  @Prop({ type: Date, required: true })
  fecha_activacion: Date;

  /** ID del superadmin que activó */
  @Prop({ type: String })
  activated_by_id: string;

  /** Nombre del superadmin que activó */
  @Prop({ type: String })
  activated_by_name: string;

  /** Notas del contrato */
  @Prop({ type: String, default: null })
  notas?: string | null;
}

export const VehicleContractSchema = SchemaFactory.createForClass(VehicleContract);

VehicleContractSchema.index({ enterprise_id: 1, fecha_activacion: -1 });
