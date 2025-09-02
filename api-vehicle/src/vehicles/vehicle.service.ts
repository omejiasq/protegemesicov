import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Vehicle, VehicleDocument } from '../schema/vehicle.schema';

type UserCtx = { enterprise_id?: string; sub?: string };

@Injectable()
export class VehiclesService {
  constructor(
    @InjectModel(Vehicle.name)
    private readonly model: Model<VehicleDocument>,
  ) {}

  private tenant(user?: UserCtx): FilterQuery<VehicleDocument> {
    return { enterprise_id: user?.enterprise_id };
  }

  private parseDate(d?: string | Date) {
    if (!d) return undefined;
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? undefined : dt;
  }

  async create(body: any, user?: UserCtx) {
    // evitar duplicados: placa única por tenant
    const exists = await this.model.exists({ placa: body.placa, ...this.tenant(user) });
    if (exists) throw new ConflictException('La placa ya existe en este tenant');

    const doc = await this.model.create({
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      estado: true,
      placa: body.placa,
      clase: Number(body.clase),
      nivelServicio: Number(body.nivelServicio),
      soat: body.soat,
      fechaVencimientoSoat: this.parseDate(body.fechaVencimientoSoat),
      revisionTecnicoMecanica: body.revisionTecnicoMecanica,
      fechaRevisionTecnicoMecanica: this.parseDate(body.fechaRevisionTecnicoMecanica),
      idPolizas: body.idPolizas,
      tipoPoliza: body.tipoPoliza,
      vigencia: this.parseDate(body.vigencia),
      tarjetaOperacion: body.tarjetaOperacion,
      fechaTarjetaOperacion: this.parseDate(body.fechaTarjetaOperacion),
    });

    return doc.toJSON();
  }

  async getAll(q: any, user?: UserCtx) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.numero_items) || 10));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<VehicleDocument> = { ...this.tenant(user) };
    if (q.placa) filter.placa = { $regex: q.placa, $options: 'i' };
    if (q.clase != null) filter.clase = Number(q.clase);
    if (q.nivelServicio != null) filter.nivelServicio = Number(q.nivelServicio);
    if (q.estado != null) filter.estado = q.estado === 'true' || q.estado === true;

    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return { page, numero_items: limit, total, items };
  }

  async getById(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Vehículo no encontrado');
    const item = await this.model.findOne({ _id: new Types.ObjectId(id), ...this.tenant(user) }).lean();
    if (!item) throw new NotFoundException('Vehículo no encontrado');
    return item;
  }

  async updateById(id: string, body: any, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Vehículo no encontrado');

    // si cambia placa, validar unicidad por tenant
    if (body.placa) {
      const dup = await this.model.exists({
        _id: { $ne: new Types.ObjectId(id) },
        placa: body.placa,
        ...this.tenant(user),
      });
      if (dup) throw new ConflictException('Ya existe un vehículo con esa placa en este tenant');
    }

    const update: any = {
      ...(body.placa && { placa: body.placa }),
      ...(body.clase != null && { clase: Number(body.clase) }),
      ...(body.nivelServicio != null && { nivelServicio: Number(body.nivelServicio) }),
      ...(body.soat != null && { soat: body.soat }),
      ...(body.fechaVencimientoSoat != null && { fechaVencimientoSoat: this.parseDate(body.fechaVencimientoSoat) }),
      ...(body.revisionTecnicoMecanica != null && { revisionTecnicoMecanica: body.revisionTecnicoMecanica }),
      ...(body.fechaRevisionTecnicoMecanica != null && { fechaRevisionTecnicoMecanica: this.parseDate(body.fechaRevisionTecnicoMecanica) }),
      ...(body.idPolizas != null && { idPolizas: body.idPolizas }),
      ...(body.tipoPoliza != null && { tipoPoliza: body.tipoPoliza }),
      ...(body.vigencia != null && { vigencia: this.parseDate(body.vigencia) }),
      ...(body.tarjetaOperacion != null && { tarjetaOperacion: body.tarjetaOperacion }),
      ...(body.fechaTarjetaOperacion != null && { fechaTarjetaOperacion: this.parseDate(body.fechaTarjetaOperacion) }),
    };

    const updated = await this.model.findOneAndUpdate(
      { _id: new Types.ObjectId(id), ...this.tenant(user) },
      { $set: update },
      { new: true },
    ).lean();

    if (!updated) throw new NotFoundException('Vehículo no encontrado');
    return updated;
  }

  async toggleState(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Vehículo no encontrado');

    const current = await this.model.findOne({ _id: new Types.ObjectId(id), ...this.tenant(user) });
    if (!current) throw new NotFoundException('Vehículo no encontrado');

    current.estado = !current.estado;
    await current.save();
    return { _id: current._id, estado: current.estado };
  }
}