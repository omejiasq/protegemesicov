import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Maintenance, MaintenanceDocument } from '../schema/maintenance.schema';
import { MaintenanceExternalApiService } from 'src/libs/external-api';

type UserCtx = { enterprise_id?: string };

export interface CreateMaintenanceInput {
  tipoId: 1 | 2 | 3 | 4;
  placa: string;
  vigiladoId?: number;
  enterprise_id?: string;
  createdBy?: string;
}
export interface UpdateMaintenanceInput {
  tipoId?: 1 | 2 | 3 | 4;
  placa?: string;
  vigiladoId?: number;
  estado?: boolean;
}
export interface ListMaintenanceQuery {
  page?: number;
  numero_items?: number;
  tipoId?: 1 | 2 | 3 | 4;
  placa?: string;
  estado?: boolean;
}

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectModel(Maintenance.name)
    private readonly model: Model<MaintenanceDocument>,
    private readonly external: MaintenanceExternalApiService,
  ) {}

  private tenant(user?: UserCtx): FilterQuery<MaintenanceDocument> {
    if (user?.enterprise_id) return { enterprise_id: user.enterprise_id };
    return { enterprise_id: '__none__' };
  }

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
    // ... tu validación de vigiladoId y creación local
    const local = await this.model.create({
      placa: dto.placa?.trim(),
      tipoId: dto.tipoId,
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      vigiladoId: Number(user?.vigiladoId ?? dto?.vigiladoId),
    });

    // --- NUEVO: variable para capturar el id externo
    let externalIdFromExternal: string | null = null;

    // preparar headers
    const vigiladoIdStr = String(user?.vigiladoId ?? dto?.vigiladoId);
    const vigiladoToken =
      (user as any)?.vigiladoToken ??
      (user as any)?.tokenVigilado ??
      (user as any)?.vigilado_token ??
      undefined;

    // disparo a la API externa
    const call = this.external
      .guardarMantenimiento({
        placa: dto.placa,
        tipoId: dto.tipoId,
        vigiladoId: vigiladoIdStr,
        vigiladoToken,
      })
      .then(async (res) => {
        // tomar el id externo con claves comunes
        const extId =
          (res?.ok &&
            (res?.data?.id ??
              res?.data?.mantenimientoId ??
              res?.data?.Id ??
              res?.data?.ID ??
              res?.data?.data?.id ??
              res?.data?.data?.mantenimientoId)) ||
          null;

        // guardar en variable para devolverlo
        externalIdFromExternal = extId ? String(extId) : null;

        // opcional: persistir en tu doc si el schema lo tiene
        if (externalIdFromExternal) {
          await this.model.updateOne(
            { _id: local._id },
            { $set: { externalId: externalIdFromExternal } },
          );
        }
      })
      .catch(() => {
        /* no relanzar: local ya quedó */
      });

    // si el caller necesita el id externo YA, esperá acá
    if (opts?.awaitExternal) {
      await call;
    } else {
      void call;
    }

    // re-leer el doc y anexar el externalId capturado (aunque no esté en schema)
    const out = await this.model.findById(local._id).lean();

    // si lo querés adjuntar al doc por conveniencia en runtime, no cambia el tipo TS:
    if (externalIdFromExternal && out && !(out as any).externalId) {
      (out as any).externalId = externalIdFromExternal;
    }

    // 🔸 NUEVO: devolvemos forma tipada y explícita
    return {
      doc: out as any,
      externalId: externalIdFromExternal, // string | null
    };
  }

  async list(q: ListMaintenanceQuery, user?: UserCtx) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(q.numero_items ?? 10)));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<MaintenanceDocument> = { ...this.tenant(user) };
    if (q.tipoId) filter.tipoId = q.tipoId;
    if (q.placa && typeof q.placa === 'string') {
      const raw = q.placa.trim();
      if (raw) {
        const esc = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape seguro
        filter.placa = { $regex: '^' + esc, $options: 'i' };
      }
    }
    if (typeof q.estado === 'boolean') filter.estado = q.estado;

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean({ getters: true }),
      this.model.countDocuments(filter),
    ]);
    return { page, numero_items: limit, total, items };
  }

  async getById(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Maintenance not found');
    const doc = await this.model
      .findOne({ _id: id, ...this.tenant(user) })
      .lean({ getters: true });
    if (!doc) throw new NotFoundException('Maintenance not found');
    return doc;
  }

  async updateById(id: string, data: UpdateMaintenanceInput, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Maintenance not found');
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, ...this.tenant(user) },
        { $set: data },
        { new: true },
      )
      .lean({ getters: true });
    if (!doc) throw new NotFoundException('Maintenance not found');
    return doc;
  }

  async toggleState(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Maintenance not found');
    const current = await this.model.findOne({ _id: id, ...this.tenant(user) });
    if (!current) throw new NotFoundException('Maintenance not found');
    current.estado = !current.estado;
    await current.save();
    return current.toJSON();
  }

  async listPlates(
    q: { tipoId: 1 | 2 | 3 | 4; vigiladoId: number; search?: string },
    user?: { enterprise_id?: string },
  ) {
    const filter: any = {
      enterprise_id: user?.enterprise_id,
      tipoId: q.tipoId,
      vigiladoId: q.vigiladoId,
    };

    if (q.search) {
      filter.placa = { $regex: `^${q.search}`, $options: 'i' };
    }

    const rows = await this.model.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$placa',
          estado: { $first: '$estado' },
          lastAt: { $first: '$createdAt' },
        },
      },
      { $project: { _id: 0, placa: '$_id', estado: 1, lastAt: 1 } },
      { $sort: { placa: 1 } },
    ]);

    return { items: rows };
  }
}
