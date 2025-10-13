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

  /** Crea un nuevo alistamiento local y lo sincroniza con SICOV */
  async create(
    dto: any,
    user?: {
      enterprise_id?: string;
      sub?: string;
      vigiladoId?: number | string;
      vigiladoToken: string;
    },
  ) {
    // 1) Anti-duplicados por placa + tenant
    const exists = await this.model.exists({
      placa: dto.placa,
      enterprise_id: user?.enterprise_id,
    });
    if (exists) {
      throw new ConflictException('Ya existe un alistamiento para esa placa');
    }

    // 2) Asegurar maintenance local (requisito del esquema)
    let mantenimientoIdLocal: string | null = dto.mantenimientoId || null;
    // guardaremos acá el EXTERNO (numérico en la externa)
    let mantenimientoIdExterno: string | null = null;

    const vigiladoId = user?.vigiladoId;

    if (!mantenimientoIdLocal) {
      const maintPayload = {
        placa: dto.placa,
        tipoId: 3 as const, // 3 = alistamiento
        vigiladoId: vigiladoId as number,
        enterprise_id: user?.enterprise_id,
        createdBy: user?.sub,
      };

      // ⬇️ devolvemos { doc, externalId }
      const createdMaintenance = await this.maintenanceService.create(
        maintPayload,
        user,
        { awaitExternal: true }, // garantiza que SICOV ya tenga el mantenimiento
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
      // Si te llega por DTO el id local, acá podrías intentar buscar su externo si lo persistís.
      mantenimientoIdExterno = null;
    }

    // 3) Crear SIEMPRE el registro local (éste es el objetivo)
    const doc = await this.model.create({
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,

      placa: dto.placa,
      mantenimientoId: mantenimientoIdLocal, // requerido por tu schema (id local)
      fecha: dto.fecha,
      hora: dto.hora,

      // Responsable
      tipoIdentificacion: dto.tipoIdentificacion,
      numeroIdentificacion: dto.numeroIdentificacion,
      nombresResponsable: dto.nombresResponsable,

      // Detalle
      detalleActividades: dto.detalleActividades,
      actividades: Array.isArray(dto.actividades) ? dto.actividades : [],

      // Conductor (si no te lo pasan, lo dejás vacío/0)
      tipoIdentificacionConductor: dto.tipoIdentificacionConductor ?? 0,
      numeroIdentificacionConductor: dto.numeroIdentificacionConductor ?? '',
      nombresConductor: dto.nombresConductor ?? '',

      estado: true,
    });

    // 4) Sincronización externa (best-effort). Requiere id EXTERNO y credenciales del vigilado.
    try {
      if (mantenimientoIdExterno && vigiladoId && user?.vigiladoToken) {
        await this.external.guardarAlistamiento({
          // Responsable
          tipoIdentificacionResponsable: Number(dto.tipoIdentificacion),
          numeroIdentificacionResponsable: String(dto.numeroIdentificacion),
          nombreResponsable: String(dto.nombresResponsable),

          // Conductor
          tipoIdentificacionConductor: Number(
            dto.tipoIdentificacionConductor,
          ),
          numeroIdentificacionConductor: dto.numeroIdentificacionConductor,
          nombresConductor: String(dto.nombresConductor ?? ''),

          // Mantenimiento externo (CRÍTICO: número)
          mantenimientoId: Number(mantenimientoIdExterno),

          // Detalle
          detalleActividades: String(dto.detalleActividades ?? ''),
          actividades: (Array.isArray(dto.actividades)
            ? dto.actividades
            : []
          ).map((x: any) => Number(x)),

          // Headers (se usan en external-api.ts)
          vigiladoId: String(vigiladoId),
          vigiladoToken: user.vigiladoToken,
        });
      }
    } catch {
      // No relanzamos: el registro local ya quedó. La sync externa se puede reintentar luego.
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

  async update(id: string, dto: any, user?: { enterprise_id?: string }) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('No encontrado');

    // Solo campos editables (no tocar enterprise_id, createdBy, mantenimientoId, placa)
    const updatable: any = {};
    for (const k of [
      'fecha',
      'hora',
      'tipoIdentificacion',
      'numeroIdentificacion',
      'nombresResponsable',
      'detalleActividades',
      'actividades',
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
