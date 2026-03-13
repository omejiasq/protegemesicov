import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type ProveedorDocument = HydratedDocument<Proveedor>;

@Schema({ timestamps: true })
export class Proveedor {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Enterprise',
    required: true,
    index: true,
  })
  company!: Types.ObjectId;

  @Prop({ type: String, required: true })
  nit!: string;

  @Prop({ type: String, required: true })
  razon_social!: string;

  @Prop({ type: String, default: null })
  nombre_mecanico?: string;

  @Prop({ type: Number, default: null })
  tipo_id_mecanico?: number;

  @Prop({ type: String, default: null })
  num_id_mecanico?: string;

  @Prop({ type: Boolean, default: true })
  enabled!: boolean;
}

export const ProveedorSchema = SchemaFactory.createForClass(Proveedor);
