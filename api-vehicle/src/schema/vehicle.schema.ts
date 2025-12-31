import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type VehicleDocument = HydratedDocument<Vehicle>;

@Schema({ timestamps: true })
export class Vehicle {
  @Prop({ type: String, index: true, required: true })
  enterprise_id!: string;

  @Prop({ type: String, required: true })
  placa!: string;

  @Prop({ type: Number, required: true })
  clase!: number;

  @Prop({ type: Number, required: true })
  nivelServicio!: number;

  @Prop({ type: String }) soat?: string;
  @Prop({ type: Date })  fechaVencimientoSoat?: Date;

  @Prop({ type: String }) revisionTecnicoMecanica?: string;
  @Prop({ type: Date })  fechaRevisionTecnicoMecanica?: Date;

  @Prop({ type: String }) idPolizas?: string;
  @Prop({ type: String }) tipoPoliza?: string;
  @Prop({ type: Date })  vigencia?: Date;

  @Prop({ type: String }) tarjetaOperacion?: string;
  @Prop({ type: Date })  fechaTarjetaOperacion?: Date;

  @Prop({ type: Boolean, default: true, index: true })
  estado!: boolean;

  // 👉 Nuevo campo: referencia al conductor en la colección users
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'users', required: false })
  driver_id?: string;

  @Prop({ type: String }) createdBy?: string;

  @Prop({ type: String, default: null })
  marca?: string;
  @Prop({ type: String, default: null })
  Linea?: string;
  @Prop({ type: String, default: null })
  color?: string;
  @Prop({ type: String, default: null })
  cilindrale?: number | null;
  @Prop({ type: String, default: null })
  combustible?: string; 
  @Prop({ type: String, default: null })
  kilometraje?: number | null;
  @Prop({ type: String, default: null })
  noRtm?: number | null;
  @Prop({ type: String, default: null })
  fechaExpiraRtm?: Date;
  @Prop({ type: String, default: null })
  fechaVenRtm?: Date;
  @Prop({ type: String, default: null })
  noSoat?: number | null;
  @Prop({ type: String, default: null })
  fechaExpiraSoat?: Date;
  @Prop({ type: String, default: null })
  fechaVenSoat?: Date;
  @Prop({ type: String, default: null })
  aseguradora?: string; 
  @Prop({ type: String, default: null })
  propietario?: string;
  @Prop({ type: String, default: null })
  documento?: number | null;
  @Prop({ type: String, default: null })
  telefono?: number | null;
  @Prop({ type: String, default: null })
  direccion?: string;
  active!: boolean;

}

const VehicleSchema = SchemaFactory.createForClass(Vehicle);
VehicleSchema.index({ enterprise_id: 1, placa: 1 }, { unique: true });

export { VehicleSchema };