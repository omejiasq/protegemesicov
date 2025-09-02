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

  @Prop({ type: String }) createdBy?: string;
}

const VehicleSchema = SchemaFactory.createForClass(Vehicle);
VehicleSchema.index({ enterprise_id: 1, placa: 1 }, { unique: true });

export { VehicleSchema };