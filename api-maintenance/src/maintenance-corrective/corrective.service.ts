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
import { MaintenanceService } from 'src/maintenance/maintenance.service';

@Injectable()
export class CorrectiveService {
  constructor(
    @InjectModel(CorrectiveDetail.name)
    private readonly model: Model<CorrectiveDetailDocument>,
    private readonly external: MaintenanceExternalApiService,
    private readonly maintenanceService: MaintenanceService,
  ) {}

  // ======================================================
  // CREATE
  // ======================================================
  async create(
    dto: any,
    user?: {
      enterprise_id?: string;
      sub?: string;
      vigiladoId: number;
      vigiladoToken: string;
    },
  ) {
    // Desactivar correctivos activos previos para la misma placa
    await this.model.updateMany(
      { placa: dto.placa, enterprise_id: user?.enterprise_id, estado: true },
      { $set: { estado: false } },
    );

    let mantenimientoIdLocal: string | null = dto.mantenimientoId || null;
    let mantenimientoIdExterno: string | null = null;
    const vigiladoId = user?.vigiladoId;

    // Crear mantenimiento base si no viene
    if (!mantenimientoIdLocal) {
      const maintPayload = {
        placa: dto.placa,
        tipoId: 2 as const, // correctivo
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
        createdMaintenance?.doc?._id ?? createdMaintenance?.doc?.id;

      if (!newId) {
        throw new ConflictException('No se pudo generar el mantenimiento base');
      }

      mantenimientoIdLocal = String(newId);
      mantenimientoIdExterno = createdMaintenance?.externalId
        ? String(createdMaintenance.externalId)
        : null;
    }

    // Crear correctivo local
    const doc = await this.model.create({
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,

      placa: String(dto.placa).trim(),
      mantenimientoId: mantenimientoIdLocal,

      fecha: String(dto.fecha),
      hora: String(dto.hora),

      nit: dto.nit,
      razonSocial: String(dto.razonSocial).trim(),
      tipoIdentificacion: String(dto.tipoIdentificacion),
      numeroIdentificacion: String(dto.numeroIdentificacion),
      nombresResponsable: String(dto.nombresResponsable).trim(),
      detalleActividades: String(dto.detalleActividades).trim(),

      estado: true,
    });

    // Envío a SICOV (si aplica)
    try {
      if (mantenimientoIdExterno && vigiladoId && user?.vigiladoToken) {
        await this.external.guardarCorrectivo({
          fecha: String(dto.fecha),
          hora: String(dto.hora),
          nit: dto.nit,
          razonSocial: String(dto.razonSocial),
          tipoIdentificacion: dto.tipoIdentificacion,
          numeroIdentificacion: dto.numeroIdentificacion,
          nombresResponsable: String(dto.nombresResponsable),
          mantenimientoId: Number(mantenimientoIdExterno),
          detalleActividades: String(dto.detalleActividades),
          vigiladoId: String(vigiladoId),
          vigiladoToken: user.vigiladoToken,
        });
      }
    } catch {
      // errores externos no bloquean guardado local
    }

    return this.model.findById(doc._id).lean();
  }

  // ======================================================
  // VIEW
  // ======================================================
  async view(dto: { id: string }, user?: { enterprise_id?: string }) {
    if (!Types.ObjectId.isValid(dto.id)) {
      throw new NotFoundException('No encontrado');
    }

    const item = await this.model.findOne({
      _id: new Types.ObjectId(dto.id),
      enterprise_id: user?.enterprise_id,
    }).lean();

    if (!item) throw new NotFoundException('No encontrado');

    // Consulta externa opcional
    if (item.mantenimientoId) {
      try {
        const res = await this.external.visualizarCorrectivo(
          item.mantenimientoId,
          process.env.SICOV_VIGILADO_ID,
        );
        if (res?.ok) {
          (item as any).externalData = res.data;
        }
      } catch {}
    }

    return item;
  }

  // ======================================================
  // LIST
  // ======================================================
  async list(q: any, user?: { enterprise_id?: string }) {
    const filter: any = { enterprise_id: user?.enterprise_id };

    const rawPlaca = (q?.placa ?? q?.plate ?? '').toString().trim();
    if (rawPlaca) {
      filter.placa = {
        $regex: '^' + rawPlaca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      };
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

  // ======================================================
  // UPDATE
  // ======================================================
  async update(
    id: string,
    dto: any,
    user?: {
      enterprise_id?: string;
      vigiladoId?: number | string;
      vigiladoToken?: string;
    },
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('No encontrado');
    }

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

    // Sync SICOV
    try {
      if (res.mantenimientoId && (user?.vigiladoToken || process.env.SICOV_TOKEN)) {
        await this.external.guardarCorrectivo({
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

  // ======================================================
  // TOGGLE
  // ======================================================
  async toggle(id: string, user?: { enterprise_id?: string }) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('No encontrado');
    }

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
