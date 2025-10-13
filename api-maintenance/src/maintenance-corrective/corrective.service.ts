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
    // 1) Validación de duplicados si aplica (igual que en preventivos). Ajustá si no corresponde.
    if (dto.placa && user?.enterprise_id) {
      const exists = await this.model.exists({
        placa: dto.placa,
        enterprise_id: user.enterprise_id,
      });
      if (exists) {
        throw new ConflictException(
          'Ya existe un mantenimiento correctivo para esa placa',
        );
      }
    }

    // 2) Asegurar mantenimientoId (crearlo si no viene)
    let mantenimientoId: string | null = dto.mantenimientoId ?? null;
    console.log(
      '%capi-maintenance\src\maintenance-corrective\corrective.service.ts:40 user.vigiladoId',
      'color: #007acc;',
      user?.vigiladoId,
    );
    if (!mantenimientoId) {
      try {
        // Reutilizamos el create del maintenanceService (tipo 2 = correctivo)
        const maintPayload = {
          placa: dto.placa,
          tipoId: 2 as const,
          vigiladoId: user?.vigiladoId,
          enterprise_id: user?.enterprise_id,
          createdBy: user?.sub,
        };

        const createdMaintenance = await this.maintenanceService.create(
          maintPayload,
          user,
          { awaitExternal: true },
        );

        // El service de maintenance en tu repo devuelve la entidad Mongo (toJSON), por lo que _id es la forma.
        const newId = createdMaintenance?.doc._id ?? createdMaintenance?.doc.id ?? null;

        if (!newId) {
          throw new ConflictException(
            'La creación del mantenimiento no devolvió _id válido.',
          );
        }

        mantenimientoId = String(newId);
      } catch (err: any) {
        // Mensaje claro para el front
        throw new ConflictException(
          `No se pudo crear el mantenimiento asociado: ${err?.message ?? 'error'}`,
        );
      }
    }

    // 3) Crear el correctivo localmente (sólo si tenemos mantenimientoId)
    if (!mantenimientoId) {
      throw new ConflictException(
        'Mantenimiento asociado no disponible, no se crea el correctivo.',
      );
    }

    try {
      const payloadToSave: any = {
        mantenimientoId,
        placa: dto.placa?.trim(),
        fecha: dto.fecha ?? undefined,
        hora: dto.hora ?? undefined,
        nit: dto.nit ?? undefined,
        razonSocial: dto.razonSocial ?? undefined,
        descripcionFalla: dto.descripcionFalla ?? undefined,
        accionesRealizadas: dto.accionesRealizadas ?? undefined,
        estado: typeof dto.estado !== 'undefined' ? dto.estado : true,
        enterprise_id: user?.enterprise_id,
        createdBy: user?.sub,
        // agregar otros campos necesarios por tu esquema
      };

      const created = await this.model.create(payloadToSave);

      try {
        await this.external.guardarCorrectivo({
          fecha: dto.fecha,
          hora: dto.hora,
          nit: dto.nit,
          mantenimientoId,
          razonSocial: dto.razonSocial,
          tipoIdentificacion: dto.tipoIdentificacion,
          numeroIdentificacion: dto.numeroIdentificacion,
          nombresResponsable: dto.nombreResponsable,
          descripcionFalla: dto.descripcionFalla,
          detalleActividades: dto.detalleActividades,
          accionesRealizadas: dto.accionesRealizadas,
          vigiladoId: String(user?.vigiladoId),
          vigiladoToken: user?.vigiladoToken,
        });
      } catch (e) {}
      return await this.model.findById(created._id).lean();
    } catch (err: any) {
      throw new InternalServerErrorException(
        err?.message || 'Error creando correctivo',
      );
    }
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

  async update(id: string, dto: any, user?: { enterprise_id?: string }) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('No encontrado');

    // Solo campos editables (no tocar enterprise_id, createdBy, mantenimientoId, placa)
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
      'accionesRealizadas',
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
