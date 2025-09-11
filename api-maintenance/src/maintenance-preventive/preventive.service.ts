import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PreventiveDetail,
  PreventiveDetailDocument,
} from '../schema/preventive.schema';
import { MaintenanceExternalApiService } from '../libs/external-api';

@Injectable()
export class PreventiveService {
  constructor(
    @InjectModel(PreventiveDetail.name)
    private readonly model: Model<PreventiveDetailDocument>,
    private readonly external: MaintenanceExternalApiService,
  ) {}

  async create(dto: any, user?: { enterprise_id?: string; sub?: string }) {
    // 1) Duplicados por placa + tenant
    const exists = await this.model.exists({
      placa: dto.placa,
      enterprise_id: user?.enterprise_id,
    });
    if (exists) {
      throw new ConflictException(
        'Ya existe un mantenimiento preventivo para esa placa',
      );
    }

    // 2) Asegurar mantenimientoId ANTES de crear (schema lo requiere)
    let mantenimientoId: string | null = dto.mantenimientoId || null;
    const vigiladoId = process.env.SICOV_VIGILADO_ID;

    if (!mantenimientoId) {
      const baseRes = await this.external.guardarMantenimiento({
        placa: dto.placa,
        tipoId: 1, // 1 = preventivo
        vigiladoId,
      });
      if (baseRes?.ok && baseRes.data?.id) {
        mantenimientoId = String(baseRes.data.id);
      } else {
        throw new ConflictException('No se pudo generar el mantenimiento base');
      }
    }

    // 3) Crear doc local con TODOS los campos requeridos (incl. mantenimientoId)
    const doc = await this.model.create({
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      placa: dto.placa,
      mantenimientoId, // 👈 requerido por el schema
      fecha: dto.fecha,
      hora: dto.hora,
      nit: dto.nit,
      razonSocial: dto.razonSocial,
      tipoIdentificacion: dto.tipoIdentificacion,
      numeroIdentificacion: dto.numeroIdentificacion,
      nombresResponsable: dto.nombresResponsable,
      detalleActividades: dto.detalleActividades,
      estado: true,
    });

    // 4) Sincronizar preventivo en SICOV (best-effort)
    try {
      const detRes = await this.external.guardarPreventivo({
        fecha: dto.fecha,
        hora: dto.hora,
        nit: dto.nit,
        razonSocial: dto.razonSocial,
        tipoIdentificacion: dto.tipoIdentificacion,
        numeroIdentificacion: dto.numeroIdentificacion,
        nombresResponsable: dto.nombresResponsable,
        mantenimientoId,
        detalleActividades: dto.detalleActividades,
        vigiladoId,
      });
      const externalId = detRes?.ok && detRes.data?.id;
      if (externalId) {
        await this.model.updateOne(
          { _id: doc._id },
          { $set: { externalId: String(externalId) } },
        );
      }
    } catch {
      // si falla la sync externa no rompemos la creación local
    }

    return (await this.model.findById(doc._id).lean())!;
  }

  async view(dto: { id: string }, user?: { enterprise_id?: string }) {
    if (!Types.ObjectId.isValid(dto.id))
      throw new NotFoundException('No encontrado');
    const item = await this.model
      .findOne({
        _id: new Types.ObjectId(dto.id),
        enterprise_id: user?.enterprise_id,
      })
      .lean();
    if (!item) throw new NotFoundException('No encontrado');

    // opcionalmente consulta en SICOV
    if (item.mantenimientoId) {
      try {
        const res = await this.external.visualizarPreventivo(
          item.mantenimientoId,
          process.env.SICOV_VIGILADO_ID,
        );
        if (res.ok) item.externalData = res.data;
      } catch {
        /* ignorar fallos externos */
      }
    }
    return item;
  }

  async list(q: any, user?: { enterprise_id?: string }) {
    const filter: any = { enterprise_id: user?.enterprise_id };

    // placa: búsqueda parcial (prefijo, case-insensitive)
    const rawPlaca = (q?.placa ?? q?.plate ?? '').toString().trim();
    if (rawPlaca) {
      const esc = rawPlaca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.placa = { $regex: '^' + esc, $options: 'i' };
    }

    const page = Math.max(1, Number(q?.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(q?.numero_items) || 10));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);
    return { items, total, page, numero_items: limit };
  }

  async update(id: string, dto: any, user?: { enterprise_id?: string }) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('No encontrado');

    // Solo los campos editables; NO tocar enterprise_id, createdBy, mantenimientoId
    const updatable: any = {};
    for (const k of [
      'fecha',
      'hora',
      'nit',
      'razonSocial',
      'tipoIdentificacion',
      'numeroIdentificacion',
      'nombresResponsable',
      'detalleActividades',
    ]) {
      if (dto[k] !== undefined) updatable[k] = dto[k];
    }

    const res = await this.model.findOneAndUpdate(
      { _id: new Types.ObjectId(id), enterprise_id: user?.enterprise_id },
      { $set: updatable },
      { new: true, lean: true },
    );
    if (!res) throw new NotFoundException('No encontrado');
    return res;
  }

  async toggle(id: string, user?: { enterprise_id?: string }) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('No encontrado');

    const item = await this.model.findOne({
      _id: new Types.ObjectId(id),
      enterprise_id: user?.enterprise_id,
    });
    if (!item) throw new NotFoundException('No encontrado');

    const nuevo = !item.estado;
    await this.model.updateOne({ _id: item._id }, { $set: { estado: nuevo } });
    return { _id: String(item._id), estado: nuevo };
  }
}
