import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

export type AuditDocument = HydratedDocument<Audit>;

@Schema({ timestamps: true })
export class Audit {

  @Prop()
  module?: string;

  @Prop()
  operation?: string;

  @Prop()
  endpoint?: string;

  @Prop()
  action?: string;

  @Prop()
  entity?: string;

  @Prop()
  entityId?: string;

  @Prop()
  userId?: string;

  @Prop()
  username?: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  requestPayload?: Record<string, any>;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  responsePayload?: Record<string, any>;

  @Prop()
  responseStatus?: number;

  @Prop()
  success?: boolean;

  @Prop()
  errorMessage?: string;

  @Prop()
  durationMs?: number;
}

export const AuditSchema = SchemaFactory.createForClass(Audit);
