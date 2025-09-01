import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { IncidentVehicle, IncidentVehicleDocument } from '../schema/incidentsVehicle.schema';

type UserCtx = { enterprise_id?: string };

@Injectable()
export class IncidentsVehicleService {
  constructor(
    @InjectModel(IncidentVehicle.name)
    private readonly model: Model<IncidentVehicleDocument>,
  ) {}

  private tenantFilter(user?: UserCtx): FilterQuery<IncidentVehicleDocument> {
    if (user?.enterprise_id) return { enterprise_id: user.enterprise_id };
    return { enterprise_id: '__none__' };
  }

  async createForIncident(incidentId: string, body: any, user?: UserCtx) {
    if (!Types.ObjectId.isValid(incidentId)) {
      throw new BadRequestException('incidentId inválido');
    }
    const toDate = (v?: string) => (v ? new Date(v) : undefined);

    const doc = await this.model.create({
      incidentId: new Types.ObjectId(incidentId),
      enterprise_id: user?.enterprise_id,

      novedadIdExterno: body.novedadIdExterno,

      placa: body.placa,
      soat: body.soat,
      fechaVencimientoSoat: toDate(body.fechaVencimientoSoat),

      revisionTecnicoMecanica: body.revisionTecnicoMecanica,
      fechaRevisionTecnicoMecanica: toDate(body.fechaRevisionTecnicoMecanica),

      idPolizas: body.idPolizas,
      tipoPoliza: body.tipoPoliza,
      vigencia: toDate(body.vigencia),

      tarjetaOperacion: body.tarjetaOperacion,
      fechaTarjetaOperacion: toDate(body.fechaTarjetaOperacion),

      idMantenimiento: body.idMantenimiento,
      fechaMantenimiento: toDate(body.fechaMantenimiento),

      idProtocoloAlistamientoDiario: body.idProtocoloAlistamientoDiario,
      fechaProtocoloAlistamientoDiario: toDate(body.fechaProtocoloAlistamientoDiario),

      observaciones: body.observaciones,
      clase: body.clase,
      nivelServicio: body.nivelServicio,
      estado: body.estado ?? true,
    });

    return doc.toJSON();
  }

  async list(q: { page?: number; numero_items?: number; find?: string; estado?: boolean; incidentId?: string; }, user?: UserCtx) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(q.numero_items ?? 10)));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IncidentVehicleDocument> = { ...this.tenantFilter(user) };
    if (typeof q.estado === 'boolean') filter.estado = q.estado;

    if (q.incidentId) {
      if (!Types.ObjectId.isValid(q.incidentId)) throw new BadRequestException('incidentId inválido');
      filter.incidentId = new Types.ObjectId(q.incidentId);
    }

    if (q.find?.trim()) {
      const text = q.find.trim();
      filter.$or = [
        { placa: new RegExp(text, 'i') },
        { observaciones: new RegExp(text, 'i') },
      ];
    }

    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean({ getters: true }),
      this.model.countDocuments(filter),
    ]);

    return { page, numero_items: limit, total, items };
  }

  async getById(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id inválido');
    const filter: FilterQuery<IncidentVehicleDocument> = { _id: new Types.ObjectId(id), ...this.tenantFilter(user) };
    const doc = await this.model.findOne(filter).lean({ getters: true });
    if (!doc) throw new NotFoundException('Vehicle incident no encontrado');
    return doc;
  }

  async updateById(id: string, body: any, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id inválido');
    const toDate = (v?: string) => (v ? new Date(v) : undefined);

    const $set: any = {};
    const assign = (k: string, v: any) => { if (v !== undefined) $set[k] = v; };

    assign('placa', body.placa);
    assign('soat', body.soat);
    assign('fechaVencimientoSoat', toDate(body.fechaVencimientoSoat));

    assign('revisionTecnicoMecanica', body.revisionTecnicoMecanica);
    assign('fechaRevisionTecnicoMecanica', toDate(body.fechaRevisionTecnicoMecanica));

    assign('idPolizas', body.idPolizas);
    assign('tipoPoliza', body.tipoPoliza);
    assign('vigencia', toDate(body.vigencia));

    assign('tarjetaOperacion', body.tarjetaOperacion);
    assign('fechaTarjetaOperacion', toDate(body.fechaTarjetaOperacion));

    assign('idMantenimiento', body.idMantenimiento);
    assign('fechaMantenimiento', toDate(body.fechaMantenimiento));

    assign('idProtocoloAlistamientoDiario', body.idProtocoloAlistamientoDiario);
    assign('fechaProtocoloAlistamientoDiario', toDate(body.fechaProtocoloAlistamientoDiario));

    assign('observaciones', body.observaciones);
    if (typeof body.clase === 'number') assign('clase', body.clase);
    if (typeof body.nivelServicio === 'number') assign('nivelServicio', body.nivelServicio);
    if (typeof body.estado === 'boolean') assign('estado', body.estado);

    const filter: FilterQuery<IncidentVehicleDocument> = { _id: new Types.ObjectId(id), ...this.tenantFilter(user) };

    const doc = await this.model
      .findOneAndUpdate(filter, { $set }, { new: true })
      .lean({ getters: true });

    if (!doc) throw new NotFoundException('Vehicle incident no encontrado');
    return doc;
  }

  async toggleState(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id inválido');

    const current = await this.model.findOne({ _id: new Types.ObjectId(id), ...this.tenantFilter(user) });
    if (!current) throw new NotFoundException('Vehicle incident no encontrado');

    current.estado = !current.estado;
    await current.save();
    return current.toJSON();
  }
}
