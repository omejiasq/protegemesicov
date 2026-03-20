import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EnlistmentDetailDocument = HydratedDocument<EnlistmentDetail>;

@Schema({ collection: 'enlistments', timestamps: true })
export class EnlistmentDetail {
  @Prop() externalId?: string;
  @Prop({ type: Object, required: false })
  externalData?: Record<string, unknown>;
  @Prop({ required: true, index: true })
  mantenimientoId!: string;

  @Prop({ required: true, trim: true, index: true })
  placa!: string;

  @Prop({ required: true }) tipoIdentificacion!: number;
  @Prop({ required: true, trim: true }) numeroIdentificacion!: string;
  @Prop({ required: true, trim: true }) nombresResponsable!: string;

  @Prop({ required: true, trim: true }) tipoIdentificacionConductor!: string;
  @Prop({ required: true, trim: true }) numeroIdentificacionConductor!: string;
  @Prop({ required: true, trim: true }) nombresConductor!: string;

  @Prop({ trim: true }) detalleActividades?: string;

  @Prop({ index: true }) enterprise_id?: string;
  @Prop() createdBy?: string;

  @Prop({ default: true, index: true }) estado!: boolean;
  @Prop({ type: [String], default: [] })
  actividades?: string[];

  @Prop({ type: String, default: null })
  firma_conductor_foto?: string;

  @Prop({ type: String, default: null })
  firma_inspector_foto?: string;

  /**
   * Estado de sincronización con SICOV.
   * - pending:  guardado localmente, SICOV no disponible al momento de crear
   * - synced:   enviado correctamente a SICOV
   * - failed:   superó el máximo de reintentos, requiere intervención manual
   * - demo:     modo demo, no se envía a SICOV
   * - expired:  no fue sincronizado el día de creación; ya no se enviará a SICOV
   */
  @Prop({
    enum: ['pending', 'synced', 'failed', 'demo', 'expired'],
    default: 'synced',
    index: true,
  })
  sicov_sync_status!: 'pending' | 'synced' | 'failed' | 'demo' | 'expired';

  /**
   * Origen del registro.
   * - frontend: creado desde la app web / móvil
   * - external_api: cargado desde un sistema externo vía API Key
   */
  @Prop({ enum: ['frontend', 'external_api'], default: 'frontend' })
  source?: 'frontend' | 'external_api';

  /**
   * Fecha/hora en que el alistamiento fue efectivamente enviado y aceptado
   * por la Supertransporte (SICOV). Es null/undefined si aún no se ha sincronizado.
   *
   * Puede ser diferente de createdAt si SICOV estaba caído al momento de crear
   * el alistamiento y se sincronizó al día siguiente por el cron de reintentos.
   */
  @Prop({ type: Date, default: null, index: true })
  fechaSyncSicov?: Date;
}
export const EnlistmentDetailSchema =
  SchemaFactory.createForClass(EnlistmentDetail);

EnlistmentDetailSchema.index(
  { enterprise_id: 1, mantenimientoId: 1 },
  { unique: true },
);

// Búsquedas por placa dentro de una empresa
EnlistmentDetailSchema.index({ enterprise_id: 1, placa: 1 });
// Listado por empresa ordenado por fecha
EnlistmentDetailSchema.index({ enterprise_id: 1, createdAt: -1 });
