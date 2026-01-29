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

import {
  CorrectiveVehicleSnapshot,
  CorrectiveVehicleSnapshotDocument,
} from '../schema/corrective_vehicle_snapshot.schema';

import {
  CorrectivePeopleSnapshot,
  CorrectivePeopleSnapshotDocument,
} from '../schema/corrective_people_snapshot.schema';

import {
  CorrectiveItemResult,
  CorrectiveItemResultDocument,
} from '../schema/corrective_item_result.schema';

@Injectable()
export class CorrectiveService {
  constructor(
    @InjectModel(CorrectiveDetail.name)
    private readonly model: Model<CorrectiveDetailDocument>,

    @InjectModel(CorrectiveVehicleSnapshot.name)
    private readonly vehicleSnapshotModel: Model<CorrectiveVehicleSnapshotDocument>,

    @InjectModel(CorrectivePeopleSnapshot.name)
    private readonly peopleSnapshotModel: Model<CorrectivePeopleSnapshotDocument>,

    @InjectModel(CorrectiveItemResult.name)
    private readonly itemResultModel: Model<CorrectiveItemResultDocument>,

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
      vigiladoId?: number;
      vigiladoToken?: string;
    },
  ) {
    await this.model.updateMany(
      { placa: dto.placa, enterprise_id: user?.enterprise_id, estado: true },
      { $set: { estado: false } },
    );

    let mantenimientoIdLocal: string | null = dto.mantenimientoId ?? null;
    let mantenimientoIdExterno: number | null = null;

    const vigiladoId =
      user?.vigiladoId ?? Number(process.env.SICOV_VIGILADO_ID);

    // ======================================================
    // CREAR MANTENIMIENTO BASE (LOCAL + SICOV)
    // ======================================================
    if (!mantenimientoIdLocal) {
      const maintPayload = {
        placa: dto.placa,
        tipoId: 2 as const,
        vigiladoId: vigiladoId, // ← obligatorio aquí
      };
      

      // 🔥 FIX DEFINITIVO
      const userForMaintenance = {
        ...user,
        vigiladoId,
      };

      const { doc, externalId } = await this.maintenanceService.create(
        maintPayload,
        userForMaintenance,
        { awaitExternal: true },
      );

      const localId = (doc as any)?._id ?? (doc as any)?.id;

      if (!localId) {
        throw new ConflictException(
          'No se pudo generar el mantenimiento base local',
        );
      }

      mantenimientoIdLocal = String(localId);

      if (!externalId) {
        throw new ConflictException(
          'No se pudo obtener el mantenimiento externo',
        );
      }

      mantenimientoIdExterno = Number(externalId);
    } else if (/^\d+$/.test(String(mantenimientoIdLocal))) {
      mantenimientoIdExterno = Number(mantenimientoIdLocal);
    }

    // ======================================================
    // GUARDAR CORRECTIVO LOCAL
    // ======================================================
    const doc = await this.model.create({
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      placa: String(dto.placa).trim(),
      mantenimientoId: mantenimientoIdLocal,
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

    // ======================================================
    // GUARDAR ESTRUCTURA CRMT (si viene desde móvil)
    // ======================================================
    if (dto.crmtData && mantenimientoIdLocal) {
      try {
        const mid = String(mantenimientoIdLocal);

        if (dto.crmtData.vehicle) {
          await this.vehicleSnapshotModel.create({
            mantenimientoId: mid,
            ...dto.crmtData.vehicle,
          });
        }

        if (dto.crmtData.people) {
          await this.peopleSnapshotModel.create({
            mantenimientoId: mid,
            ...dto.crmtData.people,
          });
        }

        if (Array.isArray(dto.crmtData.items) && dto.crmtData.items.length) {
          await this.itemResultModel.insertMany(
            dto.crmtData.items.map((i: any) => ({
              mantenimientoId: mid,
              itemId: new Types.ObjectId(i.itemId),
              tipoFalla: i.tipoFalla,
              observacion: i.observacion,
              planAccion: i.planAccion,
              responsable: i.responsable,
            })),
          );
        }
      } catch (err) {
        console.error('Error guardando estructura CRMT:', err);
      }
    }

    // ======================================================
    // ENVÍO A SICOV
    // ======================================================
    try {
      const sicovPayload = {
        fecha: dto.fecha,
        hora: dto.hora,
        nit: dto.nit,
        razonSocial: dto.razonSocial,
        tipoIdentificacion: dto.tipoIdentificacion,
        numeroIdentificacion: dto.numeroIdentificacion,
        nombresResponsable: dto.nombresResponsable,
        mantenimientoId: mantenimientoIdExterno as number,
        detalleActividades: dto.detalleActividades,
        vigiladoId: String(vigiladoId),
        vigiladoToken: user?.vigiladoToken,
      };

      const REQUIRED = [
        'fecha',
        'hora',
        'nit',
        'razonSocial',
        'tipoIdentificacion',
        'numeroIdentificacion',
        'nombresResponsable',
        'detalleActividades',
        'mantenimientoId',
        'vigiladoId',
      ];

      const missing = REQUIRED.filter(
        (k) => !sicovPayload[k as keyof typeof sicovPayload],
      );

      if (missing.length === 0 && user?.vigiladoToken) {
        await this.external.guardarCorrectivo(sicovPayload);
      }
    } catch (err) {
      console.error('Error enviando correctivo a SICOV:', err);
    }

    return this.model.findById(doc._id).lean();
  }

  // ======================================================
  // VIEW
  // ======================================================
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

    return item;
  }

  // ======================================================
  // UPDATE
  // ======================================================
  async update(
    id: string,
    dto: any,
    user?: { enterprise_id?: string },
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


  // ======================================================
  // LIST
  // ======================================================
  async list(q: any, user?: { enterprise_id?: string }) {
    const filter: any = { enterprise_id: user?.enterprise_id };

    if (q?.placa) {
      filter.placa = { $regex: '^' + q.placa, $options: 'i' };
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
  // TOGGLE
  // ======================================================
  async toggle(id: string, user?: { enterprise_id?: string }) {
    const item = await this.model.findOne({
      _id: new Types.ObjectId(id),
      enterprise_id: user?.enterprise_id,
    });

    if (!item) throw new NotFoundException('No encontrado');

    item.estado = !item.estado;
    await item.save();

    return { _id: String(item._id), estado: item.estado };
  }


  // ======================================================
  // LIST BY USER
  // ======================================================
  async listByUser(
    q: any,
    user?: {
      enterprise_id?: string;
      sub?: string;
    },
  ) {
    if (!user?.sub) {
      throw new NotFoundException('Usuario no válido');
    }

    const filter: any = {
      enterprise_id: user.enterprise_id,
      createdBy: user.sub,
    };

    // Filtros opcionales
    if (q?.estado !== undefined) {
      filter.estado = q.estado === 'true' || q.estado === true;
    }

    if (q?.placa) {
      filter.placa = { $regex: '^' + q.placa, $options: 'i' };
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

    return {
      items,
      total,
      page,
      numero_items: limit,
    };
  }


}
