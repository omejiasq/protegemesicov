import { Injectable, NotFoundException, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Maintenance, MaintenanceDocument } from '../schema/maintenance.schema';
import { ExternalApiService } from '../libs/external-api';

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
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectModel(Maintenance.name)
    private readonly model: Model<MaintenanceDocument>,
    @Optional() private readonly externalApi?: ExternalApiService,
  ) {}

  private tenant(user?: UserCtx): FilterQuery<MaintenanceDocument> {
    if (user?.enterprise_id) return { enterprise_id: user.enterprise_id };
    return { enterprise_id: '__none__' };
  }

  async create(data: CreateMaintenanceInput) {
    const doc = await this.model.create({ ...data, estado: true });

    // Integración externa (no bloquea el éxito local)
    if (this.externalApi) {
      (async () => {
        try {
          const base = await this.externalApi!.crearMantenimientoBase(doc.placa, data.tipoId);
          const externalId = base?.data?.id ?? (base as any)?.id;
          if (externalId) {
            await this.model.updateOne({ _id: doc._id }, { $set: { externalId } });
          }
        } catch (err) {
          this.logger.warn(
            `Integración externa (mantenimiento base) falló: ${(err as any)?.message || err}`,
          );
        }
      })();
    }

    return doc.toJSON();
  }

  async list(q: ListMaintenanceQuery, user?: UserCtx) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(q.numero_items ?? 10)));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<MaintenanceDocument> = { ...this.tenant(user) };
    if (q.tipoId) filter.tipoId = q.tipoId;
    if (q.placa) filter.placa = q.placa.trim();
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
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Maintenance not found');
    const doc = await this.model
      .findOne({ _id: id, ...this.tenant(user) })
      .lean({ getters: true });
    if (!doc) throw new NotFoundException('Maintenance not found');
    return doc;
  }

  async updateById(id: string, data: UpdateMaintenanceInput, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Maintenance not found');
    const doc = await this.model
      .findOneAndUpdate({ _id: id, ...this.tenant(user) }, { $set: data }, { new: true })
      .lean({ getters: true });
    if (!doc) throw new NotFoundException('Maintenance not found');
    return doc;
  }

  async toggleState(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Maintenance not found');
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
      { $group: { _id: '$placa', estado: { $first: '$estado' }, lastAt: { $first: '$createdAt' } } },
      { $project: { _id: 0, placa: '$_id', estado: 1, lastAt: 1 } },
      { $sort: { placa: 1 } },
    ]);

    return { items: rows };
  }
}
