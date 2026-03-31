import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Fuec, FuecDocument } from '../schema/fuec.schema';
import { Vehicle, VehicleDocument } from '../schema/vehicle.schema';
import { UserRef, UserRefDocument } from '../schema/user-ref.schema';

type UserCtx = {
  enterprise_id: string;
  sub?: string;
  username?: string;
  tipo_habilitacion?: string;
};

@Injectable()
export class FuecService {
  constructor(
    @InjectModel(Fuec.name)
    private readonly fuecModel: Model<FuecDocument>,

    @InjectModel(Vehicle.name)
    private readonly vehicleModel: Model<VehicleDocument>,

    @InjectModel(UserRef.name)
    private readonly userRefModel: Model<UserRefDocument>,
  ) {}

  // ── Generar consecutivo ──────────────────────────────────────────
  private async nextConsecutivo(enterpriseId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `FUEC-${year}-`;

    const last = await this.fuecModel
      .findOne({ enterprise_id: new Types.ObjectId(enterpriseId), numero_fuec: { $regex: `^${prefix}` } })
      .sort({ numero_fuec: -1 })
      .lean();

    let seq = 1;
    if (last) {
      const parts = last.numero_fuec.split('-');
      seq = (parseInt(parts[parts.length - 1], 10) || 0) + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  // ── CREATE ───────────────────────────────────────────────────────
  async create(dto: any, user: UserCtx) {
    if (!user?.enterprise_id) throw new BadRequestException('Empresa no definida');

    const enterpriseId = new Types.ObjectId(user.enterprise_id);

    // Cargar vehículo para snapshot
    const vehicle = await this.vehicleModel
      .findOne({ _id: new Types.ObjectId(dto.vehicle_id), enterprise_id: enterpriseId })
      .lean();

    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');

    if (!vehicle.active) {
      throw new BadRequestException(`El vehículo ${vehicle.placa} no está activo`);
    }

    // Cargar conductor si viene driver_id
    let conductorData: any = {
      conductor_nombre: dto.conductor_nombre,
      conductor_cedula: dto.conductor_cedula,
      conductor_no_licencia: dto.conductor_no_licencia ?? null,
      conductor_categoria_licencia: dto.conductor_categoria_licencia ?? null,
      conductor_vencimiento_licencia: dto.conductor_vencimiento_licencia
        ? new Date(dto.conductor_vencimiento_licencia)
        : null,
    };

    if (dto.driver_id) {
      const driver = await this.userRefModel
        .findOne({ _id: new Types.ObjectId(dto.driver_id) })
        .lean();

      if (driver) {
        const u = driver.usuario ?? {};
        conductorData = {
          conductor_nombre: [u.nombre, u.apellido].filter(Boolean).join(' ') || conductorData.conductor_nombre,
          conductor_cedula: u.documentNumber ?? conductorData.conductor_cedula,
          conductor_no_licencia: driver.no_licencia_conduccion ?? null,
          conductor_categoria_licencia: driver.categoria_licencia ?? null,
          conductor_vencimiento_licencia: driver.vencimiento_licencia_conduccion ?? null,
        };
      }
    }

    const numero_fuec = await this.nextConsecutivo(user.enterprise_id);

    const fuec = await this.fuecModel.create({
      numero_fuec,
      enterprise_id: enterpriseId,

      contratante_nombre: dto.contratante_nombre,
      contratante_nit: dto.contratante_nit,
      descripcion_servicio: dto.descripcion_servicio,
      origen: dto.origen,
      destino: dto.destino,
      fecha_servicio: new Date(dto.fecha_servicio),
      hora_servicio: dto.hora_servicio,

      vehicle_id: vehicle._id,
      placa: vehicle.placa,
      clase: vehicle.clase ?? null,
      marca: vehicle.marca ?? null,
      modelo: vehicle.modelo ?? null,
      color: vehicle.color ?? null,
      no_tarjeta_opera: vehicle.no_tarjeta_opera ?? null,
      expiration_tarjeta_opera: vehicle.expiration_tarjeta_opera ?? null,
      no_soat: vehicle.no_soat ?? null,
      expiration_soat: vehicle.expiration_soat ?? null,
      no_rtm: vehicle.no_rtm ?? null,
      expiration_rtm: vehicle.expiration_rtm ?? null,

      driver_id: dto.driver_id ? new Types.ObjectId(dto.driver_id) : undefined,
      ...conductorData,

      estado: 'borrador',
      created_by: user.sub,

      // Snapshot empresa para el PDF (enviado desde el frontend)
      enterprise_snapshot: dto.enterprise_snapshot ?? {},
    });

    return fuec.toObject();
  }

  // ── EMIT (cambiar a emitido) ─────────────────────────────────────
  async emit(id: string, user: UserCtx) {
    const fuec = await this.fuecModel.findOne({
      _id: id,
      enterprise_id: new Types.ObjectId(user.enterprise_id),
    });
    if (!fuec) throw new NotFoundException('FUEC no encontrado');
    if (fuec.estado !== 'borrador') {
      throw new BadRequestException('Solo los borradores pueden emitirse');
    }
    fuec.estado = 'emitido';
    await fuec.save();
    return fuec.toObject();
  }

  // ── ANULAR ───────────────────────────────────────────────────────
  async anular(id: string, motivo: string, user: UserCtx) {
    const fuec = await this.fuecModel.findOne({
      _id: id,
      enterprise_id: new Types.ObjectId(user.enterprise_id),
    });
    if (!fuec) throw new NotFoundException('FUEC no encontrado');
    if (fuec.estado === 'anulado') throw new BadRequestException('FUEC ya está anulado');

    fuec.estado = 'anulado';
    fuec.motivo_anulacion = motivo ?? 'Sin motivo';
    await fuec.save();
    return fuec.toObject();
  }

  // ── FIND ALL ─────────────────────────────────────────────────────
  async findAll(
    user: UserCtx,
    query: {
      page?: number;
      limit?: number;
      placa?: string;
      estado?: string;
      fecha_desde?: string;
      fecha_hasta?: string;
    },
  ) {
    const filter: any = { enterprise_id: new Types.ObjectId(user.enterprise_id) };

    if (query.placa) {
      filter.placa = { $regex: query.placa.trim(), $options: 'i' };
    }
    if (query.estado) {
      filter.estado = query.estado;
    }
    if (query.fecha_desde || query.fecha_hasta) {
      filter.fecha_servicio = {};
      if (query.fecha_desde) filter.fecha_servicio.$gte = new Date(query.fecha_desde);
      if (query.fecha_hasta) filter.fecha_servicio.$lte = new Date(query.fecha_hasta);
    }

    const total = await this.fuecModel.countDocuments(filter);
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const data = await this.fuecModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return { data, total, page, limit };
  }

  // ── FIND ONE ─────────────────────────────────────────────────────
  async findOne(id: string, user: UserCtx) {
    const fuec = await this.fuecModel
      .findOne({ _id: id, enterprise_id: new Types.ObjectId(user.enterprise_id) })
      .lean();
    if (!fuec) throw new NotFoundException('FUEC no encontrado');
    return fuec;
  }

  // ── UPDATE (solo borrador) ───────────────────────────────────────
  async update(id: string, dto: any, user: UserCtx) {
    const fuec = await this.fuecModel.findOne({
      _id: id,
      enterprise_id: new Types.ObjectId(user.enterprise_id),
    });
    if (!fuec) throw new NotFoundException('FUEC no encontrado');
    if (fuec.estado !== 'borrador') {
      throw new BadRequestException('Solo se pueden editar FUECs en borrador');
    }

    const allowed = [
      'contratante_nombre', 'contratante_nit', 'descripcion_servicio',
      'origen', 'destino', 'fecha_servicio', 'hora_servicio',
      'conductor_nombre', 'conductor_cedula', 'conductor_no_licencia',
      'conductor_categoria_licencia', 'conductor_vencimiento_licencia',
    ];

    for (const key of allowed) {
      if (dto[key] !== undefined) {
        (fuec as any)[key] = dto[key];
      }
    }
    if (dto.fecha_servicio) fuec.fecha_servicio = new Date(dto.fecha_servicio);

    await fuec.save();
    return fuec.toObject();
  }
}
