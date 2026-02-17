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
    jwt?: string,
  ) {
    // ============================================
    // Desactivar correctivo activo anterior
    // ============================================
    await this.model.updateMany(
      { placa: dto.placa, enterprise_id: user?.enterprise_id, estado: true },
      { $set: { estado: false } },
    );

    let mantenimientoIdLocal: string | null = dto.mantenimientoId ?? null;
    let mantenimientoIdExterno: number | null = null;

    const vigiladoId =
      user?.vigiladoId ?? Number(process.env.SICOV_VIGILADO_ID);

    // ============================================
    // CREAR MANTENIMIENTO BASE
    // ============================================
    if (!mantenimientoIdLocal) {
      const maintPayload = {
        placa: dto.placa,
        tipoId: 2 as const,
        vigiladoId,
      };

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

    // ============================================
    // GUARDAR CORRECTIVO LOCAL
    // ============================================
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

    // ============================================
    // VEHICLE SNAPSHOT (DESDE SICOV POR PLACA)
    // ============================================
    try {
      const placa = String(dto.placa).trim().toUpperCase();

      if (!user?.vigiladoToken) {
        throw new ConflictException('Token SICOV no disponible');
      }

      //const jwt = req?.headers?.authorization?.replace('Bearer ', '');

      if (!jwt) {
        throw new ConflictException('JWT no disponible en header');
      }
      
      const vehicleData = await this.getVehicleByPlate(placa, jwt);   

      if (vehicleData && mantenimientoIdLocal) {
        await this.vehicleSnapshotModel.create({
          mantenimientoId: mantenimientoIdLocal,

          placa: vehicleData.placa,
          clase: vehicleData.clase,
          marca: vehicleData.marca,
          linea: vehicleData.Linea,
          servicio: vehicleData.servicio,
          kilometraje: vehicleData.kilometraje,
          modelo: vehicleData.modelo,
          combustible: vehicleData.combustible,
          color: vehicleData.color,
          cilindraje: vehicleData.cilindraje,

          no_rtm: vehicleData.no_rtm,
          expedition_rtm: vehicleData.expedition_rtm,
          expiration_rtm: vehicleData.expiration_rtm,

          no_soat: vehicleData.no_soat,
          expedition_soat: vehicleData.expedition_soat,
          expiration_soat: vehicleData.expiration_soat,

          no_rcc: vehicleData.no_rcc,
          expiration_rcc: vehicleData.expiration_rcc,
          no_rce: vehicleData.no_rce,
          expiration_rce: vehicleData.expiration_rce,

          no_tecnomecanica: vehicleData.no_tecnomecanica,
          expiration_tecnomecanica:
            vehicleData.expiration_tecnomecanica,

          no_tarjeta_opera: vehicleData.no_tarjeta_opera,
          expiration_tarjeta_opera:
            vehicleData.expiration_tarjeta_opera,

          nombre_aseguradora: vehicleData.nombre_aseguradora,
          tipo_vehiculo: vehicleData.tipo_vehiculo,
          modalidad: vehicleData.modalidad,
          no_interno: vehicleData.no_interno,
          motor: vehicleData.motor,
          to: vehicleData.to,
          vencim: vehicleData.vencim,
          no_chasis: vehicleData.no_chasis,
          tipo: vehicleData.tipo,
          capacidad: vehicleData.capacidad,

          nombre_propietario: vehicleData.nombre_propietario,
          cedula_propietario: vehicleData.cedula_propietario,
          telefono_propietario: vehicleData.telefono_propietario,
          direccion_propietario: vehicleData.direccion_propietario,
        });
      }
    } catch (err) {
      console.error('Error consultando vehículo en SICOV:', err);
    }

    // ============================================
    // PEOPLE SNAPSHOT
    // ============================================
    if (dto.crmtData?.people && mantenimientoIdLocal) {
      await this.peopleSnapshotModel.create({
        mantenimientoId: mantenimientoIdLocal,
        ...dto.crmtData.people,
      });
    }

    // ============================================
    // ITEM RESULTS SNAPSHOT
    // ============================================
    if (
      Array.isArray(dto.crmtData?.items) &&
      dto.crmtData.items.length &&
      mantenimientoIdLocal
    ) {
      await this.itemResultModel.insertMany(
        dto.crmtData.items.map((i: any) => ({
          mantenimientoId: mantenimientoIdLocal,
          itemId: new Types.ObjectId(i.itemId),
          tipoFalla: i.tipoFalla,
          observacion: i.observacion,
          planAccion: i.planAccion,
          responsable: i.responsable,
        })),
      );
    }

    // ============================================
    // ENVÍO A SICOV
    // ============================================
    try {
      if (user?.vigiladoToken && mantenimientoIdExterno) {
        const sicovPayload = {
          fecha: dto.fecha,
          hora: dto.hora,
          nit: dto.nit,
          razonSocial: dto.razonSocial,
          tipoIdentificacion: dto.tipoIdentificacion,
          numeroIdentificacion: dto.numeroIdentificacion,
          nombresResponsable: dto.nombresResponsable,
          mantenimientoId: mantenimientoIdExterno,
          detalleActividades: dto.detalleActividades,
          vigiladoId: String(vigiladoId),
          vigiladoToken: user.vigiladoToken,
        };

        await this.external.guardarCorrectivo(sicovPayload);
      }
    } catch (err) {
      console.error('Error enviando correctivo a SICOV:', err);
    }

    return this.model.findById(doc._id).lean();
  }



  async getVehicleByPlate(placa: string, jwt: string) {
    const response = await fetch(
      `https://sicov.protegeme.com.co/api/vehicles/vehicles/plate/${placa}`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: 'application/json',
        },
      },
    );
  
    if (!response.ok) {
      const text = await response.text();
      console.error('SICOV error:', text);
      throw new Error('Vehículo no encontrado');
    }
  
    return response.json();
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
