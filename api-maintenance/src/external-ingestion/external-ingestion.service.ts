// src/external-ingestion/external-ingestion.service.ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes, createHash } from 'crypto';

import { ApiKey, ApiKeyDocument } from '../schema/api-key.schema';
import { ExternalVehicle, ExternalVehicleDocument } from '../schema/external-vehicle.schema';
import { ExternalDriver, ExternalDriverDocument } from '../schema/external-driver.schema';
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
}
