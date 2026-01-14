import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vehicle, VehicleDocument } from '../schema/vehicle.schema';

type UserCtx = {
  enterprise_id: string;
  sub?: string;
};

@Injectable()
export class VehiclesService {
  constructor(
    @InjectModel(Vehicle.name)
    private readonly vehicleModel: Model<VehicleDocument>,
  ) {}

  /* =====================================================
   * HELPERS
   * ===================================================== */
  private normalizeDate(value?: string | Date): Date | null {
    if (!value) return null;
    const d = new Date(value);
    d.setHours(0, 0, 0, 0); // solo fecha
    return isNaN(d.getTime()) ? null : d;
  }

  /* =====================================================
   * CREATE
   * ===================================================== */
  async create(dto: any, user: UserCtx) {
    if (!user?.enterprise_id) {
      throw new ConflictException('Empresa no definida');
    }

    const enterpriseId = new Types.ObjectId(user.enterprise_id);

    const exists = await this.vehicleModel.exists({
      placa: dto.placa,
      enterprise_id: enterpriseId,
    });

    if (exists) {
      throw new ConflictException(
        'La placa ya existe para esta empresa',
      );
    }

    const vehicle = await this.vehicleModel.create({
      enterprise_id: enterpriseId,
      createdBy: user.sub,

      placa: dto.placa,
      nivelServicio: Number(dto.nivelServicio),
      clase: dto.clase ?? null,

      estado: dto.estado ?? true,
      active: dto.active ?? true,

      driver_id: dto.driver_id
        ? new Types.ObjectId(dto.driver_id)
        : undefined,
      driver2_id: dto.driver2_id
        ? new Types.ObjectId(dto.driver2_id)
        : undefined,

      marca: dto.marca ?? null,
      Linea: dto.Linea ?? null,
      servicio: dto.servicio ?? null,
      kilometraje: dto.kilometraje ?? null,
      modelo: dto.modelo ?? null,
      combustible: dto.combustible ?? null,
      color: dto.color ?? null,
      cilindraje: dto.cilindraje ?? null,

      no_rtm: dto.no_rtm ?? null,
      expedition_rtm: this.normalizeDate(dto.expedition_rtm),
      expiration_rtm: this.normalizeDate(dto.expiration_rtm),

      no_soat: dto.no_soat ?? null,
      expedition_soat: this.normalizeDate(dto.expedition_soat),
      expiration_soat: this.normalizeDate(dto.expiration_soat),

      no_rcc: dto.no_rcc ?? null,
      expiration_rcc: this.normalizeDate(dto.expiration_rcc),

      no_rce: dto.no_rce ?? null,
      expiration_rce: this.normalizeDate(dto.expiration_rce),

      no_tecnomecanica: dto.no_tecnomecanica ?? null,
      expiration_tecnomecanica: this.normalizeDate(dto.expiration_tecnomecanica),

      no_tarjeta_opera: dto.no_tarjeta_opera ?? null,
      expiration_tarjeta_opera: this.normalizeDate(dto.expiration_tarjeta_opera),

      nombre_aseguradora: dto.nombre_aseguradora ?? null,
      tipo_vehiculo: dto.tipo_vehiculo ?? null,
      modalidad: dto.modalidad ?? null,
      no_interno: dto.no_interno ?? null,
      motor: dto.motor ?? null,
      to: dto.to ?? null,
      vencim: dto.vencim ?? null,
      no_chasis: dto.no_chasis ?? null,
      tipo: dto.tipo ?? null,
      capacidad: dto.capacidad ?? null,

      nombre_propietario: dto.nombre_propietario ?? null,
      cedula_propietario: dto.cedula_propietario ?? null,
      telefono_propietario: dto.telefono_propietario ?? null,
      direccion_propietario: dto.direccion_propietario ?? null,
    });

    return vehicle.toObject();
  }

  /* =====================================================
   * GET ALL
   * ===================================================== */
  async getAll(query: any, user: UserCtx) {
    const filter: any = {
      enterprise_id: new Types.ObjectId(user.enterprise_id),
    };

    if (query.placa) {
      filter.placa = { $regex: query.placa, $options: 'i' };
    }

    if (query.estado !== undefined) {
      filter.estado = query.estado === 'true' || query.estado === true;
    }

    return this.vehicleModel.find(filter).lean();
  }

  /* =====================================================
   * GET BY ID
   * ===================================================== */
  async getById(id: string, user: UserCtx) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const vehicle = await this.vehicleModel.findOne({
      _id: new Types.ObjectId(id),
      enterprise_id: new Types.ObjectId(user.enterprise_id),
    }).lean();

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    return vehicle;
  }

  /* =====================================================
   * UPDATE
   * (sirve para TODOS los campos)
   * ===================================================== */
  async updateById(id: string, dto: any, user: UserCtx) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const update: any = {};

    Object.keys(dto).forEach((key) => {
      if (key.startsWith('expiration_') || key.startsWith('expedition_')) {
        update[key] = this.normalizeDate(dto[key]);
      } else if (key === 'driver_id' || key === 'driver2_id') {
        update[key] = dto[key]
          ? new Types.ObjectId(dto[key])
          : null;
      } else {
        update[key] = dto[key];
      }
    });

    const vehicle = await this.vehicleModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        enterprise_id: new Types.ObjectId(user.enterprise_id),
      },
      { $set: update },
      { new: true },
    );

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    return vehicle.toObject();
  }

  /* =====================================================
   * TOGGLE ESTADO
   * ===================================================== */
  async toggleState(id: string, user: UserCtx) {
    const vehicle = await this.vehicleModel.findOne({
      _id: new Types.ObjectId(id),
      enterprise_id: new Types.ObjectId(user.enterprise_id),
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    vehicle.estado = !vehicle.estado;
    await vehicle.save();

    return {
      _id: vehicle._id,
      estado: vehicle.estado,
    };
  }
}
