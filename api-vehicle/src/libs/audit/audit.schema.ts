import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Audit {
  @Prop() userId?: string;
  @Prop() enterpriseId?: string;

  @Prop({ required: true }) module!: string;     // e.g., 'incidents'
  @Prop({ required: true }) operation!: string;  // e.g., 'crearNovedad'
  @Prop({ required: true }) endpoint!: string;   // URL completa

  @Prop({ type: Object }) requestPayload?: Record<string, any>;
  @Prop({ required: true }) responseStatus!: number;
  @Prop({ type: Object }) responseBody?: any;

  @Prop({ required: true }) success!: boolean;
  @Prop() durationMs?: number;

  @Prop() errorMessage?: string;
}

export type AuditDocument = Audit & Document;
export const AuditSchema = SchemaFactory.createForClass(Audit);

// (Opcional) retención 90 días
// AuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
