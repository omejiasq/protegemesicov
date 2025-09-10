import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CorrectiveDetail,
  CorrectiveDetailDocument,
} from '../schema/corrective.schema';
import { MaintenanceExternalApiService } from '../libs/external-api';

@Injectable()
export class CorrectiveService {
  constructor(
    @InjectModel(CorrectiveDetail.name)
    private readonly model: Model<CorrectiveDetailDocument>,
    private readonly external: MaintenanceExternalApiService,
  ) {}

  async create(dto: any, user?: { enterprise_id?: string; sub?: string }) {
    // 1) Asegurar mantenimientoId antes de crear (el schema lo exige)
    let mantenimientoId: string | null = dto.mantenimientoId || null;

    if (!mantenimientoId) {
      const base = await this.external.guardarMantenimiento({
        placa: dto.placa,
        tipoId: 2, // 2 = correctivo
        vigiladoId: process.env.SICOV_VIGILADO_ID,
      });
      if (!(base?.ok && base.data?.id)) {
        throw new ConflictException('No se pudo generar el mantenimiento base');
      }
      mantenimientoId = String(base.data.id);
    }

    // 2) Duplicados: mismo mantenimiento dentro del tenant
    const exists = await this.model.exists({
      mantenimientoId,
      enterprise_id: user?.enterprise_id,
    });
    if (exists) {
      throw new ConflictException(
        'El mantenimiento ya tiene un correctivo registrado',
      );
    }

    // 3) Crear doc local con TODOS los requeridos
    const doc = await this.model.create({
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,

      mantenimientoId, // 👈 requerido por el schema
      placa: dto.placa,
      fecha: dto.fecha,
      hora: dto.hora,
      nit: dto.nit,
      razonSocial: dto.razonSocial,
      tipoIdentificacion: dto.tipoIdentificacion,
      numeroIdentificacion: dto.numeroIdentificacion,
      nombresResponsable: dto.nombresResponsable,
      descripcionFalla: dto.descripcionFalla,
      accionesRealizadas: dto.accionesRealizadas,
      detalleActividades: dto.detalleActividades,

      estado: true,
    });

    // 4) Sincronizar en SICOV (best-effort)
    try {
      const res = await this.external.guardarCorrectivo({
        fecha: dto.fecha,
        hora: dto.hora,
        nit: dto.nit,
        razonSocial: dto.razonSocial,
        tipoIdentificacion: dto.tipoIdentificacion,
        numeroIdentificacion: dto.numeroIdentificacion,
        nombresResponsable: dto.nombresResponsable,
        mantenimientoId,
        descripcionFalla: dto.descripcionFalla,
        accionesRealizadas: dto.accionesRealizadas,
        detalleActividades: dto.detalleActividades,
        vigiladoId: process.env.SICOV_VIGILADO_ID,
      });
      const externalId = res?.ok && res.data?.id;
      if (externalId) {
        await this.model.updateOne(
          { _id: doc._id },
          { $set: { externalId: String(externalId) } },
        );
      }
    } catch {
      /* no romper si la sync falla */
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

    // consulta opcional al sistema externo
    if (item.mantenimientoId) {
      try {
        const res = await this.external.visualizarCorrectivo(
          item.mantenimientoId,
          process.env.SICOV_VIGILADO_ID,
        );
        if (res.ok) (item as any).externalData = res.data;
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
}
