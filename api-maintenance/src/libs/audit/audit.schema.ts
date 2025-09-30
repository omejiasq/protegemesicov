// src/libs/audit/audit.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, SchemaTypes } from 'mongoose';

export type AuditDocument = HydratedDocument<Audit>;

@Schema({
  timestamps: true,
  collection: 'audits',
})
export class Audit {
  @Prop({ required: true })
  module!: string;

  @Prop({ required: true })
  operation!: string;

  @Prop({ required: true })
  endpoint!: string;

  // 👇 Tipos “libres” deben declararse Mixed
  @Prop({ type: SchemaTypes.Mixed })
  requestPayload?: unknown;

  @Prop({ required: true })
  responseStatus!: number;

  @Prop({ type: SchemaTypes.Mixed })
  responseBody?: unknown;

  @Prop({ required: true, default: false })
  success!: boolean;

  @Prop()
  durationMs?: number;

  @Prop()
  userId?: string;

  @Prop()
  enterpriseId?: string;
}

export const AuditSchema = SchemaFactory.createForClass(Audit);

// (Opcional) Índices útiles
AuditSchema.index({ module: 1, operation: 1, createdAt: -1 });
