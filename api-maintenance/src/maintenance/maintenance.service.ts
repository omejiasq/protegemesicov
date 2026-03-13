import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import {
  Maintenance,
  MaintenanceDocument,
} from '../schema/maintenance.schema';
import { MaintenanceExternalApiService } from 'src/libs/external-api';

type UserCtx = { enterprise_id?: string };

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectModel(Maintenance.name)
    private readonly model: Model<MaintenanceDocument>,
    private readonly external: MaintenanceExternalApiService,
  ) {}

  // ======================================================
  // Helpers
  // ======================================================
  private tenant(user?: UserCtx): FilterQuery<MaintenanceDocument> {
    if (user?.enterprise_id) return { enterprise_id: user.enterprise_id };
    return { enterprise_id: '__none__' };
  }

  private resolveVigiladoId(user?: any, dto?: any): number {
    const raw =
      user?.vigiladoId ??
      user?.vigiladId ??
      dto?.vigiladoId ??
      process.env.SICOV_VIGILADO_ID;

    const vigiladoId = Number(raw);

    if (!vigiladoId || isNaN(vigiladoId)) {
      throw new BadRequestException(
        `vigiladoId inválido o ausente. Valor recibido: ${raw}`,
      );
    }

    return vigiladoId;
  }

  // ======================================================
  // CREATE
  // ======================================================
  async create(
    dto: { placa: string; tipoId: 1 | 2 | 3 | 4; vigiladoId?: number | string },
    user?: {
      enterprise_id?: string;
      sub?: string;
      vigiladoId?: number | string;
      vigiladoToken?: string;
    },
    opts?: { awaitExternal?: boolean },
  ) {
    const vigiladoId = this.resolveVigiladoId(user, dto);

    const vigiladoToken =
      (user as any)?.vigiladoToken ??
      (user as any)?.tokenVigilado ??
      (user as any)?.vigilado_token ??
      undefined;

    /**
     * 🔥 ALISTAMIENTO → intenta SICOV primero; si está caído, guarda local
     *    y retorna sicovDown:true para que el llamador encole el reintento.
     *    Si demoMode=true, omite SICOV completamente (solo guarda local).
     */
    if (dto.tipoId === 3) {
      let externalId: string | null = null;
      let sicovDown = false;

      // Demo mode: no llamar a SICOV, guardar solo local
      if ((user as any)?.demoMode) {
        const local = await this.model.create({
          placa: dto.placa?.trim(),
          tipoId: dto.tipoId,
          enterprise_id: user?.enterprise_id,
          createdBy: user?.sub,
          vigiladoId,
          sicov_sync_status: 'demo',
        });
        return { doc: local.toJSON(), externalId: null, sicovDown: false, demoMode: true };
      }

      try {
        const res = await this.external.guardarMantenimiento({
          placa: dto.placa,
          tipoId: dto.tipoId,
          vigiladoId: String(vigiladoId),
          vigiladoToken,
        });

        externalId =
          (res as any)?.data?.id ??
          (res as any)?.data?.mantenimientoId ??
          null;

        if (!externalId) {
          throw new Error('SICOV no retornó mantenimientoId');
        }

        // Indicar si se recuperó una transacción huérfana (409)
        if ((res as any)?.orphanRecovered) {
          this.logger.warn(
            `[CREATE] Transacción huérfana recuperada: placa=${dto.placa} ` +
            `tipoId=${dto.tipoId} externalId=${externalId}`,
          );
        }
      } catch {
        sicovDown = true;
      }

      const local = await this.model.create({
        placa: dto.placa?.trim(),
        tipoId: dto.tipoId,
        enterprise_id: user?.enterprise_id,
        createdBy: user?.sub,
        vigiladoId,
        externalId: externalId ? String(externalId) : undefined,
        sicov_sync_status: sicovDown ? 'pending' : 'synced',
      });

      return {
        doc: local.toJSON(),
        externalId,
        sicovDown,
      };
    }

    /**
     * 🔵 CORRECTIVO / PREVENTIVO — demo mode: solo guarda local
     */
    if ((user as any)?.demoMode) {
      const local = await this.model.create({
        placa: dto.placa?.trim(),
        tipoId: dto.tipoId,
        enterprise_id: user?.enterprise_id,
        createdBy: user?.sub,
        vigiladoId,
        sicov_sync_status: 'demo',
      });
      return { doc: local.toJSON(), externalId: null, sicovDown: false, demoMode: true };
    }

    /**
     * 🔵 CORRECTIVO / PREVENTIVO (COMO ANTES)
     */
    const local = await this.model.create({
      placa: dto.placa?.trim(),
      tipoId: dto.tipoId,
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      vigiladoId,
      sicov_sync_status: 'pending',
    });

    let externalIdFromExternal: string | null = null;
    let sicovDown = false;

    const call = this.external
      .guardarMantenimiento({
        placa: dto.placa,
        tipoId: dto.tipoId,
        vigiladoId: String(vigiladoId),
        vigiladoToken,
      })
      .then(async (res) => {
        const extId =
          (res as any)?.data?.id ??
          (res as any)?.data?.mantenimientoId ??
          null;

        if (extId) {
          externalIdFromExternal = String(extId);
          await this.model.updateOne(
            { _id: local._id },
            { $set: { externalId: externalIdFromExternal, sicov_sync_status: 'synced' } },
          );

          if ((res as any)?.orphanRecovered) {
            this.logger.warn(
              `[CREATE] Transacción huérfana recuperada (tipo ${dto.tipoId}): ` +
              `placa=${dto.placa} externalId=${externalIdFromExternal}`,
            );
          }
        }
      })
      .catch(() => {
        sicovDown = true;
      });

    if (opts?.awaitExternal) {
      await call;
    } else {
      void call;
    }

    const out = await this.model.findById(local._id).lean();

    if (externalIdFromExternal && out && !(out as any).externalId) {
      (out as any).externalId = externalIdFromExternal;
    }

    return {
      doc: out as any,
      externalId: externalIdFromExternal,
      sicovDown,
    };
  }

  // ======================================================
  // UPDATE (REQUERIDO POR CONTROLLER)
  // ======================================================
  async updateById(id: string, data: any, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Maintenance not found');

    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, ...this.tenant(user) },
        { $set: data },
        { new: true },
      )
      .lean();

    if (!doc) throw new NotFoundException('Maintenance not found');
    return doc;
  }

  // ======================================================
  // TOGGLE STATE (REQUERIDO POR CONTROLLER)
  // ======================================================
  async toggleState(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Maintenance not found');

    const current = await this.model.findOne({
      _id: id,
      ...this.tenant(user),
    });

    if (!current) throw new NotFoundException('Maintenance not found');

    current.estado = !current.estado;
    await current.save();

    return current.toJSON();
  }

  // ======================================================
  // LIST
  // ======================================================
  async list(q: any, user?: UserCtx) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(q.numero_items ?? 10)));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<MaintenanceDocument> = {
      ...this.tenant(user),
    };

    if (q.tipoId) filter.tipoId = q.tipoId;

    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return { page, numero_items: limit, total, items };
  }

  async getById(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Maintenance not found');

    const doc = await this.model
      .findOne({ _id: id, ...this.tenant(user) })
      .lean();

    if (!doc) throw new NotFoundException('Maintenance not found');
    return doc;
  }
}
