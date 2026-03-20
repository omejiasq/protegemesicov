// src/sicov-sync/sicov-sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';

import {
  SicovSyncQueue,
  SicovSyncQueueDocument,
  SyncRecordType,
} from '../schema/sicov-sync-queue.schema';
import {
  Maintenance,
  MaintenanceDocument,
} from '../schema/maintenance.schema';
import {
  EnlistmentDetail,
  EnlistmentDetailDocument,
} from '../schema/enlistment-schema';
import {
  PreventiveDetail,
  PreventiveDetailDocument,
} from '../schema/preventive.schema';
import {
  CorrectiveDetail,
  CorrectiveDetailDocument,
} from '../schema/corrective.schema';
import { MaintenanceExternalApiService } from '../libs/external-api';

export interface EnqueuePayload {
  enterprise_id: string;
  recordType: SyncRecordType;
  localMaintenanceId: string;
  localDetailId?: string;
  maintenancePayload: {
    placa: string;
    tipoId: number;
    vigiladoId: string;
    vigiladoToken?: string;
  };
  /** Se pasa cuando la fase 1 ya se completó (externalId conocido) */
  maintenanceExternalId?: string;
  detailPayload?: Record<string, any>;
}

@Injectable()
export class SicovSyncService {
  private readonly logger = new Logger(SicovSyncService.name);

  constructor(
    @InjectModel(SicovSyncQueue.name)
    private readonly queueModel: Model<SicovSyncQueueDocument>,

    @InjectModel(Maintenance.name)
    private readonly maintenanceModel: Model<MaintenanceDocument>,

    @InjectModel(EnlistmentDetail.name)
    private readonly enlistmentModel: Model<EnlistmentDetailDocument>,

    @InjectModel(PreventiveDetail.name)
    private readonly preventiveModel: Model<PreventiveDetailDocument>,

    @InjectModel(CorrectiveDetail.name)
    private readonly correctiveModel: Model<CorrectiveDetailDocument>,

    private readonly external: MaintenanceExternalApiService,
  ) {}

  // ===========================================================
  // ENCOLAR — llamado por los servicios cuando SICOV está caído
  // ===========================================================
  async enqueue(payload: EnqueuePayload): Promise<SicovSyncQueueDocument> {
    const status = payload.maintenanceExternalId
      ? 'phase1_complete'
      : 'pending';

    const item = await this.queueModel.create({
      enterprise_id: payload.enterprise_id,
      recordType: payload.recordType,
      localMaintenanceId: payload.localMaintenanceId,
      localDetailId: payload.localDetailId,
      maintenancePayload: payload.maintenancePayload,
      maintenanceExternalId: payload.maintenanceExternalId,
      detailPayload: payload.detailPayload,
      status,
    });

    this.logger.warn(
      `[SICOV-QUEUE] Encolado ${payload.recordType} | local=${payload.localMaintenanceId} | status=${status}`,
    );

    return item;
  }

  // ===========================================================
  // CRON: cada hora intenta sincronizar pendientes del día
  // ===========================================================
  @Cron(CronExpression.EVERY_HOUR)
  async processPendingBatch(): Promise<void> {
    // 1. Primero expirar registros pendientes de días anteriores
    await this.expireOldPendingInternal();

    const pendingCount = await this.queueModel.countDocuments({
      status: { $in: ['pending', 'phase1_complete'] },
    });

    if (pendingCount === 0) return;

    this.logger.log(
      `[SICOV-SYNC] Iniciando batch: ${pendingCount} registro(s) pendiente(s)`,
    );

    const items = await this.queueModel
      .find({
        status: { $in: ['pending', 'phase1_complete'] },
        attempts: { $lt: 10 },
      })
      .limit(50)
      .lean();

    let synced = 0;
    let failed = 0;

    for (const item of items) {
      try {
        await this.processOne(item._id.toString());
        synced++;
      } catch {
        failed++;
      }
    }

    this.logger.log(
      `[SICOV-SYNC] Batch completado: ${synced} sincronizados, ${failed} con error`,
    );
  }

  // ===========================================================
  // CRON: a la 1 AM diaria, expirar pendientes de días anteriores
  // ===========================================================
  @Cron('0 1 * * *')
  async expireOldPendingCron(): Promise<void> {
    const count = await this.expireOldPendingInternal();
    this.logger.log(`[SICOV-EXPIRE] Cron diario: ${count} alistamiento(s) expirado(s)`);
  }

  // ===========================================================
  // Procesar un ítem de la cola
  // ===========================================================
  async processOne(queueId: string): Promise<void> {
    const item = await this.queueModel.findById(queueId);
    if (!item || item.status === 'synced' || item.status === 'failed') return;

    item.attempts += 1;
    item.lastAttemptAt = new Date();

    try {
      // ── FASE 1: guardarMantenimiento ─────────────────────────────
      if (item.status === 'pending') {
        const mp = item.maintenancePayload;
        const res = await this.external.guardarMantenimiento({
          placa: mp.placa,
          tipoId: mp.tipoId,
          vigiladoId: mp.vigiladoId,
          vigiladoToken: mp.vigiladoToken,
        });

        const externalId =
          (res as any)?.data?.id ??
          (res as any)?.data?.mantenimientoId ??
          null;

        if (!externalId) {
          throw new Error('SICOV no retornó mantenimientoId en fase 1');
        }

        item.maintenanceExternalId = String(externalId);
        item.status = 'phase1_complete';

        // Actualizar el registro Maintenance local con el externalId
        await this.maintenanceModel.updateOne(
          { _id: item.localMaintenanceId },
          { $set: { externalId: item.maintenanceExternalId, sicov_sync_status: 'synced' } },
        );

        await item.save();
      }

      // ── FASE 2: guardarDetalle ────────────────────────────────────
      if (item.status === 'phase1_complete' && item.detailPayload) {
        const externalId = item.maintenanceExternalId!;
        const dp = item.detailPayload;

        // Verificar idempotentemente si el detalle ya fue registrado en SICOV.
        // Si visualizarXxx retorna datos (actividades / detalleActividades presentes),
        // el detalle ya existe — no se intenta guardar de nuevo.
        const alreadyInSicov = await this.checkDetailExistsInSicov(
          item.recordType,
          externalId,
          item.maintenancePayload.vigiladoId,
        );

        if (!alreadyInSicov) {
          await this.sendDetailToSicov(
            item.recordType,
            externalId,
            dp,
          );
        } else {
          this.logger.log(
            `[SICOV-SYNC] Detalle ya registrado en SICOV (visualizar OK): ` +
            `${item.recordType} externalId=${externalId} — marcando synced sin reenvío`,
          );
        }

        // Marcar detalle local como sincronizado y registrar fecha real de sync
        if (item.localDetailId) {
          const model = this.getDetailModel(item.recordType);
          await model.updateOne(
            { _id: item.localDetailId },
            { $set: { sicov_sync_status: 'synced', fechaSyncSicov: new Date() } },
          );
        }

        item.status = 'synced';
        item.syncedAt = new Date();
        await item.save();

        this.logger.log(
          `[SICOV-SYNC] OK: ${item.recordType} local=${item.localMaintenanceId} externalId=${externalId}`,
        );
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message ?? err?.message ?? String(err);
      item.lastError = errMsg;

      if (item.attempts >= item.maxAttempts) {
        item.status = 'failed';
        this.logger.error(
          `[SICOV-SYNC] FAILED permanente tras ${item.attempts} intentos: ` +
          `${item.recordType} local=${item.localMaintenanceId} | ${errMsg}`,
        );

        // Marcar el registro local como failed también
        if (item.localDetailId) {
          const model = this.getDetailModel(item.recordType);
          await model.updateOne(
            { _id: item.localDetailId },
            { $set: { sicov_sync_status: 'failed' } },
          );
        }
      } else {
        this.logger.warn(
          `[SICOV-SYNC] Intento ${item.attempts}/${item.maxAttempts} fallido: ` +
          `${item.recordType} local=${item.localMaintenanceId} | ${errMsg}`,
        );
      }

      await item.save();
      throw err; // Re-lanza para que processPendingBatch cuente el error
    }
  }

  // ===========================================================
  // ADMIN: estado de la cola
  // ===========================================================
  async getQueueStats(enterprise_id?: string) {
    const match: any = {};
    if (enterprise_id) match.enterprise_id = enterprise_id;

    const [pending, phase1, synced, failed, failedPermanent] =
      await Promise.all([
        this.queueModel.countDocuments({ ...match, status: 'pending' }),
        this.queueModel.countDocuments({ ...match, status: 'phase1_complete' }),
        this.queueModel.countDocuments({ ...match, status: 'synced' }),
        this.queueModel.countDocuments({
          ...match,
          status: { $in: ['pending', 'phase1_complete'] },
          $expr: { $gte: ['$attempts', '$maxAttempts'] },
        }),
        this.queueModel.countDocuments({ ...match, status: 'failed' }),
      ]);

    return {
      pending,
      phase1_complete: phase1,
      synced,
      blocked_max_attempts: failed,
      failed_permanent: failedPermanent,
    };
  }

  async getPendingItems(enterprise_id: string, limit = 20) {
    return this.queueModel
      .find({
        enterprise_id,
        status: { $in: ['pending', 'phase1_complete', 'failed'] },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Reparación masiva de transacciones huérfanas en SICOV.
   *
   * Para cada placa de la lista llama a guardarMantenimiento; si SICOV devuelve
   * 409 (transacción huérfana ya existe), extrae el id y completa el detalle
   * (alistamiento/preventivo/correctivo) usando el detailPayload provisto.
   *
   * Equivalente al flujo n8n "Ajustar alistamientos V2" pero integrado en la API.
   */
  async repairOrphanBatch(payload: {
    placas: string[];
    tipoId: 1 | 2 | 3;
    vigiladoId: string;
    vigiladoToken?: string;
    detailPayloadTemplate: Record<string, any>;
    recordType: SyncRecordType;
    enterprise_id: string;
  }): Promise<{ placa: string; status: 'repaired' | 'new' | 'error'; externalId?: string; error?: string }[]> {
    const results: { placa: string; status: 'repaired' | 'new' | 'error'; externalId?: string; error?: string }[] = [];

    for (const placa of payload.placas) {
      try {
        const res = await this.external.guardarMantenimiento({
          placa,
          tipoId: payload.tipoId,
          vigiladoId: payload.vigiladoId,
          vigiladoToken: payload.vigiladoToken,
        });

        const externalId: string | null =
          (res as any)?.data?.id?.toString() ??
          (res as any)?.data?.mantenimientoId?.toString() ??
          null;

        if (!externalId) {
          results.push({ placa, status: 'error', error: 'SICOV no retornó id' });
          continue;
        }

        const isOrphan = !!(res as any)?.orphanRecovered;

        if (isOrphan) {
          // Completar la transacción huérfana
          await this.sendDetailToSicov(
            payload.recordType,
            externalId,
            { ...payload.detailPayloadTemplate, placa },
          );
          results.push({ placa, status: 'repaired', externalId });
        } else {
          // Transacción nueva — también completar el detalle
          await this.sendDetailToSicov(
            payload.recordType,
            externalId,
            { ...payload.detailPayloadTemplate, placa },
          );
          results.push({ placa, status: 'new', externalId });
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? String(err);
        this.logger.error(`[REPAIR] Error en placa=${placa}: ${msg}`);
        results.push({ placa, status: 'error', error: msg });
      }
    }

    return results;
  }

  /**
   * Migración única: para todos los alistamientos/preventivos/correctivos
   * con sicov_sync_status='synced' y sin fechaSyncSicov, establece
   * fechaSyncSicov = createdAt (mejor aproximación disponible).
   *
   * Seguro de re-ejecutar (solo toca documentos donde fechaSyncSicov es null).
   */
  async migrateFechaSyncSicov(enterprise_id?: string): Promise<{
    enlistments: number;
    preventives: number;
    correctives: number;
  }> {
    const baseFilter = {
      sicov_sync_status: 'synced',
      fechaSyncSicov: { $in: [null, undefined] },
      ...(enterprise_id ? { enterprise_id } : {}),
    };

    const [e, p, c] = await Promise.all([
      this.enlistmentModel.updateMany(
        baseFilter,
        [{ $set: { fechaSyncSicov: '$createdAt' } }],
      ),
      this.preventiveModel.updateMany(
        baseFilter,
        [{ $set: { fechaSyncSicov: '$createdAt' } }],
      ),
      this.correctiveModel.updateMany(
        baseFilter,
        [{ $set: { fechaSyncSicov: '$createdAt' } }],
      ),
    ]);

    this.logger.log(
      `[MIGRATE] fechaSyncSicov ← createdAt: ` +
      `enlistments=${e.modifiedCount} preventives=${p.modifiedCount} correctives=${c.modifiedCount}`,
    );

    return {
      enlistments: e.modifiedCount,
      preventives: p.modifiedCount,
      correctives: c.modifiedCount,
    };
  }

  /** Reintento manual de un ítem específico */
  async retryOne(queueId: string): Promise<void> {
    const item = await this.queueModel.findById(queueId);
    if (!item) throw new Error('Ítem no encontrado en la cola');

    // Resetear para reintento
    if (item.status === 'failed') {
      item.status = item.maintenanceExternalId ? 'phase1_complete' : 'pending';
      item.attempts = 0;
      await item.save();
    }

    await this.processOne(queueId);
  }

  // ===========================================================
  // Helpers privados
  // ===========================================================
  /**
   * Consulta SICOV para saber si el detalle (alistamiento/preventivo/correctivo)
   * de una transacción ya fue registrado.
   *
   * Usa los endpoints visualizar-alistamiento / visualizar-preventivo / visualizar-correctivo.
   * Si la respuesta contiene datos del detalle (detalleActividades, actividades, etc.)
   * se considera que la fase 2 ya está completa → retorna true.
   *
   * Si hay un error de red o SICOV responde vacío, retorna false (se reintenta el guardado).
   */
  private async checkDetailExistsInSicov(
    recordType: SyncRecordType,
    externalId: string,
    vigiladoId?: string,
  ): Promise<boolean> {
    try {
      let res: any;
      const id = Number(externalId);

      if (recordType === 'enlistment') {
        res = await this.external.visualizarAlistamiento(id, vigiladoId);
      } else if (recordType === 'preventive') {
        res = await this.external.visualizarPreventivo(id, vigiladoId);
      } else {
        res = await this.external.visualizarCorrectivo(id, vigiladoId);
      }

      // Si la respuesta contiene detalleActividades o actividades se asume que existe
      const d = res?.data;
      if (!d) return false;

      if (recordType === 'enlistment') {
        return !!(d.actividades?.length || d.detalleActividades);
      }
      return !!(d.detalleActividades || d.nombresResponsable || d.fecha);
    } catch {
      // Ante cualquier error de red/SICOV asumimos que no existe → intentar guardar
      return false;
    }
  }

  private async sendDetailToSicov(
    recordType: SyncRecordType,
    externalId: string,
    dp: Record<string, any>,
  ): Promise<void> {
    let res: any;

    try {
      if (recordType === 'enlistment') {
        res = await this.external.guardarAlistamiento({
          ...(dp as any),
          mantenimientoId: Number(externalId),
        });
      } else if (recordType === 'preventive') {
        res = await this.external.guardarPreventivo({
          ...(dp as any),
          mantenimientoId: Number(externalId),
        });
      } else if (recordType === 'corrective') {
        res = await this.external.guardarCorrectivo({
          ...(dp as any),
          mantenimientoId: Number(externalId),
        });
      }
    } catch (e: any) {
      // 409 = detalle ya registrado en SICOV → la transacción está completa
      if (e?.status === 409) {
        this.logger.warn(
          `[SICOV-SYNC] ${recordType} 409 en detalle (ya registrado en SICOV) ` +
          `externalId=${externalId} — marcando como synced`,
        );
        return;
      }
      throw e;
    }

    // guardarAlistamiento/guardarPreventivo usan requestWithAuditSafe → no lanzan,
    // retornan { ok: false, status: N }. Tratar 409 igual.
    if (res && !res.ok && res.status !== 409) {
      throw new Error(
        `SICOV rechazó el detalle (status=${res.status}): ${res.error ?? 'error desconocido'}`,
      );
    }
  }

  // ===========================================================
  // EXPIRACIÓN: alistamientos pendientes de días anteriores
  // ===========================================================

  /**
   * Expira todos los alistamientos con sicov_sync_status='pending' cuyo
   * día de creación ya pasó. Los marca como inactivos (estado=false) y
   * cambia su estado a 'expired' para que no vuelvan a procesarse.
   *
   * También marca como 'failed' los ítems de la cola que correspondan
   * a alistamientos de días anteriores, para que no se reintenten.
   *
   * Es seguro ejecutarlo repetidamente (idempotente).
   */
  async expireOldPendingEnlistments(): Promise<{ expired: number }> {
    const count = await this.expireOldPendingInternal();
    return { expired: count };
  }

  private async expireOldPendingInternal(): Promise<number> {
    // Inicio del día actual a medianoche hora Colombia (UTC-5 = UTC+05:00 offset inverso)
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0); // medianoche hora del servidor

    const result = await this.enlistmentModel.updateMany(
      {
        sicov_sync_status: 'pending',
        createdAt: { $lt: startOfToday },
      },
      { $set: { sicov_sync_status: 'expired', estado: false } },
    );

    if (result.modifiedCount > 0) {
      // Marcar los ítems de la cola como fallidos para que no se reintenten
      await this.queueModel.updateMany(
        {
          status: { $in: ['pending', 'phase1_complete'] },
          recordType: 'enlistment',
          createdAt: { $lt: startOfToday },
        },
        {
          $set: {
            status: 'failed',
            lastError: 'Expirado: el día de creación ya pasó y no fue sincronizado',
          },
        },
      );

      this.logger.warn(
        `[SICOV-EXPIRE] ${result.modifiedCount} alistamiento(s) pendiente(s) marcado(s) como expirado(s)`,
      );
    }

    return result.modifiedCount;
  }

  private getDetailModel(
    recordType: SyncRecordType,
  ): Model<any> {
    if (recordType === 'enlistment') return this.enlistmentModel;
    if (recordType === 'preventive') return this.preventiveModel;
    return this.correctiveModel;
  }
}
