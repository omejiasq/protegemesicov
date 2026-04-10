// src/external-ingestion/external-ingestion.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes, createHash } from 'crypto';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { SyncSchedule as SyncSch, SyncScheduleDocument as SyncSchDoc } from '../schema/sync-schedule.schema';

import { ApiKey, ApiKeyDocument } from '../schema/api-key.schema';
import { ExternalVehicle, ExternalVehicleDocument } from '../schema/external-vehicle.schema';
import { ExternalDriver, ExternalDriverDocument } from '../schema/external-driver.schema';
import { SyncSchedule as SyncScheduleModel } from '../schema/sync-schedule.schema';
import { AlistamientoService } from '../maintenance-enlistment/enlistment.service';
import { PreventiveService } from '../maintenance-preventive/preventive.service';
import { CorrectiveService } from '../maintenance-corrective/corrective.service';

export interface BatchResult {
  index: number;
  status: 'created' | 'updated' | 'error';
  id?: string;
  error?: string;
}

@Injectable()
export class ExternalIngestionService {
  constructor(
    @InjectModel(ApiKey.name)
    private readonly apiKeyModel: Model<ApiKeyDocument>,

    @InjectModel(ExternalVehicle.name)
    private readonly vehicleModel: Model<ExternalVehicleDocument>,

    @InjectModel(ExternalDriver.name)
    private readonly driverModel: Model<ExternalDriverDocument>,

    @InjectModel(SyncScheduleModel.name)
    private readonly syncScheduleModel: Model<SyncSchDoc>,

    private readonly enlistmentService: AlistamientoService,
    private readonly preventiveService: PreventiveService,
    private readonly correctiveService: CorrectiveService,
  ) {}

  // ====================================================
  // Gestión de API Keys
  // ====================================================

  async createApiKey(
    enterprise_id: string,
    name: string,
    vigiladoId: string | undefined,
    vigiladoToken: string | undefined,
    createdBy: string,
    demoMode = false,
  ) {
    const rawKey = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(rawKey).digest('hex');

    const doc = await this.apiKeyModel.create({
      keyHash: hash,
      enterprise_id,
      name,
      vigiladoId,
      vigiladoToken,
      createdBy,
      active: true,
      demoMode,
    });

    return {
      id: String(doc._id),
      name: doc.name,
      enterprise_id: doc.enterprise_id,
      demoMode: doc.demoMode ?? false,
      apiKey: rawKey, // ⚠️ Solo se muestra UNA VEZ
      createdAt: (doc as any).createdAt,
    };
  }

  async listApiKeys(enterprise_id: string) {
    const docs = await this.apiKeyModel
      .find({ enterprise_id })
      .select('-keyHash')
      .sort({ createdAt: -1 })
      .lean();

    return docs.map((d) => ({
      id: String(d._id),
      name: d.name,
      active: d.active,
      demoMode: d.demoMode ?? false,
      lastUsedAt: d.lastUsedAt,
      createdAt: (d as any).createdAt,
    }));
  }

  async revokeApiKey(id: string, enterprise_id: string) {
    const doc = await this.apiKeyModel.findOneAndUpdate(
      { _id: id, enterprise_id },
      { $set: { active: false } },
      { new: true },
    );
    if (!doc) throw new NotFoundException('API Key no encontrada');
    return { ok: true };
  }

  // ====================================================
  // Helpers internos
  // ====================================================

  private buildUserContext(apiKeyCtx: any) {
    return {
      enterprise_id: apiKeyCtx.enterprise_id,
      sub: `api-key:${apiKeyCtx.keyId}`,
      vigiladoId: apiKeyCtx.vigiladoId
        ? Number(apiKeyCtx.vigiladoId)
        : Number(process.env.SICOV_VIGILADO_ID),
      vigiladoToken: apiKeyCtx.vigiladoToken ?? process.env.SICOV_TOKEN_VIGILADO,
      source: 'external_api',
      demoMode: apiKeyCtx.demoMode ?? false,
    };
  }

  private parseDate(v?: string | Date): Date | undefined {
    if (!v) return undefined;
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }

  // ====================================================
  // Alistamientos, Preventivos, Correctivos (single)
  // ====================================================

  async createEnlistment(dto: any, apiKeyCtx: any) {
    const user = this.buildUserContext(apiKeyCtx);
    return this.enlistmentService.create({ ...dto, source: 'external_api' }, user);
  }

  async createPreventive(dto: any, apiKeyCtx: any) {
    const user = this.buildUserContext(apiKeyCtx);
    return this.preventiveService.create({ ...dto, source: 'external_api' }, user);
  }

  async createCorrective(dto: any, apiKeyCtx: any) {
    const user = this.buildUserContext(apiKeyCtx);
    return this.correctiveService.create({ ...dto, source: 'external_api' }, user);
  }

  // ====================================================
  // Batch — Alistamientos, Preventivos, Correctivos
  // ====================================================

  async batchEnlistments(items: any[], apiKeyCtx: any): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const doc = await this.createEnlistment(items[i], apiKeyCtx);
        results.push({ index: i, status: 'created', id: String(doc._id ?? doc.id ?? '') });
      } catch (err: any) {
        results.push({ index: i, status: 'error', error: err?.message ?? String(err) });
      }
    }
    return results;
  }

  async batchPreventives(items: any[], apiKeyCtx: any): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const doc = await this.createPreventive(items[i], apiKeyCtx);
        results.push({ index: i, status: 'created', id: doc ? String(doc._id ?? doc.id ?? '') : '' });
      } catch (err: any) {
        results.push({ index: i, status: 'error', error: err?.message ?? String(err) });
      }
    }
    return results;
  }

  async batchCorrectives(items: any[], apiKeyCtx: any): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const doc = await this.createCorrective(items[i], apiKeyCtx);
        results.push({ index: i, status: 'created', id: doc ? String(doc._id ?? doc.id ?? '') : '' });
      } catch (err: any) {
        results.push({ index: i, status: 'error', error: err?.message ?? String(err) });
      }
    }
    return results;
  }

  // ====================================================
  // Vehículos (upsert por placa)
  // ====================================================

  async upsertVehicle(dto: any, apiKeyCtx: any) {
    const enterpriseId = new Types.ObjectId(apiKeyCtx.enterprise_id);
    const placa = String(dto.placa ?? '').trim().toUpperCase();
    if (!placa) throw new Error('El campo placa es requerido');

    const payload: any = {
      enterprise_id: enterpriseId,
      placa,
      source: 'external_api',
      createdBy: `api-key:${apiKeyCtx.keyId}`,
    };

    const fields = [
      'clase','marca','Linea','modelo','color','combustible','cilindraje',
      'nivelServicio','servicio','tipo_vehiculo','modalidad','no_interno',
      'motor','no_chasis','capacidad','tipo','kilometraje',
      'no_soat','no_rtm','no_tecnomecanica','no_tarjeta_opera',
      'nombre_propietario','cedula_propietario','telefono_propietario','direccion_propietario',
      'active','sicov_sync_enabled',
    ];
    const dateFields = [
      'expedition_soat','expiration_soat','expedition_rtm','expiration_rtm',
      'expiration_tecnomecanica','expiration_tarjeta_opera',
    ];

    for (const f of fields) {
      if (dto[f] !== undefined) payload[f] = dto[f];
    }
    for (const f of dateFields) {
      if (dto[f] !== undefined) payload[f] = this.parseDate(dto[f]);
    }

    const doc = await this.vehicleModel.findOneAndUpdate(
      { placa, enterprise_id: enterpriseId },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    return { id: String(doc!._id), placa, status: 'ok' };
  }

  async batchVehicles(items: any[], apiKeyCtx: any): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const res = await this.upsertVehicle(items[i], apiKeyCtx);
        results.push({ index: i, status: 'created', id: res.id });
      } catch (err: any) {
        results.push({ index: i, status: 'error', error: err?.message ?? String(err) });
      }
    }
    return results;
  }

  // ====================================================
  // Conductores (upsert por número de identificación)
  // ====================================================

  async upsertDriver(dto: any, apiKeyCtx: any) {
    const enterpriseId = new Types.ObjectId(apiKeyCtx.enterprise_id);
    const numeroIdentificacion = String(dto.numeroIdentificacion ?? '').trim();
    if (!numeroIdentificacion) throw new Error('El campo numeroIdentificacion es requerido');

    const payload: any = {
      enterprise_id: enterpriseId,
      numeroIdentificacion,
      source: 'external_api',
      createdBy: `api-key:${apiKeyCtx.keyId}`,
    };

    const strFields = [
      'tipoIdentificacionPrincipal','primerNombrePrincipal','segundoNombrePrincipal',
      'primerApellidoPrincipal','segundoApellidoPrincipal',
      'tipoIdentificacionSecundario','numeroIdentificacionSecundario',
      'primerNombreSecundario','segundoNombreSecundario',
      'primerApellidoSecundario','segundoApellidoSecundario',
      'idPruebaAlcoholimetria','resultadoPruebaAlcoholimetria',
      'idExamenMedico','licenciaConduccion','licenciaConduccionSecundario','observaciones',
    ];
    const dateFields = [
      'fechaUltimaPruebaAlcoholimetria','fechaUltimoExamenMedico','licenciaVencimiento',
    ];

    for (const f of strFields) {
      if (dto[f] !== undefined) payload[f] = dto[f];
    }
    for (const f of dateFields) {
      if (dto[f] !== undefined) payload[f] = this.parseDate(dto[f]);
    }
    if (dto.active !== undefined) payload.active = dto.active;

    const doc = await this.driverModel.findOneAndUpdate(
      { numeroIdentificacion, enterprise_id: enterpriseId },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    return { id: String(doc!._id), numeroIdentificacion, status: 'ok' };
  }

  async batchDrivers(items: any[], apiKeyCtx: any): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const res = await this.upsertDriver(items[i], apiKeyCtx);
        results.push({ index: i, status: 'created', id: res.id });
      } catch (err: any) {
        results.push({ index: i, status: 'error', error: err?.message ?? String(err) });
      }
    }
    return results;
  }

  // ====================================================
  // Importación desde archivo Excel / CSV
  // ====================================================

  /** Parsea el archivo y devuelve columnas + primeras 10 filas como preview */
  async previewFile(buffer: Buffer, filename: string) {
    const rows = this.parseFile(buffer, filename);
    if (!rows.length) throw new BadRequestException('El archivo no contiene datos');
    const columns = Object.keys(rows[0]);
    return {
      columns,
      totalRows: rows.length,
      preview: rows.slice(0, 10),
    };
  }

  private parseFile(buffer: Buffer, filename: string): Record<string, any>[] {
    const ext = (filename ?? '').split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      const wb = XLSX.read(buffer, { type: 'buffer', raw: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(ws, { defval: '' });
    }
    // xlsx, xls, ods, etc.
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
  }

  private applyMapping(rows: Record<string, any>[], mapping: Record<string, string>, startRow: number) {
    // mapping: { campoProtegeMe: 'Columna del Excel' }
    const data = rows.slice(startRow - 2); // sheet_to_json ya omite header (fila 1)
    return data.map(row => {
      const out: Record<string, any> = {};
      for (const [field, col] of Object.entries(mapping)) {
        if (col && row[col] !== undefined && row[col] !== '') {
          out[field] = String(row[col]).trim();
        }
      }
      return out;
    }).filter(row => Object.keys(row).length > 0);
  }

  async importVehiclesFromFile(
    buffer: Buffer,
    filename: string,
    mapping: Record<string, string>,
    startRow: number,
    jwtUser: any,
  ) {
    const rows = this.parseFile(buffer, filename);
    const items = this.applyMapping(rows, mapping, startRow);
    if (!items.length) throw new BadRequestException('No se encontraron filas válidas con el mapeo indicado');

    const fakeCtx = {
      enterprise_id: jwtUser.enterprise_id,
      keyId: `jwt:${jwtUser.sub}`,
      demoMode: false,
    };

    const results: BatchResult[] = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const res = await this.upsertVehicle(items[i], fakeCtx);
        results.push({ index: i, status: res.status === 'ok' ? 'created' : 'updated', id: res.id });
      } catch (err: any) {
        results.push({ index: i, status: 'error', error: err?.message ?? String(err) });
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    const errors  = results.filter(r => r.status === 'error').length;
    return { total: items.length, created, errors, results };
  }

  async importDriversFromFile(
    buffer: Buffer,
    filename: string,
    mapping: Record<string, string>,
    startRow: number,
    jwtUser: any,
  ) {
    const rows = this.parseFile(buffer, filename);
    const items = this.applyMapping(rows, mapping, startRow);
    if (!items.length) throw new BadRequestException('No se encontraron filas válidas con el mapeo indicado');

    const fakeCtx = {
      enterprise_id: jwtUser.enterprise_id,
      keyId: `jwt:${jwtUser.sub}`,
      demoMode: false,
    };

    const results: BatchResult[] = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const res = await this.upsertDriver(items[i], fakeCtx);
        results.push({ index: i, status: res.status === 'ok' ? 'created' : 'updated', id: res.id });
      } catch (err: any) {
        results.push({ index: i, status: 'error', error: err?.message ?? String(err) });
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    const errors  = results.filter(r => r.status === 'error').length;
    return { total: items.length, created, errors, results };
  }

  // ====================================================
  // Sync Schedules (sincronizaciones programadas)
  // ====================================================

  async listSyncSchedules(enterprise_id: string) {
    return this.syncScheduleModel
      .find({ enterprise_id: new Types.ObjectId(enterprise_id) })
      .select('-authValue')
      .sort({ createdAt: -1 })
      .lean();
  }

  async createSyncSchedule(enterprise_id: string, dto: any) {
    const doc = await this.syncScheduleModel.create({
      enterprise_id: new Types.ObjectId(enterprise_id),
      name:          dto.name,
      entityType:    dto.entityType,
      sourceUrl:     dto.sourceUrl,
      authType:      dto.authType   ?? 'none',
      authValue:     dto.authValue  ?? '',
      authHeader:    dto.authHeader ?? 'X-Api-Key',
      cronExpression: dto.cronExpression,
      cronLabel:     dto.cronLabel  ?? '',
      enabled:       dto.enabled    ?? true,
    });
    return { id: String(doc._id), ...dto };
  }

  async updateSyncSchedule(id: string, enterprise_id: string, dto: any) {
    const doc = await this.syncScheduleModel.findOneAndUpdate(
      { _id: id, enterprise_id: new Types.ObjectId(enterprise_id) },
      { $set: dto },
      { new: true },
    ).select('-authValue').lean();
    if (!doc) throw new NotFoundException('Sincronización no encontrada');
    return doc;
  }

  async deleteSyncSchedule(id: string, enterprise_id: string) {
    await this.syncScheduleModel.deleteOne({ _id: id, enterprise_id: new Types.ObjectId(enterprise_id) });
    return { ok: true };
  }

  /** Ejecuta la sincronización: llama al endpoint externo y hace batch upsert */
  async runSyncSchedule(id: string, enterprise_id: string) {
    const schedule = await this.syncScheduleModel.findOne({
      _id: id, enterprise_id: new Types.ObjectId(enterprise_id),
    }).lean();
    if (!schedule) throw new NotFoundException('Sincronización no encontrada');

    await this.syncScheduleModel.updateOne({ _id: id }, { $set: { lastRunStatus: 'running' } });

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (schedule.authType === 'bearer')  headers['Authorization'] = `Bearer ${schedule.authValue}`;
      if (schedule.authType === 'api_key') headers[schedule.authHeader ?? 'X-Api-Key'] = schedule.authValue;
      if (schedule.authType === 'basic')   headers['Authorization'] = `Basic ${Buffer.from(schedule.authValue).toString('base64')}`;

      const response = await axios.get(schedule.sourceUrl, { headers, timeout: 30_000 });
      const data: any[] = Array.isArray(response.data) ? response.data : (response.data?.data ?? response.data?.items ?? []);
      if (!Array.isArray(data)) throw new Error('La respuesta del endpoint externo no es un array');

      const fakeCtx = { enterprise_id, keyId: `sync:${id}`, demoMode: false };
      let total = 0, errors = 0;

      if (schedule.entityType === 'vehicles' || schedule.entityType === 'both') {
        const res = await this.batchVehicles(data, fakeCtx);
        total += res.length;
        errors += res.filter(r => r.status === 'error').length;
      }
      if (schedule.entityType === 'drivers' || schedule.entityType === 'both') {
        const res = await this.batchDrivers(data, fakeCtx);
        total += res.length;
        errors += res.filter(r => r.status === 'error').length;
      }

      const summary = `${total} registros procesados, ${errors} errores`;
      await this.syncScheduleModel.updateOne({ _id: id }, {
        $set: { lastRunAt: new Date(), lastRunStatus: 'success', lastRunSummary: summary },
        $inc: { totalRuns: 1, successRuns: 1 },
      });
      return { ok: true, summary };
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      await this.syncScheduleModel.updateOne({ _id: id }, {
        $set: { lastRunAt: new Date(), lastRunStatus: 'error', lastRunSummary: msg },
        $inc: { totalRuns: 1 },
      });
      throw new BadRequestException(`Error en sincronización: ${msg}`);
    }
  }
}
