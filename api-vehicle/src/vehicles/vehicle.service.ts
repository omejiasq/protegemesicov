import { ConflictException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Vehicle, VehicleDocument } from '../schema/vehicle.schema';
import { VehicleExternalApiService } from '../libs/exteral-api';
import { AuditService } from '../libs/audit/audit.service';

type UserCtx = { enterprise_id?: string; sub?: string };

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectModel(Vehicle.name)
    private readonly model: Model<VehicleDocument>,
    private readonly external: VehicleExternalApiService,
    private readonly audit: AuditService,
  ) {}

  private tenant(user?: UserCtx): FilterQuery<VehicleDocument> {
    return { enterprise_id: user?.enterprise_id };
  }

  private parseDate(d?: string | Date) {
    if (!d) return undefined;
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? undefined : dt;
  }

  /* ============= helpers externos (audit local-only si falta data) ============= */

  private async tryCreateExternal(
    local: any,
    user?: UserCtx,
  ): Promise<{ mantenimientoId?: number | string; externalId?: number | string } | undefined> {
    const placa = local?.placa;
    const clase = Number.isFinite(Number(local?.clase)) ? Number(local.clase) : undefined;
    const nivelServicio = Number.isFinite(Number(local?.nivelServicio)) ? Number(local.nivelServicio) : undefined;

    const ctx = { userId: user?.sub, enterpriseId: user?.enterprise_id };

    if (!placa || clase == null || nivelServicio == null) {
      await this.audit.log({
        module: 'vehicles',
        operation: 'crearVehiculo.local-only',
        endpoint: 'internal',
        requestPayload: { placa, clase, nivelServicio },
        responseStatus: 200,
        responseBody: { reason: 'faltan campos mínimos para crear en externo' },
        success: true,
        userId: ctx.userId,
        enterpriseId: ctx.enterpriseId,
      });
      return;
    }

    const payload = {
      placa,
      clase,
      nivelServicio,
      soat: local?.soat,
      fechaVencimientoSoat: local?.fechaVencimientoSoat,
      revisionTecnicoMecanica: local?.revisionTecnicoMecanica,
      fechaRevisionTecnicoMecanica: local?.fechaRevisionTecnicoMecanica,
      idPolizas: local?.idPolizas,
      tipoPoliza: local?.tipoPoliza,
      vigencia: local?.vigencia,
      tarjetaOperacion: local?.tarjetaOperacion,
      fechaTarjetaOperacion: local?.fechaTarjetaOperacion,
    };

    const res = await this.external.crearVehiculo(payload, ctx);
    const data = res?.data ?? {};
    // trata de encontrar id en diferentes formas
    const externalId = data?.id ?? data?.vehiculoId ?? data?.data?.id ?? null;
    return externalId != null ? { externalId } : undefined;
  }

  private async tryUpdateExternal(
    externalId: string | number,
    local: any,
    user?: UserCtx,
  ): Promise<boolean> {
    const ctx = { userId: user?.sub, enterpriseId: user?.enterprise_id };
    try {
      const res = await this.external.actualizarVehiculo(String(externalId), {
        placa: local?.placa,
        clase: local?.clase != null ? Number(local.clase) : undefined,
        nivelServicio: local?.nivelServicio != null ? Number(local.nivelServicio) : undefined,
        soat: local?.soat,
        fechaVencimientoSoat: local?.fechaVencimientoSoat,
        revisionTecnicoMecanica: local?.revisionTecnicoMecanica,
        fechaRevisionTecnicoMecanica: local?.fechaRevisionTecnicoMecanica,
        idPolizas: local?.idPolizas,
        tipoPoliza: local?.tipoPoliza,
        vigencia: local?.vigencia,
        tarjetaOperacion: local?.tarjetaOperacion,
        fechaTarjetaOperacion: local?.fechaTarjetaOperacion,
      }, ctx);
      return !!res?.ok;
    } catch {
      return false;
    }
  }

  /* =============================== CRUD local + sync externo =============================== */

  async create(body: any, user?: UserCtx) {
    // evitar duplicados: placa única por tenant
    const exists = await this.model.exists({ placa: body.placa, ...this.tenant(user) });
    if (exists) throw new ConflictException('La placa ya existe en este tenant');

    const clase = Number.isFinite(Number(body.clase)) ? Number(body.clase) : undefined;
    const nivelServicio = Number.isFinite(Number(body.nivelServicio)) ? Number(body.nivelServicio) : undefined;
    const soat = (typeof body.soat === 'string' && body.soat.trim()) ? body.soat.trim() : undefined;

    const doc = await this.model.create({
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      estado: true,
      placa: body.placa,
      ...(clase !== undefined && { clase }),
      ...(nivelServicio !== undefined && { nivelServicio }),
      ...(soat !== undefined && { soat }),
      fechaVencimientoSoat: this.parseDate(body.fechaVencimientoSoat),
      revisionTecnicoMecanica: body.revisionTecnicoMecanica,
      fechaRevisionTecnicoMecanica: this.parseDate(body.fechaRevisionTecnicoMecanica),
      idPolizas: body.idPolizas,
      tipoPoliza: body.tipoPoliza,
      vigencia: this.parseDate(body.vigencia),
      tarjetaOperacion: body.tarjetaOperacion,
      fechaTarjetaOperacion: this.parseDate(body.fechaTarjetaOperacion),
    });

    // empujar al externo si hay datos mínimos
    try {
      const created = await this.tryCreateExternal(doc.toJSON(), user);
      if (created?.externalId != null) {
        await this.model.updateOne(
          { _id: doc._id },
          { $set: { externalId: Number(created.externalId) } },
        );
      }
    } catch {
      // la auditoría ya queda en el external; no bloquear
    }

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

    // sync externo si existe externalId o si ahora tenemos datos mínimos
    try {
      const hasExternalId = (updated as any).externalId != null;
      if (hasExternalId) {
        await this.tryUpdateExternal((updated as any).externalId, updated, user);
      } else {
        await this.tryCreateExternal(updated, user);
      }
    } catch {
      // audita el external, no romper
    }

    return updated;
  }

  async toggleState(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Vehículo no encontrado');

    const current = await this.model.findOne({ _id: new Types.ObjectId(id), ...this.tenant(user) });
    if (!current) throw new NotFoundException('Vehículo no encontrado');

    current.estado = !current.estado;
    await current.save();

    // intento toggle externo si existe externalId
    const extId = (current as any).externalId;
    if (extId != null) {
      try { await this.external.toggleVehiculo(String(extId), { userId: user?.sub, enterpriseId: user?.enterprise_id }); }
      catch { /* el external deja auditoría; no bloquear */ }
    }

    return { _id: current._id, estado: current.estado };
  }
}
