import {
  BadRequestException,
  Injectable,
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
     * 🔥 ALISTAMIENTO → SICOV PRIMERO
     */
    if (dto.tipoId === 3) {
      let externalId: string;

      try {
        const res = await this.external.guardarMantenimiento({
          placa: dto.placa,
          tipoId: dto.tipoId,
          vigiladoId: String(vigiladoId),
          vigiladoToken,
        });

        externalId =
          res?.data?.id ??
          res?.data?.mantenimientoId ??
          null;

        if (!externalId) {
          throw new Error('SICOV no retornó mantenimientoId');
        }
      } catch {
        throw new ConflictException(
          'No fue posible crear mantenimiento de alistamiento en SICOV',
        );
      }

      const local = await this.model.create({
        placa: dto.placa?.trim(),
        tipoId: dto.tipoId,
        enterprise_id: user?.enterprise_id,
        createdBy: user?.sub,
        vigiladoId,
        externalId: String(externalId),
      });

      return {
        doc: local.toJSON(),
        externalId,
      };
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
    });

    let externalIdFromExternal: string | null = null;

    const call = this.external
      .guardarMantenimiento({
        placa: dto.placa,
        tipoId: dto.tipoId,
        vigiladoId: String(vigiladoId),
        vigiladoToken,
      })
      .then(async (res) => {
        const extId =
          res?.data?.id ??
          res?.data?.mantenimientoId ??
          null;

        if (extId) {
          externalIdFromExternal = String(extId);
          await this.model.updateOne(
            { _id: local._id },
            { $set: { externalId: externalIdFromExternal } },
          );
        }
      })
      .catch(() => {});

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
