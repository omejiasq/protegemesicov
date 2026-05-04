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
import { SicovSyncService } from '../sicov-sync/sicov-sync.service';

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
    private readonly sicovSync: SicovSyncService,
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
  // 2. Crear mantenimiento base (LOCAL + intento SICOV)
  //    Si es planeación (isPlanned=true) o empresa ESPECIAL, omitir SICOV
  // ---------------------------------------------------
  let sicovMaintenanceDown = false;
  const isPlanned = !!(dto as any).isPlanned;
  const esEspecial = (user as any)?.tipo_habilitacion === 'ESPECIAL';

  if (!isPlanned && !mantenimientoIdLocal) {
    const maintPayload = {
      placa: dto.placa,
      tipoId: 1 as const,
      vigiladoId,
    };

    const userForMaintenance = {
      ...user,
      vigiladoId,
      // Empresas ESPECIAL no reportan a SICOV
      ...(esEspecial ? { demoMode: true } : {}),
    };

    const { doc, externalId, sicovDown } = await this.maintenanceService.create(
      maintPayload,
      userForMaintenance,
      { awaitExternal: false }, // 🔥 No esperar SICOV, similar a alistamientos
    );

    const localId = (doc as any)?._id ?? (doc as any)?.id;

    if (!localId) {
      throw new ConflictException(
        'No se pudo generar el mantenimiento base local',
      );
    }

    mantenimientoIdLocal = String(localId);
    sicovMaintenanceDown = !!sicovDown;

    if (externalId) {
      mantenimientoIdExterno = Number(externalId);
    }
  }
  else if (!isPlanned && /^\d+$/.test(String(mantenimientoIdLocal))) {
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
    
    evidencia_foto: dto.evidencia_foto ?? null,
    no_licencia_conduccion: dto.no_licencia_conduccion ?? null,
    vencimiento_licencia_conduccion: dto.vencimiento_licencia_conduccion ?? null,

    isPlanned,
    estado: true,
    sicov_sync_status: esEspecial ? 'no_aplica' : isPlanned ? 'planned' : (sicovMaintenanceDown ? 'pending' : 'synced'),
    source: (dto as any).source ?? 'frontend',
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
  // 5. ENVÍO A SICOV (con tolerancia a fallos)
  // ---------------------------------------------------
  const sicovDetailPayload = {
    fecha: dto.fecha,
    hora: dto.hora,
    nit: dto.nit,
    razonSocial: dto.razonSocial,
    tipoIdentificacion: dto.tipoIdentificacion,
    numeroIdentificacion: dto.numeroIdentificacion,
    nombresResponsable: dto.nombresResponsable,
    detalleActividades: dto.detalleActividades,
    vigiladoId: String(vigiladoId),
    vigiladoToken: user?.vigiladoToken,
  };

  let sicovDetailSent = false;

  if (!sicovMaintenanceDown && mantenimientoIdExterno && user?.vigiladoToken) {
    try {
      await this.external.guardarPreventivo({
        ...sicovDetailPayload,
        mantenimientoId: mantenimientoIdExterno,
      });
      sicovDetailSent = true;
    } catch (err: any) {
      console.warn('[PREVENTIVE] SICOV guardarPreventivo falló, se encolará:', err?.message);
    }
  }

  if (!sicovDetailSent) {
    // Actualizar estado del registro local a pending
    await this.model.updateOne(
      { _id: doc._id },
      { $set: { sicov_sync_status: 'pending' } },
    );

    await this.sicovSync.enqueue({
      enterprise_id: user?.enterprise_id ?? '',
      recordType: 'preventive',
      localMaintenanceId: mantenimientoIdLocal!,
      localDetailId: String(doc._id),
      maintenancePayload: {
        placa: dto.placa,
        tipoId: 1,
        vigiladoId: String(vigiladoId),
        vigiladoToken: user?.vigiladoToken,
      },
      maintenanceExternalId: mantenimientoIdExterno
        ? String(mantenimientoIdExterno)
        : undefined,
      detailPayload: sicovDetailPayload,
    });
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
    // 👉 SIN FILTROS → últimos 500
    // =============================
    const noFilters =
      !q?.placa &&
      !q?.fechaDesde &&
      !q?.fechaHasta;

    // =============================
    // Pipeline con lookup de no_interno
    // =============================
    const pipeline: any[] = [
      { $match: match },
      { $sort: sort },
      ...(noFilters
        ? [{ $limit: 500 }]
        : limitParam
        ? [{ $skip: skip }, { $limit: limitParam }]
        : []),
      {
        $lookup: {
          from: 'vehicles',
          localField: 'placa',
          foreignField: 'placa',
          as: '_vehicle',
          pipeline: [{ $project: { no_interno: 1 } }],
        },
      },
      {
        $addFields: {
          no_interno: {
            $ifNull: [{ $arrayElemAt: ['$_vehicle.no_interno', 0] }, ''],
          },
        },
      },
      { $unset: '_vehicle' },
    ];

    const [items, total] = await Promise.all([
      this.model.aggregate(pipeline),
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

  // ======================================================
// FULL REPORT
// ======================================================
async getFullReportByPreventiveId(
  id: string,
  user?: { enterprise_id?: string },
) {
  if (!Types.ObjectId.isValid(id)) {
    throw new NotFoundException('ID inválido');
  }

  // 1️⃣ Buscar preventivo base
  const preventive = await this.model
    .findOne({
      _id: new Types.ObjectId(id),
      enterprise_id: user?.enterprise_id,
    })
    .lean();

  if (!preventive) {
    throw new NotFoundException('Preventivo no encontrado');
  }

  const mantenimientoId = preventive.mantenimientoId;

  if (!mantenimientoId) {
    throw new NotFoundException(
      'El preventivo no tiene mantenimiento asociado',
    );
  }

  // 2️⃣ Consultar snapshots en paralelo
  const [vehicleSnapshot, peopleSnapshot, itemResults] =
    await Promise.all([
      this.vehicleSnap
        .findOne({ mantenimientoId })
        .lean(),

      this.peopleSnap
        .findOne({ mantenimientoId })
        .lean(),

      this.itemResult
        .find({ mantenimientoId })
        .populate({
          path: 'itemId',
          select: 'tipo_parte dispositivo',
        })
        .lean(),
    ]);

  // 3️⃣ Construir JSON consolidado
  const report = {
    preventive: {
      _id: preventive._id,
      placa: preventive.placa,
      fecha: preventive.fecha,
      hora: preventive.hora,
      nit: preventive.nit,
      razonSocial: preventive.razonSocial,
      tipoIdentificacion: preventive.tipoIdentificacion,
      numeroIdentificacion: preventive.numeroIdentificacion,
      nombresResponsable: preventive.nombresResponsable,
      detalleActividades: preventive.detalleActividades,
      evidencia_foto: (preventive as any).evidencia_foto ?? null,
      estado: preventive.estado,

      scheduledAt: preventive.scheduledAt ?? null,
      executedAt: preventive.executedAt ?? null,
      dueDate: preventive.dueDate ?? null,
    },

    vehicle: vehicleSnapshot ?? null,

    people: peopleSnapshot ?? null,

    items: itemResults ?? [],
  };

  return report;
}

// ======================================================
// MARCAR COMO EJECUTADO → dispara envío a SICOV
// ======================================================
async markAsExecuted(
  id: string,
  executedAt: Date,
  user?: {
    enterprise_id?: string;
    sub?: string;
    vigiladoId?: number;
    vigiladoToken?: string;
    jwt?: string;
  },
) {
  const doc = await this.model.findOne({
    _id: id,
    enterprise_id: user?.enterprise_id,
    isPlanned: true,
  });

  if (!doc) throw new NotFoundException('Preventivo planeado no encontrado');

  // Actualizar fecha de ejecución
  doc.executedAt = executedAt;
  doc.isPlanned = false;

  const vigiladoId = user?.vigiladoId ?? Number(process.env.SICOV_VIGILADO_ID);

  // Ahora sí crear en SICOV
  let mantenimientoIdExterno: number | null = null;
  let sicovDown = false;

  try {
    const { doc: maintDoc, externalId, sicovDown: down } = await this.maintenanceService.create(
      { placa: doc.placa, tipoId: 1 as const, vigiladoId },
      { ...user, vigiladoId },
      { awaitExternal: false }, // 🔥 No esperar SICOV, procesar en background
    );

    const localId = (maintDoc as any)?._id ?? (maintDoc as any)?.id;
    if (localId) doc.mantenimientoId = String(localId);
    if (externalId) mantenimientoIdExterno = Number(externalId);
    sicovDown = !!down;
  } catch {
    sicovDown = true;
  }

  doc.sicov_sync_status = sicovDown ? 'pending' : 'synced';
  await doc.save();

  // Enviar detalle a SICOV si hay externalId
  if (!sicovDown && mantenimientoIdExterno) {
    try {
      await this.external.guardarPreventivo({
        mantenimientoId: mantenimientoIdExterno,
        nit: doc.nit,
        razonSocial: doc.razonSocial,
        tipoIdentificacion: doc.tipoIdentificacion,
        numeroIdentificacion: doc.numeroIdentificacion,
        nombresResponsable: doc.nombresResponsable,
        detalleActividades: doc.detalleActividades,
        fecha: doc.fecha,
        hora: doc.hora,
        vigiladoId: String(vigiladoId),
        vigiladoToken: user?.vigiladoToken,
      });
    } catch {
      await this.model.updateOne(
        { _id: doc._id },
        { $set: { sicov_sync_status: 'pending' } },
      );
      await this.sicovSync.enqueue({
        enterprise_id: user?.enterprise_id ?? '',
        recordType: 'preventive',
        localMaintenanceId: doc.mantenimientoId,
        localDetailId: String(doc._id),
        maintenancePayload: {
          placa: doc.placa,
          tipoId: 1,
          vigiladoId: String(vigiladoId),
          vigiladoToken: user?.vigiladoToken,
        },
        detailPayload: {
          nit: doc.nit,
          razonSocial: doc.razonSocial,
          tipoIdentificacion: doc.tipoIdentificacion,
          numeroIdentificacion: doc.numeroIdentificacion,
          nombresResponsable: doc.nombresResponsable,
          detalleActividades: doc.detalleActividades,
          fecha: doc.fecha,
          hora: doc.hora,
        },
      });
    }
  }

  return doc;
}

}
