// src/terminales/terminales.service.ts
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  TerminalSalida,
  TerminalSalidaDocument,
} from './schema/terminal-salida.schema';
import {
  TerminalLlegada,
  TerminalLlegadaDocument,
} from './schema/terminal-llegada.schema';
import {
  TerminalNovedad,
  TerminalNovedadDocument,
} from './schema/terminal-novedad.schema';

import { TerminalesExternalApiService } from './terminales-external-api';
import { AuditService } from '../libs/audit/audit.service';

type User = {
  enterprise_id?: string;
  sub?: string;
  tipo_habilitacion?: string;
  vigiladoId?: string;
  vigiladoToken?: string;
};

@Injectable()
export class TerminalesService {
  private readonly logger = new Logger(TerminalesService.name);

  constructor(
    @InjectModel(TerminalSalida.name)
    private readonly salidaModel: Model<TerminalSalidaDocument>,

    @InjectModel(TerminalLlegada.name)
    private readonly llegadaModel: Model<TerminalLlegadaDocument>,

    @InjectModel(TerminalNovedad.name)
    private readonly novedadModel: Model<TerminalNovedadDocument>,

    private readonly external: TerminalesExternalApiService,
    private readonly audit: AuditService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Guard: solo empresas CARRETERA o MIXTO pueden operar terminales
  // (temporal para pruebas; en producción se restringe vía enterprise_menu_permissions
  //  asignados por superadmin)
  // ─────────────────────────────────────────────────────────────────────────
  private assertCarretera(user: User) {
    const allowed = ['CARRETERA', 'MIXTO'];
    if (!allowed.includes(user.tipo_habilitacion ?? '')) {
      throw new ForbiddenException(
        'El módulo de terminales solo está disponible para empresas con habilitación CARRETERA o MIXTO.',
      );
    }
  }

  private ctx(user: User) {
    return {
      vigiladoId: user.vigiladoId ? String(user.vigiladoId) : undefined,
      vigiladoToken: user.vigiladoToken,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SALIDAS
  // ═══════════════════════════════════════════════════════════════════════════

  async createSalida(dto: any, user: User) {
    this.assertCarretera(user);

    // 1. Guardar localmente (offline-first)
    const doc = await this.salidaModel.create({
      ...dto,
      enterprise_id: user.enterprise_id,
      createdBy: user.sub,
      sync_status: 'pending',
    });

    await this.audit.log({
      module: 'terminales',
      operation: 'createSalida:local',
      endpoint: 'local://terminal_salidas',
      requestPayload: dto,
      responseStatus: 201,
      responseBody: { _id: String(doc._id) },
      success: true,
      userId: user.sub,
      enterpriseId: user.enterprise_id,
    });

    // 2. Enviar a Supertransporte (no bloquea la respuesta al cliente)
    this.syncSalida(doc, user).catch((e) =>
      this.logger.warn(`[syncSalida] ${e?.message}`),
    );

    return doc.toJSON();
  }

  private async syncSalida(doc: TerminalSalidaDocument, user: User) {
    const res = await this.external.crearSalida(
      {
        idDespachoTerminal: doc.idDespachoTerminal,
        terminalDespacho: doc.terminalDespacho,
        nitEmpresaTransporte: doc.nitEmpresaTransporte,
        razonSocial: doc.razonSocial,
        numeroPasajero: doc.numeroPasajero,
        valorTiquete: doc.valorTiquete,
        valorTotalTasaUso: doc.valorTotalTasaUso,
        valorPruebaAlcoholimetria: doc.valorPruebaAlcoholimetria,
        observaciones: doc.observaciones,
      },
      this.ctx(user),
    );

    const externalId =
      res.data?.id ?? res.data?.idDespacho ?? res.data?.data?.id ?? null;

    await this.salidaModel.updateOne(
      { _id: doc._id },
      {
        $set: {
          sync_status: res.ok ? 'synced' : 'failed',
          externalId: externalId != null ? Number(externalId) : null,
          fechaSync: new Date(),
          syncError: res.ok ? undefined : (res.error ?? JSON.stringify(res.data)),
        },
      },
    );
  }

  async listSalidas(q: any, user: User) {
    this.assertCarretera(user);

    const match: any = { enterprise_id: user.enterprise_id };
    if (q?.sync_status) match.sync_status = q.sync_status;
    if (q?.fechaDesde || q?.fechaHasta) {
      match.createdAt = {};
      if (q.fechaDesde) match.createdAt.$gte = new Date(`${q.fechaDesde}T00:00:00.000Z`);
      if (q.fechaHasta) match.createdAt.$lte = new Date(`${q.fechaHasta}T23:59:59.999Z`);
    }

    const page = Math.max(1, Number(q?.page) || 1);
    const limit = Math.min(200, Number(q?.numero_items) || 50);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.salidaModel.find(match).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.salidaModel.countDocuments(match),
    ]);

    return { items, total, page, numero_items: limit };
  }

  async getSalida(id: string, user: User) {
    this.assertCarretera(user);
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('No encontrado');
    const doc = await this.salidaModel
      .findOne({ _id: id, enterprise_id: user.enterprise_id })
      .lean();
    if (!doc) throw new NotFoundException('No encontrado');
    return doc;
  }

  async toggleSalida(id: string, user: User) {
    this.assertCarretera(user);
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('No encontrado');
    const doc = await this.salidaModel.findOne({
      _id: id,
      enterprise_id: user.enterprise_id,
    });
    if (!doc) throw new NotFoundException('No encontrado');
    doc.estado = !doc.estado;
    await doc.save();

    await this.audit.log({
      module: 'terminales',
      operation: 'toggleSalida',
      endpoint: `local://terminal_salidas/${id}`,
      requestPayload: { id },
      responseStatus: 200,
      responseBody: { estado: doc.estado },
      success: true,
      userId: user.sub,
      enterpriseId: user.enterprise_id,
    });

    return doc.toJSON();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LLEGADAS
  // ═══════════════════════════════════════════════════════════════════════════

  async createLlegada(dto: any, user: User) {
    this.assertCarretera(user);

    const doc = await this.llegadaModel.create({
      ...dto,
      enterprise_id: user.enterprise_id,
      createdBy: user.sub,
      sync_status: 'pending',
    });

    await this.audit.log({
      module: 'terminales',
      operation: 'createLlegada:local',
      endpoint: 'local://terminal_llegadas',
      requestPayload: dto,
      responseStatus: 201,
      responseBody: { _id: String(doc._id) },
      success: true,
      userId: user.sub,
      enterpriseId: user.enterprise_id,
    });

    // Sync en background (3 llamadas secuenciales a Supertransporte)
    this.syncLlegada(doc, user).catch((e) =>
      this.logger.warn(`[syncLlegada] ${e?.message}`),
    );

    return doc.toJSON();
  }

  private async syncLlegada(doc: TerminalLlegadaDocument, user: User) {
    // Paso 1: crear llegada principal → obtener llegada_id
    const res1 = await this.external.crearLlegada(
      {
        tipollegada_id: doc.tipollegada_id,
        despacho_id: doc.despacho_id,
        terminalllegada: doc.terminalllegada,
        numero_pasajero: doc.numero_pasajero,
        horallegada: doc.horallegada,
        fechallegada: doc.fechallegada,
      },
      this.ctx(user),
    );

    const llegadaId =
      res1.data?.id ?? res1.data?.llegada_id ?? res1.data?.data?.id ?? null;

    if (!res1.ok || llegadaId == null) {
      await this.llegadaModel.updateOne(
        { _id: doc._id },
        { $set: { sync_status: 'failed', fechaSync: new Date(), syncError: res1.error ?? JSON.stringify(res1.data) } },
      );
      return;
    }

    // Paso 2: crear llegadavehiculo
    let vehOk = false;
    let vehId: number | null = null;
    if (doc.vehiculo) {
      const res2 = await this.external.crearLlegadaVehiculo(
        { llegada_id: Number(llegadaId), ...doc.vehiculo },
        this.ctx(user),
      );
      vehOk = res2.ok;
      vehId = res2.data?.id ?? null;
    }

    // Paso 3: crear llegadaconductor
    let condOk = false;
    let condId: number | null = null;
    if (doc.conductor) {
      const res3 = await this.external.crearLlegadaConductor(
        { llegada_id: Number(llegadaId), ...doc.conductor },
        this.ctx(user),
      );
      condOk = res3.ok;
      condId = res3.data?.id ?? null;
    }

    const allOk =
      res1.ok &&
      (!doc.vehiculo || vehOk) &&
      (!doc.conductor || condOk);

    await this.llegadaModel.updateOne(
      { _id: doc._id },
      {
        $set: {
          externalLlegadaId: Number(llegadaId),
          externalVehiculoId: vehId,
          externalConductorId: condId,
          sync_status: allOk ? 'synced' : 'partial',
          fechaSync: new Date(),
        },
      },
    );
  }

  async listLlegadas(q: any, user: User) {
    this.assertCarretera(user);

    const match: any = { enterprise_id: user.enterprise_id };
    if (q?.sync_status) match.sync_status = q.sync_status;
    if (q?.fechaDesde || q?.fechaHasta) {
      match.createdAt = {};
      if (q.fechaDesde) match.createdAt.$gte = new Date(`${q.fechaDesde}T00:00:00.000Z`);
      if (q.fechaHasta) match.createdAt.$lte = new Date(`${q.fechaHasta}T23:59:59.999Z`);
    }

    const page = Math.max(1, Number(q?.page) || 1);
    const limit = Math.min(200, Number(q?.numero_items) || 50);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.llegadaModel.find(match).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.llegadaModel.countDocuments(match),
    ]);

    return { items, total, page, numero_items: limit };
  }

  async toggleLlegada(id: string, user: User) {
    this.assertCarretera(user);
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('No encontrado');
    const doc = await this.llegadaModel.findOne({
      _id: id,
      enterprise_id: user.enterprise_id,
    });
    if (!doc) throw new NotFoundException('No encontrado');
    doc.estado = !doc.estado;
    await doc.save();
    return doc.toJSON();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOVEDADES
  // ═══════════════════════════════════════════════════════════════════════════

  async createNovedad(dto: any, user: User) {
    this.assertCarretera(user);

    const doc = await this.novedadModel.create({
      ...dto,
      enterprise_id: user.enterprise_id,
      createdBy: user.sub,
      sync_status: 'pending',
    });

    await this.audit.log({
      module: 'terminales',
      operation: 'createNovedad:local',
      endpoint: 'local://terminal_novedades',
      requestPayload: dto,
      responseStatus: 201,
      responseBody: { _id: String(doc._id) },
      success: true,
      userId: user.sub,
      enterpriseId: user.enterprise_id,
    });

    this.syncNovedad(doc, user).catch((e) =>
      this.logger.warn(`[syncNovedad] ${e?.message}`),
    );

    return doc.toJSON();
  }

  private async syncNovedad(doc: TerminalNovedadDocument, user: User) {
    // Paso 1: crear novedad principal → obtener novedadId
    const res1 = await this.external.crearNovedad(
      {
        id_despacho: doc.id_despacho,
        tipo_novedad_id: doc.tipo_novedad_id,
        descripcion: doc.descripcion,
        otros: doc.otros,
      },
      this.ctx(user),
    );

    const novedadId =
      res1.data?.id ?? res1.data?.novedad_id ?? res1.data?.data?.id ?? null;

    if (!res1.ok || novedadId == null) {
      await this.novedadModel.updateOne(
        { _id: doc._id },
        { $set: { sync_status: 'failed', fechaSync: new Date(), syncError: res1.error ?? JSON.stringify(res1.data) } },
      );
      return;
    }

    // Paso 2: novedad vehículo
    let vehOk = false;
    let vehId: number | null = null;
    if (doc.vehiculo) {
      const res2 = await this.external.crearNovedadVehiculo(
        { idNovedad: Number(novedadId), ...doc.vehiculo },
        this.ctx(user),
      );
      vehOk = res2.ok;
      vehId = res2.data?.id ?? null;
    }

    // Paso 3: novedad conductor
    let condOk = false;
    let condId: number | null = null;
    if (doc.conductor) {
      const res3 = await this.external.crearNovedadConductor(
        { idNovedad: Number(novedadId), ...doc.conductor },
        this.ctx(user),
      );
      condOk = res3.ok;
      condId = res3.data?.id ?? null;
    }

    const allOk =
      res1.ok &&
      (!doc.vehiculo || vehOk) &&
      (!doc.conductor || condOk);

    await this.novedadModel.updateOne(
      { _id: doc._id },
      {
        $set: {
          externalNovedadId: Number(novedadId),
          externalVehiculoId: vehId,
          externalConductorId: condId,
          sync_status: allOk ? 'synced' : 'partial',
          fechaSync: new Date(),
        },
      },
    );
  }

  async listNovedades(q: any, user: User) {
    this.assertCarretera(user);

    const match: any = { enterprise_id: user.enterprise_id };
    if (q?.id_despacho) match.id_despacho = Number(q.id_despacho);
    if (q?.sync_status) match.sync_status = q.sync_status;
    if (q?.fechaDesde || q?.fechaHasta) {
      match.createdAt = {};
      if (q.fechaDesde) match.createdAt.$gte = new Date(`${q.fechaDesde}T00:00:00.000Z`);
      if (q.fechaHasta) match.createdAt.$lte = new Date(`${q.fechaHasta}T23:59:59.999Z`);
    }

    const page = Math.max(1, Number(q?.page) || 1);
    const limit = Math.min(200, Number(q?.numero_items) || 50);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.novedadModel.find(match).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.novedadModel.countDocuments(match),
    ]);

    return { items, total, page, numero_items: limit };
  }

  async toggleNovedad(id: string, user: User) {
    this.assertCarretera(user);
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('No encontrado');
    const doc = await this.novedadModel.findOne({
      _id: id,
      enterprise_id: user.enterprise_id,
    });
    if (!doc) throw new NotFoundException('No encontrado');
    doc.estado = !doc.estado;
    await doc.save();
    return doc.toJSON();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REINTENTO MANUAL (cron o botón UI) para registros pending/failed/partial
  // ═══════════════════════════════════════════════════════════════════════════

  async retrySalidas(user: User) {
    this.assertCarretera(user);
    const pending = await this.salidaModel
      .find({ enterprise_id: user.enterprise_id, sync_status: { $in: ['pending', 'failed'] } })
      .limit(50)
      .lean();

    for (const doc of pending) {
      // Re-hidratar como documento para llamar syncSalida
      const fullDoc = await this.salidaModel.findById(doc._id);
      if (fullDoc) await this.syncSalida(fullDoc, user).catch(() => {});
    }

    return { retried: pending.length };
  }

  async retryLlegadas(user: User) {
    this.assertCarretera(user);
    const pending = await this.llegadaModel
      .find({ enterprise_id: user.enterprise_id, sync_status: { $in: ['pending', 'failed', 'partial'] } })
      .limit(50)
      .lean();

    for (const doc of pending) {
      const fullDoc = await this.llegadaModel.findById(doc._id);
      if (fullDoc) await this.syncLlegada(fullDoc, user).catch(() => {});
    }

    return { retried: pending.length };
  }

  async retryNovedades(user: User) {
    this.assertCarretera(user);
    const pending = await this.novedadModel
      .find({ enterprise_id: user.enterprise_id, sync_status: { $in: ['pending', 'failed', 'partial'] } })
      .limit(50)
      .lean();

    for (const doc of pending) {
      const fullDoc = await this.novedadModel.findById(doc._id);
      if (fullDoc) await this.syncNovedad(fullDoc, user).catch(() => {});
    }

    return { retried: pending.length };
  }
}
