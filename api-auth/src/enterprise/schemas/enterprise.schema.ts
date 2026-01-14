// -----------------------------
// src/enterprise/schemas/enterprise.schema.ts
// -----------------------------
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EnterpriseDocument = Enterprise & Document;

@Schema({ timestamps: true })
export class Enterprise {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  logo: string;

  @Prop({ default: '' })
  formato_type: string;

  @Prop({ default: '' })
  format_enlistment_consecutive: string;

  @Prop({ default: '' })
  format_enlistment_maintenance: string;

  @Prop({ default: '' })
  address: string;

  @Prop({ default: '' })
  document_number: string;

  @Prop({ default: '' })
  document_type: string;

  @Prop({ default: '' })
  movil_number: string;

  @Prop({ default: '' })
  phone_number: string;

  @Prop({ type: Number, default: null })
  vigiladoId?: number | null;

  @Prop({ type: String, default: null })
  vigiladoToken?: string | null;

  @Prop({ type: Boolean, default: true })
  active!: boolean;

  createdAt?: Date;
  updatedAt?: Date;

  start_date?: Date; //fecha inicio del contrato
  end_date?: Date;  //fecha fin contrato
  @Prop({ type: Number, default: 3 })
  max_users?: number | null; //maximo cantidad de usuarios
  
  @Prop({ type: String, default: 'Basic'}) //Basic, Enterprise, Test
  package_type?: string | null;

}

export const EnterpriseSchema = SchemaFactory.createForClass(Enterprise);

// ÍNDICES
EnterpriseSchema.index({ name: 1 });
EnterpriseSchema.index(
  { document_number: 1 },
  { unique: true, sparse: true },
);
EnterpriseSchema.index({ active: 1 });
EnterpriseSchema.index({ vigiladoId: 1 });
