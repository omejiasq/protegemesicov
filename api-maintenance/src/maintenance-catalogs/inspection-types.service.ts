import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  TipoVehiculoTipoInspeccion,
  TipoVehiculoTipoInspeccionDocument,
} from '../schema/tipos-vehiculos-tipos-inspecciones.schema';

import { CreateInspectionTypeDto } from './dto/create-inspection-type.dto';
import { UpdateInspectionTypeDto } from './dto/update-inspection-type.dto';

@Injectable()
export class InspectionTypesService {
  /** Empresa base con ítems globales compartidos (solo lectura para mobile) */
  private readonly BASE_COMPANY_ID = new Types.ObjectId(
    '693b66575a43ad156758e84c',
  );

  constructor(
    @InjectModel(TipoVehiculoTipoInspeccion.name)
    private readonly model: Model<TipoVehiculoTipoInspeccionDocument>,
  ) {}

  /** Solo habilitados, únicamente los ítems de la empresa — para mobile */
  findByCompany(company: string) {
    if (!Types.ObjectId.isValid(company)) {
      throw new BadRequestException('company inválido');
    }
    return this.model
      .find({
        company: new Types.ObjectId(company),
        enabled: true,
      })
      .sort({ tipo_parte: 1, orden: 1, dispositivo: 1 })
      .lean();
  }

  /** Todos los ítems PROPIOS de la empresa (habilitados + deshabilitados) — para admin web */
  findAllByCompany(company: string) {
    if (!Types.ObjectId.isValid(company)) {
      throw new BadRequestException('company inválido');
    }
    return this.model
      .find({ company: new Types.ObjectId(company) })
      .sort({ tipo_parte: 1, orden: 1, dispositivo: 1 })
      .lean();
  }

  /** Crear ítem propio de la empresa (company viene del JWT) */
  async createForCompany(company: string, dto: CreateInspectionTypeDto) {
    if (!Types.ObjectId.isValid(company)) {
      throw new BadRequestException('company inválido');
    }

    const companyObjectId = new Types.ObjectId(company);
    const claseVehiculo = dto.clase_vehiculo || 'GENERAL';

    // Verificar si ya existe un ítem con la misma combinación
    const existingItem = await this.model.findOne({
      company: companyObjectId,
      clase_vehiculo: claseVehiculo,
      dispositivo: dto.dispositivo,
    });

    if (existingItem) {
      throw new ConflictException(
        `Ya existe un tipo de inspección para la clase de vehículo '${claseVehiculo}' y dispositivo '${dto.dispositivo}'`
      );
    }

    try {
      return await this.model.create({
        ...dto,
        clase_vehiculo: claseVehiculo,
        company: companyObjectId,
      });
    } catch (error: any) {
      // Manejar error de duplicado en caso de condición de carrera
      if (error.code === 11000) {
        throw new ConflictException(
          `Ya existe un tipo de inspección para la clase de vehículo '${claseVehiculo}' y dispositivo '${dto.dispositivo}'`
        );
      }
      throw error;
    }
  }

  /** Actualizar campos de un ítem propio */
  async update(id: string, company: string, dto: UpdateInspectionTypeDto) {
    if (!Types.ObjectId.isValid(company) || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID o company inválido');
    }

    const companyObjectId = new Types.ObjectId(company);

    // Si se actualiza clase_vehiculo o dispositivo, verificar que no cause duplicado
    if (dto.clase_vehiculo || dto.dispositivo) {
      // Obtener el documento actual
      const currentDoc = await this.model.findOne({
        _id: id,
        company: companyObjectId,
      });

      if (!currentDoc) {
        throw new BadRequestException('Tipo de inspección no encontrado');
      }

      const newClaseVehiculo = dto.clase_vehiculo || currentDoc.clase_vehiculo;
      const newDispositivo = dto.dispositivo || currentDoc.dispositivo;

      // Verificar si ya existe otro ítem con la nueva combinación
      const existingItem = await this.model.findOne({
        _id: { $ne: id }, // Excluir el documento actual
        company: companyObjectId,
        clase_vehiculo: newClaseVehiculo,
        dispositivo: newDispositivo,
      });

      if (existingItem) {
        throw new ConflictException(
          `Ya existe otro tipo de inspección para la clase de vehículo '${newClaseVehiculo}' y dispositivo '${newDispositivo}'`
        );
      }
    }

    try {
      return await this.model.findOneAndUpdate(
        { _id: id, company: companyObjectId },
        { $set: dto },
        { new: true },
      );
    } catch (error: any) {
      // Manejar error de duplicado en caso de condición de carrera
      if (error.code === 11000) {
        throw new ConflictException(
          'La combinación de clase de vehículo y dispositivo ya existe'
        );
      }
      throw error;
    }
  }

  /** Habilitar / deshabilitar */
  async toggle(id: string, company: string) {
    if (!Types.ObjectId.isValid(company) || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID o company inválido');
    }

    const companyObjectId = new Types.ObjectId(company);
    const doc = await this.model.findOne(
      { _id: id, company: companyObjectId },
    ).lean();

    if (!doc) {
      throw new BadRequestException('Tipo de inspección no encontrado');
    }

    return this.model.findOneAndUpdate(
      { _id: id, company: companyObjectId },
      { $set: { enabled: !doc.enabled } },
      { new: true },
    );
  }
}
