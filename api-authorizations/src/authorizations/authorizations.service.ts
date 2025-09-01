import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { Authorization, AuthorizationDocument } from '../schema/authorizations.schema';

export interface CreateAuthorizationInput {
  vigiladoId: number;
  placa: string;
  fecha?: Date | string;
  detalleActividades?: string;
  enterprise_id?: string;
  createdBy?: string;
}

export interface UpdateAuthorizationInput {
  placa?: string;
  fecha?: Date | string;
  detalleActividades?: string;
  estado?: boolean;
}

export interface ListAuthorizationQuery {
  page?: number;
  numero_items?: number;
  placa?: string;
  vigiladoId?: number;
  estado?: boolean;
}

type UserCtx = { enterprise_id?: string };

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectModel(Authorization.name)
    private readonly model: Model<AuthorizationDocument>,
  ) {}

  private tenantFilter(user?: UserCtx): FilterQuery<AuthorizationDocument> {
    if (user?.enterprise_id) return { enterprise_id: user.enterprise_id };
    return { enterprise_id: '__none__' };
  }

  async create(data: CreateAuthorizationInput) {
    const payload: any = { ...data };
    if (typeof payload.fecha === 'string') payload.fecha = new Date(payload.fecha);
    const doc = await this.model.create({ ...payload, estado: true });
    return doc.toJSON();
  }

  async list(q: ListAuthorizationQuery, user?: UserCtx) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(q.numero_items ?? 10)));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<AuthorizationDocument> = { ...this.tenantFilter(user) };
    if (q.placa) filter.placa = q.placa;
    if (typeof q.vigiladoId === 'number') filter.vigiladoId = q.vigiladoId;
    if (typeof q.estado === 'boolean') filter.estado = q.estado;

    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean({ getters: true }),
      this.model.countDocuments(filter),
    ]);

    return { page, numero_items: limit, total, items };
  }

  async getById(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Authorization not found');
    const filter: FilterQuery<AuthorizationDocument> = { _id: new Types.ObjectId(id), ...this.tenantFilter(user) };
    const doc = await this.model.findOne(filter).lean({ getters: true });
    if (!doc) throw new NotFoundException('Authorization not found');
    return doc;
  }

  async update(id: string, data: UpdateAuthorizationInput, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Authorization not found');
    const filter: FilterQuery<AuthorizationDocument> = { _id: new Types.ObjectId(id), ...this.tenantFilter(user) };
    const payload: any = { ...data };
    if (typeof payload.fecha === 'string') payload.fecha = new Date(payload.fecha);
    const doc = await this.model.findOneAndUpdate(filter, { $set: payload }, { new: true }).lean({ getters: true });
    if (!doc) throw new NotFoundException('Authorization not found');
    return doc;
  }

  async toggleState(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Authorization not found');
    const filter: FilterQuery<AuthorizationDocument> = { _id: new Types.ObjectId(id), ...this.tenantFilter(user) };
    const current = await this.model.findOne(filter);
    if (!current) throw new NotFoundException('Authorization not found');
    current.estado = !current.estado;
    await current.save();
    return current.toJSON();
  }
}