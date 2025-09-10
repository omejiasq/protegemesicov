import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MaintenanceExternalApiService } from '../libs/external-api';
import {
  EnlistmentDetail,
  EnlistmentDetailDocument,
} from '../schema/enlistment-schema';

@Injectable()
export class AlistamientoService {
  constructor(
    @InjectModel(EnlistmentDetail.name)
    private readonly model: Model<EnlistmentDetailDocument>,
    private readonly external: MaintenanceExternalApiService,
  ) {}

  /** Crea un nuevo alistamiento local y lo sincroniza con SICOV */
  async create(dto: any, user?: { enterprise_id?: string; sub?: string }) {
    // 1) Duplicados por placa dentro del tenant
    const exists = await this.model.exists({
      placa: dto.placa,
      enterprise_id: user?.enterprise_id,
    });
    if (exists) {
      throw new ConflictException('Ya existe un alistamiento para esa placa');
    }

    // 2) Asegurar mantenimientoId antes de crear
    let mantenimientoId: string | null = dto.mantenimientoId || null;

    if (!mantenimientoId) {
      const baseRes = await this.external.guardarMantenimiento({
        placa: dto.placa,
        tipoId: 3, // 3 = alistamiento
        vigiladoId: process.env.SICOV_VIGILADO_ID,
      });
      if (!(baseRes?.ok && baseRes.data?.id)) {
        throw new ConflictException('No se pudo generar el mantenimiento base');
      }
      mantenimientoId = String(baseRes.data.id);
    }

    // 3) Crear doc local con requeridos
    const doc = await this.model.create({
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,

      placa: dto.placa,
      mantenimientoId, // 👈 requerido
      fecha: dto.fecha,
      hora: dto.hora,
      tipoIdentificacion: dto.tipoIdentificacion,
      numeroIdentificacion: dto.numeroIdentificacion,
      nombresResponsable: dto.nombresResponsable,

      detalleActividades: dto.detalleActividades,
      actividades: dto.actividades,
      estado: true,
    });

    // 4) Sync SICOV (best-effort)
    try {
      const detRes = await this.external.guardarAlistamiento({
        tipoIdentificacionResponsable: dto.tipoIdentificacion,
        numeroIdentificacionResponsable: dto.numeroIdentificacion,
        nombreResponsable: dto.nombresResponsable,
        mantenimientoId,
        detalleActividades: dto.detalleActividades,
        actividades: dto.actividades,
        vigiladoId: process.env.SICOV_VIGILADO_ID,
        tipoIdentificacionConductor: 0,
        numeroIdentificacionConductor: '',
        nombresConductor: '',
      });
      const externalId = detRes?.ok && detRes.data?.id;
      if (externalId) {
        await this.model.updateOne(
          { _id: doc._id },
          { $set: { externalId: String(externalId) } },
        );
      }
    } catch {
      /* ignorar errores externos */
    }

    return (await this.model.findById(doc._id).lean())!;
  }

  /** Devuelve un alistamiento local y, si existe, lo complementa con la respuesta de SICOV */
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

    let externalData: any = null;
    if (item.mantenimientoId) {
      try {
        const res = await this.external.visualizarAlistamiento(
          item.mantenimientoId,
          process.env.SICOV_VIGILADO_ID,
        );
        if (res.ok) externalData = res.data;
      } catch {
        /* ignorar fallos externos */
      }
    }

    // devolvemos el registro local junto con la data externa (sin modificar el esquema)
    return { ...item, externalData };
  }

  async listActivities(user?: { enterprise_id?: string }) {
    // Puedes ignorar user si no lo necesitas aquí
    return this.external.listarActividades(process.env.SICOV_VIGILADO_ID);
  }

  async list(q: any, user?: { enterprise_id?: string }) {
    const filter: any = { enterprise_id: user?.enterprise_id };

    // placa parcial (prefijo, case-insensitive)
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
}
