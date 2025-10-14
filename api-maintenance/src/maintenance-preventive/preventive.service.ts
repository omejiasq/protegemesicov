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
import { MaintenanceService } from 'src/maintenance/maintenance.service';

@Injectable()
export class PreventiveService {
  constructor(
    @InjectModel(PreventiveDetail.name)
    private readonly model: Model<PreventiveDetailDocument>,
    private readonly external: MaintenanceExternalApiService,
    private readonly maintenanceService: MaintenanceService,
  ) {}

  // preventive.service.ts
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
    let mantenimientoIdExterno: number | null = null;

    const vigiladoId = user?.vigiladoId ?? process.env.SICOV_VIGILADO_ID;

    if (mantenimientoIdLocal && /^\d+$/.test(String(mantenimientoIdLocal))) {
      mantenimientoIdExterno = Number(mantenimientoIdLocal);
    }

    if (!mantenimientoIdExterno) {
      const maintPayload = {
        placa: dto.placa,
        tipoId: 1 as const,
        vigiladoId: user?.vigiladoId,
        enterprise_id: user?.enterprise_id,
        createdBy: user?.sub,
      };

      const { doc: createdMaintenance, externalId: externalMaintId } =
        await this.maintenanceService.create(maintPayload, user, {
          awaitExternal: true,
        });

      const newLocal =
        (createdMaintenance as any)?._id ??
        (createdMaintenance as any)?.id ??
        null;

      if (!externalMaintId) {
        throw new ConflictException(
          'No se pudo obtener el id externo del mantenimiento base',
        );
      }
      if (!newLocal) {
        throw new ConflictException(
          'No se pudo generar el mantenimiento base (local)',
        );
      }

      mantenimientoIdLocal = String(newLocal);
      mantenimientoIdExterno = Number(externalMaintId);
    }

    const doc = await this.model.create({
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      placa: dto.placa,
      mantenimientoId: mantenimientoIdExterno,
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

    try {
      await this.external.guardarPreventivo({
        fecha: dto.fecha,
        hora: dto.hora,
        nit: dto.nit,
        razonSocial: dto.razonSocial,
        tipoIdentificacion: dto.tipoIdentificacion,
        numeroIdentificacion: dto.numeroIdentificacion,
        nombresResponsable: dto.nombresResponsable,
        mantenimientoId: mantenimientoIdExterno!,
        detalleActividades: dto.detalleActividades,
        vigiladoId: String(vigiladoId),
        vigiladoToken: user?.vigiladoToken,
      });
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
      'detalleActividades',
    ])
      if (dto[k] !== undefined) updatable[k] = dto[k];

    const res = await this.model.findOneAndUpdate(
      { _id: new Types.ObjectId(id), enterprise_id: user?.enterprise_id },
      { $set: updatable },
      { new: true, lean: true },
    );
    if (!res) throw new NotFoundException('No encontrado');

    try {
      if (
        res.mantenimientoId &&
        (user?.vigiladoToken || process.env.SICOV_TOKEN)
      ) {
        await this.external.guardarPreventivo({
          fecha: res.fecha,
          hora: res.hora,
          nit: res.nit,
          razonSocial: res.razonSocial,
          tipoIdentificacion: res.tipoIdentificacion,
          numeroIdentificacion: res.numeroIdentificacion,
          nombresResponsable: res.nombresResponsable,
          mantenimientoId: res.mantenimientoId,
          detalleActividades: res.detalleActividades,
          vigiladoId: String(user?.vigiladoId ?? process.env.SICOV_VIGILADO_ID),
          vigiladoToken: user?.vigiladoToken ?? process.env.SICOV_TOKEN,
        });
      }
    } catch {}

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
