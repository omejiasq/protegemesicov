import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { MaintenanceExternalApiService } from '../libs/external-api';
import { MaintenanceService } from 'src/maintenance/maintenance.service';

import {
  EnlistmentDetail,
  EnlistmentDetailDocument,
} from '../schema/enlistment-schema';

import {
  EnlistmentDailySnapshot,
  EnlistmentDailySnapshotDocument,
} from '../schema/enlistment_daily_snapshot.schema';

import {
  EnlistmentItemResult,
  EnlistmentItemResultDocument,
} from '../schema/enlistment_item_result.schema';

@Injectable()
export class AlistamientoService {
  constructor(
    @InjectModel(EnlistmentDetail.name)
    private readonly model: Model<EnlistmentDetailDocument>,

    @InjectModel(EnlistmentDailySnapshot.name)
    private readonly snapshotModel: Model<EnlistmentDailySnapshotDocument>,

    @InjectModel(EnlistmentItemResult.name)
    private readonly itemResultModel: Model<EnlistmentItemResultDocument>,

    private readonly external: MaintenanceExternalApiService,
    private readonly maintenanceService: MaintenanceService,
  ) {}

  // ================= CREATE =================
  async create(dto: any, user: any) {
    // 1️⃣ Desactivar alistamientos anteriores
    await this.model.updateMany(
      { placa: dto.placa, enterprise_id: user.enterprise_id, estado: true },
      { $set: { estado: false } },
    );

    // 2️⃣ Crear mantenimiento
    const createdMaintenance = await this.maintenanceService.create(
      { placa: dto.placa, tipoId: 3 },
      user,
      { awaitExternal: true },
    );

    const mantenimientoIdLocal = String(createdMaintenance.doc._id);

    // 3️⃣ Crear enlistment principal
    const enlistment = await this.model.create({
      enterprise_id: user.enterprise_id,
      createdBy: user.sub,
      placa: dto.placa,
      mantenimientoId: mantenimientoIdLocal,

      tipoIdentificacion: dto.tipoIdentificacion,
      numeroIdentificacion: dto.numeroIdentificacion,
      nombresResponsable: dto.nombresResponsable,

      tipoIdentificacionConductor: dto.tipoIdentificacionConductor ?? '',
      numeroIdentificacionConductor: dto.numeroIdentificacionConductor ?? '',
      nombresConductor: dto.nombresConductor ?? '',

      detalleActividades: dto.detalleActividades,
      actividades: Array.isArray(dto.actividades) ? dto.actividades : [],

      estado: true,
    });

    // ================= SNAPSHOT + ITEMS (APP MÓVIL) =================
    if (dto.dailySnapshot) {
      const s = dto.dailySnapshot;

      // 4️⃣ Snapshot diario
      await this.snapshotModel.create({
        mantenimientoId: mantenimientoIdLocal,

        fecha: s.fecha,
        ciudad: s.ciudad,
        numeroInterno: s.numeroInterno,
        modalidad: s.modalidad,
        hora: s.hora,

        nombreOperador1: s.nombreOperador1,
        identificacionOperador1: s.identificacionOperador1,
        presentacionOperador1: s.presentacionOperador1,

        nombreOperador2: s.nombreOperador2,
        identificacionOperador2: s.identificacionOperador2,
        presentacionOperador2: s.presentacionOperador2,

        documentos: s.documentos,
        rutas: s.rutas,
        varias: s.varias,

        firmaConductorUrl: s.firmaConductorUrl,
        firmaInspectorUrl: s.firmaInspectorUrl,
      });

      // 5️⃣ Resultados de ítems
      if (Array.isArray(dto.items)) {
        for (const item of dto.items) {
          await this.itemResultModel.create({
            mantenimientoId: mantenimientoIdLocal,
            itemId: new Types.ObjectId(item.itemId),
            estado: item.valor,
          });
        }
      }
    }

    return enlistment;
  }

  // ================= VIEW =================
  async view(dto: { id: string }, user: any) {
    if (!Types.ObjectId.isValid(dto.id)) {
      throw new NotFoundException('No encontrado');
    }

    const item = await this.model
      .findOne({ _id: dto.id, enterprise_id: user.enterprise_id })
      .lean();

    if (!item) throw new NotFoundException('No encontrado');
    return item;
  }

  // ================= LIST ACTIVITIES =================
  async listActivities() {
    return this.external.listarActividades(process.env.SICOV_VIGILADO_ID);
  }

  // ================= LIST =================
  async list(q: any, user: any) {
    const filter: any = { enterprise_id: user.enterprise_id };

    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(q.numero_items) || 10));
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

  // ================= UPDATE =================
  async update(id: string, dto: any, user: any) {
    return this.model.findOneAndUpdate(
      { _id: id, enterprise_id: user.enterprise_id },
      { $set: dto },
      { new: true, lean: true },
    );
  }

  // ================= TOGGLE =================
  async toggle(id: string, user: any) {
    const item = await this.model.findOne({
      _id: id,
      enterprise_id: user.enterprise_id,
    });

    if (!item) throw new NotFoundException('No encontrado');

    item.estado = !item.estado;
    await item.save();

    return item;
  }

  // ================= LIST BY USER =================
  async listByUser(
    q: any,
    user: {
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

    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(q.numero_items) || 10));
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
