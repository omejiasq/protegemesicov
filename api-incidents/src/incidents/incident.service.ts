import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types  } from 'mongoose';
import { Incident, IncidentDocument } from '../schema/incidents.schema';

export interface CreateIncidentInput {
  idDespacho: number;
  tipoNovedadId: 1 | 2;
  descripcion: string;
  otros?: string;
  enterprise_id?: string;
  createdBy?: string;
}

export interface UpdateIncidentInput {
  descripcion?: string;
  otros?: string;
  tipoNovedadId?: 1 | 2;
  estado?: boolean;
}

export interface ListIncidentsQuery {
  page?: number; 
  numero_items?: number; 
  find?: string; 
  idDespacho?: number; 
  estado?: boolean; 
}

type UserCtx = { enterprise_id?: string };

@Injectable()
export class IncidentsService {
  constructor(
    @InjectModel(Incident.name)
    private readonly incidentModel: Model<IncidentDocument>,
  ) {}

  private tenantFilter(user?: UserCtx): FilterQuery<IncidentDocument> {
    if (user?.enterprise_id) return { enterprise_id: user.enterprise_id };
    return { enterprise_id: '__none__' };
  }


  async list(q: ListIncidentsQuery, user?: UserCtx) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(q.numero_items ?? 10)));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IncidentDocument> = { ...this.tenantFilter(user) };

    if (q.find?.trim()) filter.$text = { $search: q.find.trim() };
    if (typeof q.idDespacho === 'number') filter.idDespacho = q.idDespacho;
    if (typeof q.estado === 'boolean') filter.estado = q.estado;

    const [items, total] = await Promise.all([
      this.incidentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean({ getters: true }),
      this.incidentModel.countDocuments(filter),
    ]);

    return { page, numero_items: limit, total, items };
  }

  async create(data: CreateIncidentInput) {
    const doc = await this.incidentModel.create({
      ...data,
      estado: true,
    });
    return doc.toJSON();
  }

  async getById(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Incident not found');
    const filter: FilterQuery<IncidentDocument> = {
      _id: new Types.ObjectId(id),
      ...this.tenantFilter(user),
    };
    const doc = await this.incidentModel.findOne(filter).lean({ getters: true });
    if (!doc) throw new NotFoundException('Incident not found');
    return doc;
  }

  async update(id: string, data: any, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Incident not found');
    const filter: FilterQuery<IncidentDocument> = {
      _id: new Types.ObjectId(id),
      ...this.tenantFilter(user),
    };
    const doc = await this.incidentModel
      .findOneAndUpdate(filter, { $set: data }, { new: true })
      .lean({ getters: true });
    if (!doc) throw new NotFoundException('Incident not found');
    return doc;
  }

  async toggleState(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Incident not found');
    const filter: FilterQuery<IncidentDocument> = {
      _id: new Types.ObjectId(id),
      ...this.tenantFilter(user),
    };
    const current = await this.incidentModel.findOne(filter);
    if (!current) throw new NotFoundException('Incident not found');
    current.estado = !current.estado;
    await current.save();
    return current.toJSON();
  }
}
