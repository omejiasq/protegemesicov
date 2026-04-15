// src/audit-report/audit-report.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Audit, AuditDocument } from '../libs/audit/audit.schema';

const INTERNAL_OPS = ['login', '__smoke', 'login:retry'];

export interface AuditReportQuery {
  enterpriseId: string;
  userId?: string;        // para compatibilidad con registros históricos sin enterpriseId
  isSuperAdmin?: boolean; // si true, ignora el filtro de empresa (ve todos)
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
    // Superadmin ve todos los registros — sin filtro de empresa
    const base: any = {};

    if (!q.isSuperAdmin) {
      const conditions: any[] = [];
      if (q.enterpriseId) {
        conditions.push({ enterpriseId: q.enterpriseId });
      }
      // Registros anteriores al fix (sin enterpriseId) del mismo usuario
      if (q.userId) {
        conditions.push({ enterpriseId: { $in: [null, undefined, ''] }, userId: q.userId });
      }
      if (conditions.length > 1) {
        base.$or = conditions;
      } else if (conditions.length === 1) {
        Object.assign(base, conditions[0]);
      }
    }

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
      .lean();

    // Keep only `mensaje` from responseBody and only `placa` from requestPayload
    const items = rawItems.map((item: any) => ({
      ...item,
      requestPayload: item.requestPayload?.placa
        ? { placa: item.requestPayload.placa }
        : undefined,
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

  async getAvailableOperations(enterpriseId: string, userId?: string, isSuperAdmin = false): Promise<string[]> {
    let filter: any = { operation: { $nin: INTERNAL_OPS } };

    if (!isSuperAdmin) {
      const conditions: any[] = [];
      if (enterpriseId) conditions.push({ enterpriseId });
      if (userId) conditions.push({ enterpriseId: { $in: [null, undefined, ''] }, userId });

      const enterpriseFilter = conditions.length > 1 ? { $or: conditions } : conditions[0] ?? {};
      filter = { ...enterpriseFilter, operation: { $nin: INTERNAL_OPS } };
    }

    const ops = await this.auditModel.distinct('operation', filter);
    return (ops as string[]).sort();
  }

  /**
   * Estadística agregada de consumo de servicios RUNT (Req. 8 RUNT).
   * Devuelve los 8 campos exigidos agrupados por empresa + módulo + mes.
   * Si isSuperAdmin=true, devuelve todas las empresas (para Supertransporte).
   */
  async getStatsRunt(params: {
    enterpriseId?: string;
    isSuperAdmin?: boolean;
    year?: number;
    month?: number;
  }) {
    const now = new Date();
    const year  = params.year  ?? now.getFullYear();
    const month = params.month ?? now.getMonth() + 1;   // 1-12

    // Rango del mes completo (UTC)
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const matchStage: any = {
      createdAt: { $gte: from, $lte: to },
      operation: { $nin: INTERNAL_OPS },
    };

    // Superadmin ve todas las empresas; usuario normal solo la suya
    if (!params.isSuperAdmin && params.enterpriseId) {
      matchStage.enterpriseId = params.enterpriseId;
    }

    const rows = await this.auditModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            enterpriseId: '$enterpriseId',
            module:       '$module',
            year:  { $year:  '$createdAt' },
            month: { $month: '$createdAt' },
          },
          totalConsultas:  { $sum: 1 },
          exitosas:        { $sum: { $cond: ['$success', 1, 0] } },
          fallidas:        { $sum: { $cond: ['$success', 0, 1] } },
          tiempoPromedioMs: { $avg: '$durationMs' },
        },
      },
      // Enriquecer con NIT y Razón Social desde la colección enterprises
      {
        $lookup: {
          from: 'enterprises',
          let: { eid: '$_id.enterpriseId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: '$_id' }, '$$eid'],
                },
              },
            },
            { $project: { document_number: 1, name: 1 } },
          ],
          as: 'enterpriseInfo',
        },
      },
      {
        $addFields: {
          enterpriseData: { $arrayElemAt: ['$enterpriseInfo', 0] },
        },
      },
      { $sort: { '_id.enterpriseId': 1, '_id.module': 1 } },
    ]);

    // Forma plana — lista de filas para tabla o CSV
    return rows.map((r: any) => ({
      sujetoObligadoId: r._id.enterpriseId ?? '—',
      nit:              r.enterpriseData?.document_number ?? '—',
      razonSocial:      r.enterpriseData?.name ?? '—',
      modulo:           r._id.module ?? '—',
      vigencia:         r._id.year,
      mes:              r._id.month,
      totalConsultas:   r.totalConsultas,
      exitosas:         r.exitosas,
      fallidas:         r.fallidas,
      tiempoPromedioMs: Math.round(r.tiempoPromedioMs ?? 0),
    }));
  }

  /**
   * Datos para el Requisito 7 del Anexo Técnico SICOV.
   * Devuelve registros individuales de auditoría enriquecidos con:
   *   – codigoOperador  : vigiladoId de la empresa con admin=true
   *   – tipoIdentificacion / numeroIdentificacion: de la empresa del sujeto obligado
   *   – parametrosEntrada: requestPayload serializado
   *   – respuesta        : responseBody serializado
   *
   * Si forExport=true no aplica paginación (máx 10 000 registros).
   */
  async getReq7Data(params: {
    enterpriseId?: string;
    isSuperAdmin?: boolean;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    forExport?: boolean;
  }) {
    // ── 1. Código Operador: vigiladoId de la empresa proveedora (admin=true) ──
    const operatorDoc = await (this.auditModel as any).db
      .collection('enterprises')
      .findOne({ admin: true }, { projection: { vigiladoId: 1 } });
    const codigoOperador: string | null = operatorDoc?.vigiladoId ?? null;

    // ── 2. Filtro base ─────────────────────────────────────────────────────────
    const matchFilter: any = { operation: { $nin: INTERNAL_OPS } };

    if (!params.isSuperAdmin && params.enterpriseId) {
      matchFilter.enterpriseId = params.enterpriseId;
    }
    if (params.from || params.to) {
      const dr: any = {};
      if (params.from) dr.$gte = new Date(`${params.from}T00:00:00.000Z`);
      if (params.to)   dr.$lte = new Date(`${params.to}T23:59:59.999Z`);
      matchFilter.createdAt = dr;
    }

    // ── 3. Paginación ──────────────────────────────────────────────────────────
    const limit = params.forExport ? 10_000 : Math.min(params.limit ?? 50, 200);
    const page  = Math.max(1, params.page ?? 1);
    const skip  = params.forExport ? 0 : (page - 1) * limit;

    // ── 4. Aggregate con lookup a enterprises ─────────────────────────────────
    const [rawItems, total] = await Promise.all([
      this.auditModel.aggregate([
        { $match: matchFilter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'enterprises',
            let: { eid: '$enterpriseId' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: [{ $toString: '$_id' }, '$$eid'] },
                },
              },
              { $project: { document_type: 1, document_number: 1, name: 1 } },
            ],
            as: 'enterpriseInfo',
          },
        },
        {
          $addFields: {
            enterpriseData: { $arrayElemAt: ['$enterpriseInfo', 0] },
          },
        },
        {
          $project: {
            createdAt: 1,
            module: 1,
            operation: 1,
            success: 1,
            requestPayload: 1,
            responseBody: 1,
            'enterpriseData.document_type': 1,
            'enterpriseData.document_number': 1,
            'enterpriseData.name': 1,
          },
        },
      ]),
      this.auditModel.countDocuments(matchFilter),
    ]);

    const items = rawItems.map((r: any) => {
      const fecha = r.createdAt ? new Date(r.createdAt) : null;
      return {
        codigoOperador:       codigoOperador ?? '—',
        tipoIdentificacion:   r.enterpriseData?.document_type ?? '—',
        numeroIdentificacion: r.enterpriseData?.document_number ?? '—',
        razonSocial:          r.enterpriseData?.name ?? '—',
        modulo:               r.module ?? '—',
        fechaConsumo: fecha
          ? `${String(fecha.getDate()).padStart(2,'0')}/${String(fecha.getMonth()+1).padStart(2,'0')}/${fecha.getFullYear()}`
          : '—',
        parametrosEntrada: r.requestPayload
          ? JSON.stringify(r.requestPayload)
          : '—',
        resultado: r.success ? 'EXITOSO' : 'ERROR',
        respuesta: r.responseBody
          ? JSON.stringify(r.responseBody)
          : '—',
      };
    });

    return {
      codigoOperador,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items,
    };
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
