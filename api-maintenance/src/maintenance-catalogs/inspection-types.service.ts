import { Injectable, BadRequestException } from '@nestjs/common';
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
  createForCompany(company: string, dto: CreateInspectionTypeDto) {
    return this.model.create({
      ...dto,
      clase_vehiculo: dto.clase_vehiculo || 'GENERAL',
      company: new Types.ObjectId(company),
    });
  }

  /** Actualizar campos de un ítem propio */
  update(id: string, company: string, dto: UpdateInspectionTypeDto) {
    return this.model.findOneAndUpdate(
      { _id: id, company: new Types.ObjectId(company) },
      { $set: dto },
      { new: true },
    );
  }

  /** Habilitar / deshabilitar */
  async toggle(id: string, company: string) {
    const doc = await this.model.findOne(
      { _id: id, company: new Types.ObjectId(company) },
    ).lean();
    if (!doc) return null;
    return this.model.findOneAndUpdate(
      { _id: id, company: new Types.ObjectId(company) },
      { $set: { enabled: !doc.enabled } },
      { new: true },
    );
  }
}
