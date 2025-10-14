import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CorrectiveDetail,
  CorrectiveDetailDocument,
} from '../schema/corrective.schema';
import { MaintenanceExternalApiService } from '../libs/external-api';

import { MaintenanceService } from 'src/maintenance/maintenance.service';

@Injectable()
export class CorrectiveService {
  constructor(
    @InjectModel(CorrectiveDetail.name)
    private readonly model: Model<CorrectiveDetailDocument>,
    private readonly external: MaintenanceExternalApiService,
    private readonly maintenanceService: MaintenanceService,
  ) {}

  async create(
    dto: any,
    user?: {
      enterprise_id?: string;
      sub?: string;
      vigiladoId: number;
      vigiladoToken: string;
    },
  ) {
    await this.model.updateMany(
      { placa: dto.placa, enterprise_id: user?.enterprise_id, estado: true },
      { $set: { estado: false } },
    );

    let mantenimientoIdLocal: string | null = dto.mantenimientoId || null;
    let mantenimientoIdExterno: string | null = null;
    const vigiladoId = user?.vigiladoId;

    if (!mantenimientoIdLocal) {
      const maintPayload = {
        placa: dto.placa,
        tipoId: 2 as const,
        vigiladoId: vigiladoId as number,
        enterprise_id: user?.enterprise_id,
        createdBy: user?.sub,
      };

      const createdMaintenance = await this.maintenanceService.create(
        maintPayload,
        user,
        { awaitExternal: true },
      );

      const newId =
        createdMaintenance?.doc?._id ?? createdMaintenance?.doc?.id ?? null;
      if (!newId) {
        throw new ConflictException('No se pudo generar el mantenimiento base');
      }
      mantenimientoIdLocal = String(newId);
      mantenimientoIdExterno = createdMaintenance?.externalId
        ? String(createdMaintenance.externalId)
        : null;
    } else {
      mantenimientoIdExterno = null;
    }

    const doc = await this.model.create({
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      placa: String(dto.placa ?? '').trim(),
      mantenimientoId: mantenimientoIdExterno,
      fecha: dto.fecha,
      hora: dto.hora,
      nit: dto.nit,
      razonSocial: String(dto.razonSocial ?? '').trim(),
      tipoIdentificacion: dto.tipoIdentificacion,
      numeroIdentificacion: dto.numeroIdentificacion,
      nombresResponsable: String(dto.nombresResponsable ?? '').trim(),
      descripcionFalla: String(dto.descripcionFalla ?? '').trim(),
      detalleActividades: String(dto.detalleActividades ?? '').trim(),
      accionesRealizadas: String(dto.accionesRealizadas ?? '').trim(),
      estado: true,
    });

    try {
      if (mantenimientoIdExterno && vigiladoId && user?.vigiladoToken) {
        await this.external.guardarCorrectivo({
          fecha: String(dto.fecha ?? ''),
          hora: String(dto.hora ?? ''),
          nit: dto.nit,
          razonSocial: String(dto.razonSocial ?? ''),
          tipoIdentificacion: dto.tipoIdentificacion,
          numeroIdentificacion: dto.numeroIdentificacion,
          nombresResponsable: String(dto.nombresResponsable ?? ''),
          mantenimientoId: Number(mantenimientoIdExterno),
          descripcionFalla: String(dto.descripcionFalla ?? ''),
          detalleActividades: String(dto.detalleActividades ?? ''),
          accionesRealizadas: String(dto.accionesRealizadas ?? ''),
          vigiladoId: String(vigiladoId),
          vigiladoToken: user.vigiladoToken,
        });
      }
    } catch {}

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

  async update(
    id: string,
    dto: any,
    user?: {
      enterprise_id?: string;
      vigiladoId?: number | string;
      vigiladoToken?: string;
    },
  ) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('No encontrado');

    const updatable: any = {};
    for (const k of [
      'fecha',
      'hora',
      'nit',
      'razonSocial',
      'tipoIdentificacion',
      'numeroIdentificacion',
      'nombresResponsable',
      'descripcionFalla',
      'detalleActividades',
      'accionesRealizadas',
    ])
      if (dto[k] !== undefined) updatable[k] = dto[k];

    const res = await this.model.findOneAndUpdate(
      { _id: new Types.ObjectId(id), enterprise_id: user?.enterprise_id },
      { $set: updatable },
      { new: true, lean: true },
    );
    if (!res) throw new NotFoundException('No encontrado');

    // 🔁 Sincronizar con SICOV
    try {
      if (
        res.mantenimientoId &&
        (user?.vigiladoToken || process.env.SICOV_TOKEN)
      ) {
        await this.external.guardarCorrectivo({
          fecha: res.fecha,
          hora: res.hora,
          nit: res.nit,
          razonSocial: res.razonSocial,
          tipoIdentificacion: res.tipoIdentificacion,
          numeroIdentificacion: res.numeroIdentificacion,
          nombresResponsable: res.nombresResponsable,
          mantenimientoId: res.mantenimientoId,
          descripcionFalla: res.descripcionFalla,
          detalleActividades: res.detalleActividades,
          accionesRealizadas: res.accionesRealizadas,
          vigiladoId: String(user?.vigiladoId ?? process.env.SICOV_VIGILADO_ID),
          vigiladoToken: user?.vigiladoToken ?? process.env.SICOV_TOKEN,
        });
      }
    } catch {
    }

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
