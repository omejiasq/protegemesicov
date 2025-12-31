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

import { MaintenanceService } from 'src/maintenance/maintenance.service';

@Injectable()
export class AlistamientoService {
  constructor(
    @InjectModel(EnlistmentDetail.name)
    private readonly model: Model<EnlistmentDetailDocument>,
    private readonly external: MaintenanceExternalApiService,
    private readonly maintenanceService: MaintenanceService,
  ) {}

  async create(
    dto: any,
    user?: {
      enterprise_id?: string;
      sub?: string;
      vigiladoId?: number | string;
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
        tipoId: 3 as const,
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
      placa: dto.placa,
      mantenimientoId: mantenimientoIdExterno,
      fecha: dto.fecha,
      hora: dto.hora,
      tipoIdentificacion: dto.tipoIdentificacion,
      numeroIdentificacion: dto.numeroIdentificacion,
      nombresResponsable: dto.nombresResponsable,
      detalleActividades: dto.detalleActividades,
      actividades: Array.isArray(dto.actividades) ? dto.actividades : [],
      tipoIdentificacionConductor: dto.tipoIdentificacionConductor ?? 0,
      numeroIdentificacionConductor: dto.numeroIdentificacionConductor ?? '',
      nombresConductor: dto.nombresConductor ?? '',
      estado: true,
    });

    try {
      if (mantenimientoIdExterno && vigiladoId && user?.vigiladoToken) {
        const externalRes = await this.external.guardarAlistamiento({
          tipoIdentificacionResponsable: Number(dto.tipoIdentificacion),
          numeroIdentificacionResponsable: String(dto.numeroIdentificacion),
          nombreResponsable: String(dto.nombresResponsable),
          tipoIdentificacionConductor: Number(dto.tipoIdentificacionConductor),
          numeroIdentificacionConductor: dto.numeroIdentificacionConductor,
          nombresConductor: String(dto.nombresConductor ?? ''),
          mantenimientoId: Number(mantenimientoIdExterno),
          detalleActividades: String(dto.detalleActividades ?? ''),
          actividades: (Array.isArray(dto.actividades)
            ? dto.actividades
            : []
          ).map((x: any) => Number(x)),
          vigiladoId: String(vigiladoId),
          vigiladoToken: user.vigiladoToken,
        });

        if (externalRes && externalRes.ok === false) {
          throw new ConflictException({
            message: 'Error registrando alistamiento en SICOV',
            placa: dto.placa,
            externalStatus: externalRes.status,
            externalError: 'error' in externalRes ? externalRes.error : null,
          });
        }

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
      'tipoIdentificacion',
      'numeroIdentificacion',
      'nombresResponsable',
      'detalleActividades',
      'actividades',
      'tipoIdentificacionConductor',
      'numeroIdentificacionConductor',
      'nombresConductor',
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
        await this.external.guardarAlistamiento({
          tipoIdentificacionResponsable: Number(res.tipoIdentificacion ?? 0),
          numeroIdentificacionResponsable: String(
            res.numeroIdentificacion ?? '',
          ),
          nombreResponsable: String(res.nombresResponsable ?? ''),
          tipoIdentificacionConductor: Number(
            res.tipoIdentificacionConductor ?? 0,
          ),
          numeroIdentificacionConductor: Number(
            res.numeroIdentificacionConductor ?? '',
          ),
          nombresConductor: String(res.nombresConductor ?? ''),
          mantenimientoId: res.mantenimientoId,
          detalleActividades: String(res.detalleActividades ?? ''),
          actividades: Array.isArray(res.actividades) ? res.actividades : [],
          vigiladoId: String(user?.vigiladoId ?? process.env.SICOV_VIGILADO_ID),
          vigiladoToken: user?.vigiladoToken ?? process.env.SICOV_TOKEN,
        });
      }
    } catch {
      /* ignorar falla externa */
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
