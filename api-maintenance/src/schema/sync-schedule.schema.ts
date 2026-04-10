import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SyncScheduleDocument = SyncSchedule & Document;

@Schema({ collection: 'sync_schedules', timestamps: true })
export class SyncSchedule {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  enterprise_id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  /** vehicles | drivers | both */
  @Prop({ required: true, enum: ['vehicles', 'drivers', 'both'] })
  entityType: string;

  /** URL del endpoint externo que devuelve los datos */
  @Prop({ required: true })
  sourceUrl: string;

  /** none | bearer | api_key | basic */
  @Prop({ default: 'none', enum: ['none', 'bearer', 'api_key', 'basic'] })
  authType: string;

  /** Valor del token/apikey (se almacena cifrado en producción) */
  @Prop({ default: '' })
  authValue: string;

  /** Nombre del header si authType = api_key (p.ej. 'X-Api-Key') */
  @Prop({ default: 'X-Api-Key' })
  authHeader: string;

  /** Expresión cron: '0 * * * *' = cada hora, '0 6 * * *' = diario 6am */
  @Prop({ required: true })
  cronExpression: string;

  /** Descripción legible del cron, generada automáticamente */
  @Prop({ default: '' })
  cronLabel: string;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ type: Date })
  lastRunAt?: Date;

  /** success | error | running */
  @Prop({ default: '' })
  lastRunStatus: string;

  @Prop({ default: '' })
  lastRunSummary: string;

  /** Fecha de la próxima ejecución programada (calculada al guardar) */
  @Prop({ type: Date })
  nextRunAt?: Date;

  @Prop({ default: 0 })
  totalRuns: number;

  @Prop({ default: 0 })
  successRuns: number;
}

export const SyncScheduleSchema = SchemaFactory.createForClass(SyncSchedule);
