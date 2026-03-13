// src/audit-report/audit-report.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Audit, AuditDocument } from '../libs/audit/audit.schema';

const INTERNAL_OPS = ['login', '__smoke', 'login:retry'];

export interface AuditReportQuery {
  enterpriseId: string;
  userId?: string;        // para compatibilidad con registros históricos sin enterpriseId
  from?: string;
  to?: string;
  operation?: string;
  success?: boolean;
  includeInternal?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditReportService {
  constructor(
    @InjectModel(Audit.name)
    private readonly auditModel: Model<AuditDocument>,
  ) {}

  /**
   * Construye el filtro principal.
   * - Registros nuevos: tienen enterpriseId  → filtra por enterpriseId
   * - Registros históricos: sin enterpriseId → filtra por userId como fallback
   * Ambos se unen con $or para mostrar todo el histórico de la empresa.
   */
  private buildBaseFilter(q: AuditReportQuery): any {
    const conditions: any[] = [];

    if (q.enterpriseId) {
      conditions.push({ enterpriseId: q.enterpriseId });
    }
    // Registros anteriores al fix (sin enterpriseId) del mismo usuario
    if (q.userId) {
      conditions.push({ enterpriseId: { $in: [null, undefined, ''] }, userId: q.userId });
    }

    const base: any = conditions.length > 1
      ? { $or: conditions }
      : conditions.length === 1
        ? conditions[0]
        : {};

    // Rango de fechas — cast explícito para Mongoose
    if (q.from || q.to) {
      const dateRange: any = {};
      if (q.from) dateRange.$gte = new Date(`${q.from}T00:00:00.000Z`);
      if (q.to)   dateRange.$lte = new Date(`${q.to}T23:59:59.999Z`);
      base.createdAt = dateRange;
    }

    // Operaciones
    if (q.operation) {
      base.operation = q.operation;
    } else if (!q.includeInternal) {
      base.operation = { $nin: INTERNAL_OPS };
    }

    if (q.success !== undefined) {
      base.success = q.success;
    }

    return base;
  }

  async getReport(q: AuditReportQuery) {
    const page  = Math.max(1, q.page  ?? 1);
    const limit = Math.max(1, Math.min(200, q.limit ?? 50));
    const skip  = (page - 1) * limit;

    const filter = this.buildBaseFilter(q);

    const rawItems = await this.auditModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-requestPayload')
      .lean();

    // Keep only `mensaje` from responseBody to avoid sending large payloads in the list
    const items = rawItems.map((item: any) => ({
      ...item,
      responseBody: item.responseBody
        ? { mensaje: item.responseBody.mensaje ?? item.responseBody.message ?? null }
        : undefined,
    }));

    const [total, stats] = await Promise.all([
      this.auditModel.countDocuments(filter),
      this.getStats(q),
    ]);

    return {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      stats,
      items,
    };
  }

  async getDetail(id: string, enterpriseId: string, userId?: string) {
    // Intentar por enterpriseId primero; si no, por userId (registros históricos)
    const doc = await this.auditModel
      .findOne({ _id: id, enterpriseId })
      .lean();
    if (doc) return doc;

    if (userId) {
      return this.auditModel
        .findOne({ _id: id, userId })
        .lean();
    }
    return null;
  }

  private async getStats(q: AuditReportQuery) {
    const base = this.buildBaseFilter(q);
    // Quitar filtro de operación para el $match de stats (ya está en base)
    const matchFilter = { ...base };

    const agg = await this.auditModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { operation: '$operation', success: '$success' },
          count: { $sum: 1 },
          avgDurationMs: { $avg: '$durationMs' },
        },
      },
      { $sort: { '_id.operation': 1 } },
    ]);

    const byOperation: Record<string, { total: number; success: number; failed: number; avgMs: number }> = {};
    let totalSuccess = 0;
    let totalFailed  = 0;

    for (const row of agg) {
      const op = row._id.operation as string;
      const ok = row._id.success as boolean;
      if (!byOperation[op]) byOperation[op] = { total: 0, success: 0, failed: 0, avgMs: 0 };
      byOperation[op].total  += row.count;
      byOperation[op].avgMs   = Math.round(row.avgDurationMs ?? 0);
      if (ok) { byOperation[op].success += row.count; totalSuccess += row.count; }
      else    { byOperation[op].failed  += row.count; totalFailed  += row.count; }
    }

    return { totalSuccess, totalFailed, total: totalSuccess + totalFailed, byOperation };
  }

  async getAvailableOperations(enterpriseId: string, userId?: string): Promise<string[]> {
    const conditions: any[] = [];
    if (enterpriseId) conditions.push({ enterpriseId });
    if (userId) conditions.push({ enterpriseId: { $in: [null, undefined, ''] }, userId });

    const filter: any = conditions.length > 1 ? { $or: conditions } : conditions[0] ?? {};
    filter.operation = { $nin: INTERNAL_OPS };

    const ops = await this.auditModel.distinct('operation', filter);
    return (ops as string[]).sort();
  }

  /**
   * Migración: rellena enterpriseId en registros históricos del usuario actual.
   * Seguro: solo actualiza registros del mismo userId, no toca los de otros.
   */
  async migrateEnterpriseId(enterpriseId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.auditModel.updateMany(
      { userId, enterpriseId: { $in: [null, undefined, ''] } },
      { $set: { enterpriseId } },
    );
    return { updated: result.modifiedCount };
  }
}
