// src/incidentsDriver/incidentsDriver.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { IncidentDriver, IncidentDriverDocument } from '../schema/incidentsDriver.schema';

type UserCtx = { enterprise_id?: string };

@Injectable()
export class IncidentsDriverService {
  constructor(
    @InjectModel(IncidentDriver.name)
    private readonly model: Model<IncidentDriverDocument>,
  ) {}

  // 🔐 Siempre filtrar por la empresa del token
  private tenantFilter(user?: UserCtx): FilterQuery<IncidentDriverDocument> {
    if (user?.enterprise_id) return { enterprise_id: user.enterprise_id };
    // si no viene empresa en el token, no listamos nada
    return { enterprise_id: '__none__' };
  }

  /** Crear doc de conductor vinculado a un Incident */
  async createForIncident(incidentId: string, body: any, user?: UserCtx) {
    if (!Types.ObjectId.isValid(incidentId)) {
      throw new BadRequestException('incidentId inválido');
    }
    const toDate = (v?: string) => (v ? new Date(v) : undefined);

    const doc = await this.model.create({
      // vínculo
      incidentId: new Types.ObjectId(incidentId),
      // 🔐 empresa del token
      enterprise_id: user?.enterprise_id,
      // opcional externo
      novedadIdExterno: body.novedadIdExterno,

      // datos conductor
      tipoIdentificacionConductor: body.tipoIdentificacionConductor,
      numeroIdentificacion: body.numeroIdentificacion,
      primerNombreConductor: body.primerNombreConductor,
      segundoNombreConductor: body.segundoNombreConductor,
      primerApellidoConductor: body.primerApellidoConductor,
      segundoApellidoConductor: body.segundoApellidoConductor,

      idPruebaAlcoholimetria: body.idPruebaAlcoholimetria,
      resultadoPruebaAlcoholimetria: body.resultadoPruebaAlcoholimetria,
      fechaUltimaPruebaAlcoholimetria: toDate(body.fechaUltimaPruebaAlcoholimetria),

      licenciaConduccion: body.licenciaConduccion,

      idExamenMedico: body.idExamenMedico,
      fechaUltimoExamenMedico: toDate(body.fechaUltimoExamenMedico),

      observaciones: body.observaciones,
      estado: body.estado ?? true,
    });

    return doc.toJSON();
  }

  /** Listar con paginado + filtros básicos (SIEMPRE por enterprise_id) */
  async list(q: { page?: number; numero_items?: number; find?: string; estado?: boolean; incidentId?: string; }, user?: UserCtx) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(q.numero_items ?? 10)));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IncidentDriverDocument> = { ...this.tenantFilter(user) };
    if (typeof q.estado === 'boolean') filter.estado = q.estado;

    if (q.incidentId) {
      if (!Types.ObjectId.isValid(q.incidentId)) throw new BadRequestException('incidentId inválido');
      filter.incidentId = new Types.ObjectId(q.incidentId);
    }

    if (q.find?.trim()) {
      const text = q.find.trim();
      filter.$or = [
        { numeroIdentificacion: new RegExp(text, 'i') },
        { primerNombreConductor: new RegExp(text, 'i') },
        { primerApellidoConductor: new RegExp(text, 'i') },
        { observaciones: new RegExp(text, 'i') },
      ];
    }

    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean({ getters: true }),
      this.model.countDocuments(filter),
    ]);

    return { page, numero_items: limit, total, items };
  }

  /** Obtener por ID (restringido a enterprise_id) */
  async getById(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id inválido');
    const filter: FilterQuery<IncidentDriverDocument> = { _id: new Types.ObjectId(id), ...this.tenantFilter(user) };
    const doc = await this.model.findOne(filter).lean({ getters: true });
    if (!doc) throw new NotFoundException('Driver incident no encontrado');
    return doc;
  }

  /** Actualizar por ID (solo campos presentes, restringido a enterprise_id) */
  async updateById(id: string, body: any, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id inválido');
    const toDate = (v?: string) => (v ? new Date(v) : undefined);

    const $set: any = {};
    const assign = (k: string, v: any) => { if (v !== undefined) $set[k] = v; };

    assign('tipoIdentificacionConductor', body.tipoIdentificacionConductor);
    assign('numeroIdentificacion', body.numeroIdentificacion);
    assign('primerNombreConductor', body.primerNombreConductor);
    assign('segundoNombreConductor', body.segundoNombreConductor);
    assign('primerApellidoConductor', body.primerApellidoConductor);
    assign('segundoApellidoConductor', body.segundoApellidoConductor);

    assign('idPruebaAlcoholimetria', body.idPruebaAlcoholimetria);
    assign('resultadoPruebaAlcoholimetria', body.resultadoPruebaAlcoholimetria);
    assign('fechaUltimaPruebaAlcoholimetria', toDate(body.fechaUltimaPruebaAlcoholimetria));

    assign('licenciaConduccion', body.licenciaConduccion);

    assign('idExamenMedico', body.idExamenMedico);
    assign('fechaUltimoExamenMedico', toDate(body.fechaUltimoExamenMedico));

    assign('observaciones', body.observaciones);
    if (typeof body.estado === 'boolean') assign('estado', body.estado);

    const filter: FilterQuery<IncidentDriverDocument> = { _id: new Types.ObjectId(id), ...this.tenantFilter(user) };

    const doc = await this.model
      .findOneAndUpdate(filter, { $set }, { new: true })
      .lean({ getters: true });

    if (!doc) throw new NotFoundException('Driver incident no encontrado');
    return doc;
  }

  /** Toggle estado (restringido a enterprise_id) */
  async toggleState(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id inválido');

    const current = await this.model.findOne({ _id: new Types.ObjectId(id), ...this.tenantFilter(user) });
    if (!current) throw new NotFoundException('Driver incident no encontrado');

    current.estado = !current.estado;
    await current.save();
    return current.toJSON();
  }
}
