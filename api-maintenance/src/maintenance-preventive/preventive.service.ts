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

import {
  PreventiveVehicleSnapshot,
  PreventiveVehicleSnapshotDocument,
} from '../schema/preventive_vehicle_snapshot.schema';

import {
  PreventivePeopleSnapshot,
  PreventivePeopleSnapshotDocument,
} from '../schema/preventive_people_snapshot.schema';

import {
  PreventiveItemResult,
  PreventiveItemResultDocument,
} from '../schema/preventive_item_result.schema';

import { MaintenanceExternalApiService } from '../libs/external-api';
import { MaintenanceService } from 'src/maintenance/maintenance.service';

@Injectable()
export class PreventiveService {
  constructor(
    @InjectModel(PreventiveDetail.name)
    private readonly model: Model<PreventiveDetailDocument>,

    @InjectModel(PreventiveVehicleSnapshot.name)
    private readonly vehicleSnap: Model<PreventiveVehicleSnapshotDocument>,

    @InjectModel(PreventivePeopleSnapshot.name)
    private readonly peopleSnap: Model<PreventivePeopleSnapshotDocument>,

    @InjectModel(PreventiveItemResult.name)
    private readonly itemResult: Model<PreventiveItemResultDocument>,

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
    // 1. Desactivar preventivos activos previos
    await this.model.updateMany(
      { placa: dto.placa, enterprise_id: user?.enterprise_id, estado: true },
      { $set: { estado: false } },
    );

    let mantenimientoIdLocal: string | undefined = dto.mantenimientoId;
    let mantenimientoIdExterno: number | undefined;

    //const vigiladoId = user?.vigiladoId ?? Number(process.env.SICOV_VIGILADO_ID);
    const vigiladoId =
    user?.vigiladoId ?? Number(process.env.SICOV_VIGILADO_ID);

    // 2. Crear mantenimiento base (LOCAL + SICOV)
    if (!mantenimientoIdLocal) {
      const maintPayload = {
        placa: dto.placa,
        tipoId: 1 as const,
        vigiladoId,
        enterprise_id: user?.enterprise_id,
        createdBy: user?.sub,
      };
      

      const { doc, externalId } = await this.maintenanceService.create(
        maintPayload,
        user,
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

    // 3. Guardar preventivo LOCAL (igual que siempre)
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
    // SNAPSHOTS PRMT (solo si viene desde app móvil)
    // ======================================================
    if (dto.prmtData) {
      const { vehicle, people, items } = dto.prmtData;

      await this.vehicleSnap.create({
        preventiveId: String(doc._id),
        ...vehicle,
      });

      await this.peopleSnap.create({
        preventiveId: String(doc._id),
        ...people,
      });

      if (Array.isArray(items) && items.length) {
        await this.itemResult.insertMany(
          items.map((it: any) => ({
            preventiveId: String(doc._id),
            ...it,
          })),
        );
      }
    }

    // ======================================================
    // Envío a SICOV protegido
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
        await this.external.guardarPreventivo(sicovPayload);
      } else {
        console.warn('Preventivo NO enviado a SICOV. Faltan:', missing);
      }
    } catch (err) {
      console.error('Error enviando preventivo a SICOV:', err);
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

    if (item.mantenimientoId) {
      try {
        const res = await this.external.visualizarPreventivo(
          item.mantenimientoId,
          process.env.SICOV_VIGILADO_ID,
        );
        if (res?.ok) (item as any).externalData = res.data;
      } catch {}
    }

    return item;
  }

  private buildDateFilter(q: any) {
    if (q?.fecha_desde || q?.fecha_hasta) {
      const range: any = {};
      if (q.fecha_desde) range.$gte = new Date(q.fecha_desde);
      if (q.fecha_hasta) {
        const end = new Date(q.fecha_hasta);
        end.setHours(23, 59, 59, 999);
        range.$lte = end;
      }
      return range;
    }
  
    // 🔥 por defecto: HOY
    const start = new Date();
    start.setHours(0, 0, 0, 0);
  
    const end = new Date();
    end.setHours(23, 59, 59, 999);
  
    return { $gte: start, $lte: end };
  }
  

  
  // ======================================================
  // LIST
  // ======================================================
  async list(q: any, user: any) {
    // =============================
    // Match base (empresa)
    // =============================
    const match: any = {
      enterprise_id: String(user.enterprise_id),
    };
  
    // =============================
    // Filtro por placa
    // =============================
    if (q?.placa) {
      match.placa = {
        $regex: '^' + q.placa.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      };
    }
  
    // =============================
    // Filtro por fechas (createdAt)
    // =============================
    if (q?.fechaDesde || q?.fechaHasta) {
      const range: any = {};
  
      if (q.fechaDesde) {
        range.$gte = new Date(`${q.fechaDesde}T00:00:00.000`);
      }
  
      if (q.fechaHasta) {
        const end = new Date(`${q.fechaHasta}T23:59:59.999`);
        range.$lte = end;
      }
  
      match.createdAt = range;
    }
  
    // =============================
    // Ordenamiento (sortable columns)
    // =============================
    const sort: any = {};
  
    if (q?.sortBy) {
      sort[q.sortBy] = q.sortDir === 'asc' ? 1 : -1;
    } else {
      // 🔥 default
      sort.createdAt = -1;
    }
  
    // =============================
    // Paginación (opcional)
    // =============================
    const page = Math.max(1, Number(q?.page) || 1);
    const limitParam = Number(q?.numero_items);
  
    const skip = (page - 1) * (limitParam || 0);
  
    // =============================
    // Query base
    // =============================
    let query = this.model.find(match).sort(sort);
  
    // =============================
    // 👉 SIN FILTROS → últimos 500
    // =============================
    const noFilters =
      !q?.placa &&
      !q?.fechaDesde &&
      !q?.fechaHasta;
  
    if (noFilters) {
      query = query.limit(500);
    } else if (limitParam) {
      query = query.skip(skip).limit(limitParam);
    }
  
    const [items, total] = await Promise.all([
      query.lean(),
      this.model.countDocuments(match),
    ]);
  
    return {
      items,
      total,
      page,
      numero_items: noFilters ? items.length : limitParam,
    };
  }
  
  

  // ======================================================
  // UPDATE
  // ======================================================
  async update(id: string, dto: any, 
      user?: {
        enterprise_id?: string;
        vigiladoId?: number;
        vigiladoToken?: string;
      },
    )
   {
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
  // TOGGLE
  // ======================================================
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
