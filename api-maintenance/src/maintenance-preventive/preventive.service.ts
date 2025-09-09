import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PreventiveDetail, PreventiveDetailDocument } from '../schema/preventive.schema';
import { MaintenanceExternalApiService } from '../libs/external-api';

@Injectable()
export class PreventiveService {
  constructor(
    @InjectModel(PreventiveDetail.name)
    private readonly model: Model<PreventiveDetailDocument>,
    private readonly external: MaintenanceExternalApiService,
  ) {}

  async create(dto: any, user?: { enterprise_id?: string; sub?: string }) {
    // evitar duplicados por placa
    const exists = await this.model.exists({ placa: dto.placa, enterprise_id: user?.enterprise_id });
    if (exists) throw new ConflictException('Ya existe un mantenimiento preventivo para esa placa');

    // persistir local
    const doc = await this.model.create({
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      placa: dto.placa,
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

    // sincronizar con SICOV
    try {
      const baseRes = await this.external.guardarMantenimiento({
        placa: dto.placa,
        tipoId: 1,
        vigiladoId: process.env.SICOV_VIGILADO_ID,
      });
      const mantenimientoId = baseRes.ok && baseRes.data?.id;
      if (mantenimientoId) {
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
          vigiladoId: process.env.SICOV_VIGILADO_ID,
        });
        const externalId = detRes.ok && detRes.data?.id;
        if (externalId) {
          await this.model.updateOne(
            { _id: doc._id },
            { $set: { mantenimientoId, externalId: String(externalId) } },
          );
        }
      }
    } catch {
      // Modo defensivo: si falla no se revierte la operación local
    }

    return (await this.model.findById(doc._id).lean())!;
  }

  async view(dto: { id: string }, user?: { enterprise_id?: string }) {
    if (!Types.ObjectId.isValid(dto.id)) throw new NotFoundException('No encontrado');
    const item = await this.model
      .findOne({ _id: new Types.ObjectId(dto.id), enterprise_id: user?.enterprise_id })
      .lean();
    if (!item) throw new NotFoundException('No encontrado');

    // opcionalmente consulta en SICOV
    if (item.mantenimientoId) {
      try {
        const res = await this.external.visualizarPreventivo(item.mantenimientoId, process.env.SICOV_VIGILADO_ID);
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
    this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    this.model.countDocuments(filter),
  ]);
  return { items, total, page, numero_items: limit };
}
}
