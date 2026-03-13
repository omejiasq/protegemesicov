// src/schema/sicov-sync-queue.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SicovSyncQueueDocument = HydratedDocument<SicovSyncQueue>;

export type SyncStatus =
  | 'pending'           // Fase 1 (guardarMantenimiento) pendiente
  | 'phase1_complete'   // Mantenimiento creado en SICOV, falta detalle
  | 'synced'            // Todo sincronizado con SICOV
  | 'failed';           // Máximo de intentos alcanzado, requiere intervención

export type SyncRecordType = 'enlistment' | 'preventive' | 'corrective';

@Schema({ collection: 'sicov_sync_queue', timestamps: true })
export class SicovSyncQueue {
  // Tenant
  @Prop({ required: true, index: true })
  enterprise_id!: string;

  // Tipo de registro
  @Prop({ required: true, enum: ['enlistment', 'preventive', 'corrective'] })
  recordType!: SyncRecordType;

  // IDs locales (MongoDB)
  @Prop({ required: true })
  localMaintenanceId!: string;

  @Prop()
  localDetailId?: string;

  // Payload fase 1: guardarMantenimiento
  @Prop({ type: Object, required: true })
  maintenancePayload!: {
    placa: string;
    tipoId: number;
    vigiladoId: string;
    vigiladoToken?: string;
  };

  // Resultado fase 1: SICOV mantenimientoId
  @Prop()
  maintenanceExternalId?: string;

  // Payload fase 2: guardarAlistamiento / guardarPreventivo / guardarCorrectivo
  @Prop({ type: Object })
  detailPayload?: Record<string, any>;

  // Estado
  @Prop({
    enum: ['pending', 'phase1_complete', 'synced', 'failed'],
    default: 'pending',
    index: true,
  })
  status!: SyncStatus;

  @Prop({ default: 0 })
  attempts!: number;

  @Prop({ default: 10 })
  maxAttempts!: number;

  @Prop()
  lastAttemptAt?: Date;

  @Prop()
  lastError?: string;

  @Prop()
  syncedAt?: Date;
}

export const SicovSyncQueueSchema =
  SchemaFactory.createForClass(SicovSyncQueue);

// Índice principal para el cron job
SicovSyncQueueSchema.index({ status: 1, attempts: 1 });
// Consulta por empresa
SicovSyncQueueSchema.index({ enterprise_id: 1, status: 1, createdAt: -1 });
