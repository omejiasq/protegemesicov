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
    jwt?: string; // 🔥 AGREGAR ESTO
  },
  //jwt?: string,
) {

  // ---------------------------------------------------
  // 1. Desactivar preventivos activos previos
  // ---------------------------------------------------
  await this.model.updateMany(
    { placa: dto.placa, enterprise_id: user?.enterprise_id, estado: true },
    { $set: { estado: false } },
  );

  let mantenimientoIdLocal: string | null = dto.mantenimientoId ?? null;
  let mantenimientoIdExterno: number | null = null;

  const vigiladoId =
    user?.vigiladoId ?? Number(process.env.SICOV_VIGILADO_ID);

  // ---------------------------------------------------
  // 2. Crear mantenimiento base (LOCAL + SICOV)
  // ---------------------------------------------------
  if (!mantenimientoIdLocal) {
    const maintPayload = {
      placa: dto.placa,
      tipoId: 1 as const,
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
  } 
  else if (/^\d+$/.test(String(mantenimientoIdLocal))) {
    mantenimientoIdExterno = Number(mantenimientoIdLocal);
  }

  // ---------------------------------------------------
  // 3. Guardar Preventivo LOCAL
  // ---------------------------------------------------
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

  // ---------------------------------------------------
  // 4. GUARDAR ESTRUCTURA PRMT (robusto)
  // ---------------------------------------------------
  const prmtData = dto.prmtData ?? dto.crmtData;

  if (prmtData && mantenimientoIdLocal) {
    const mid = String(mantenimientoIdLocal);
  /*
    if (prmtData.vehicle) {
      await this.vehicleSnap.create({
        mantenimientoId: mid,
        ...prmtData.vehicle,
      });
    }
  */
     // ============================================
    // VEHICLE SNAPSHOT (DESDE SICOV POR PLACA)
    // ============================================
    try {
      //const placa = String(dto.placa).trim().toUpperCase();

      /*if (!user?.vigiladoToken) {
        throw new ConflictException('Token SICOV no disponible');
      }*/

      //const jwt = req?.headers?.authorization?.replace('Bearer ', '');

      const jwt = user?.jwt; // 👈 DECLARARLO

      if (!jwt) {
        throw new ConflictException('JWT no disponible en header');
      }
    
      const placa = String(dto.placa).trim().toUpperCase();
    
      const vehicleData = await this.getVehicleByPlate(placa, jwt);

      if (vehicleData && mantenimientoIdLocal) {
        await this.vehicleSnap.create({
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

    if (prmtData.people) {
      await this.peopleSnap.create({
        mantenimientoId: mid,
        ...prmtData.people,
      });
    }
  
    if (Array.isArray(prmtData.items) && prmtData.items.length) {
      await this.itemResult.insertMany(
        prmtData.items.map((it: any) => ({
          mantenimientoId: mid,
          itemId: new Types.ObjectId(it.itemId),
          tipoFalla: it.tipoFalla,
          observacion: it.observacion,
          planAccion: it.planAccion,
          responsable: it.responsable,
        })),
      );
    }
  }
  

  // ---------------------------------------------------
  // 5. ENVÍO A SICOV
  // ---------------------------------------------------
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
    }
  } catch (err) {
    console.error('Error enviando preventivo a SICOV:', err);
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
