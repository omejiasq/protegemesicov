import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vehicle, VehicleDocument } from '../schema/vehicle.schema';
import { BadRequestException } from '@nestjs/common';

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

      document_type_driver2: dto.document_type_driver2 ?? null,
      documentNumber_driver2: dto.documentNumber_driver2 ?? null,
      name_driver2: dto.name_driver2 ?? null,

    });

    return vehicle.toObject();
  }

  /* =====================================================
   * GET ALL
   * ===================================================== */

  
  async getAll(query: any, user: any) {
    if (!user?.enterprise_id) {
      throw new BadRequestException('enterprise_id no presente en el token');
    }
  
    const enterpriseId = Types.ObjectId.isValid(user.enterprise_id)
      ? new Types.ObjectId(user.enterprise_id)
      : null;
  
    if (!enterpriseId) {
      throw new BadRequestException('enterprise_id inválido');
    }
  
    const match: any = {
      enterprise_id: enterpriseId,
    };
  
    if (query?.placa) {
      match.placa = { $regex: query.placa, $options: 'i' };
    }
  
    if (query?.estado !== undefined) {
      match.estado = query.estado === 'true' || query.estado === true;
    }
  
    return this.vehicleModel.aggregate([
      { $match: match },
  
      {
        $lookup: {
          from: 'users',           // colección real
          localField: 'driver_id', // Vehicle.driver_id
          foreignField: '_id',     // User._id
          as: 'driver',
        },
      },
  
      {
        $unwind: {
          path: '$driver',
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
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

  async getByPlate(plate: string, user: UserCtx) {
    if (!user?.enterprise_id) {
      throw new BadRequestException('enterprise_id no presente en el token');
    }
  
    const enterpriseId = Types.ObjectId.isValid(user.enterprise_id)
      ? new Types.ObjectId(user.enterprise_id)
      : null;
  
    if (!enterpriseId) {
      throw new BadRequestException('enterprise_id inválido');
    }
  
    const result = await this.vehicleModel.aggregate([
      // ================= PLACA (case-insensitive) =================
      {
        $match: {
          placa: { $regex: `^${plate}$`, $options: 'i' },
        },
      },
  
      // ================= NORMALIZAR enterprise_id =================
      {
        $addFields: {
          enterpriseObjId: {
            $cond: [
              { $eq: [{ $type: '$enterprise_id' }, 'objectId'] },
              '$enterprise_id',
              { $toObjectId: '$enterprise_id' },
            ],
          },
        },
      },
  
      // ================= MATCH POR EMPRESA =================
      {
        $match: {
          enterpriseObjId: enterpriseId,
        },
      },
  
      // ================= CONDUCTOR =================
      {
        $lookup: {
          from: 'users',
          localField: 'driver_id',
          foreignField: '_id',
          as: 'driver',
        },
      },
      {
        $unwind: {
          path: '$driver',
          preserveNullAndEmptyArrays: true,
        },
      },
  
      // ================= EMPRESA =================
      {
        $lookup: {
          from: 'enterprises',
          localField: 'enterpriseObjId',
          foreignField: '_id',
          as: 'enterprise',
        },
      },
      {
        $unwind: {
          path: '$enterprise',
          preserveNullAndEmptyArrays: true,
        },
      },
  
      // ================= SOLO UN DOCUMENTO =================
      { $limit: 1 },
    ]);
  
    if (!result.length) {
      throw new NotFoundException('Vehículo no encontrado');
    }
  
    return result[0];
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
    const now = new Date();
  
    Object.keys(dto).forEach((key) => {
      // fechas de vencimiento / expedición
      if (key.startsWith('expiration_') || key.startsWith('expedition_')) {
        update[key] = this.normalizeDate(dto[key]);
        return;
      }
  
      // ids de conductores
      if (key === 'driver_id' || key === 'driver2_id') {
        update[key] = dto[key] ? new Types.ObjectId(dto[key]) : null;
        return;
      }
  
      // cambio de estado activo/inactivo
      if (key === 'active') {
        const newActive = dto.active === true || dto.active === 'true';
  
        update.active = newActive;
  
        if (newActive) {
          // reactivación
          update.fecha_activacion = now;
          update.nota_desactivacion = null;
        } else {
          // desactivación
          update.fecha_ultima_desactivacion = now;
          update.nota_desactivacion = dto.nota_desactivacion ?? null;
        }
  
        return;
      }
  
      // cualquier otro campo
      update[key] = dto[key];
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
