import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TipoVehiculoTipoMantenimiento,
  TipoVehiculoTipoMantenimientoDocument,
} from '../schema/tipos-vehiculos-tipos-mantenimientos.schema';
import { CreateMaintenanceTypeDto } from './dto/create-maintenance-type.dto';
import { UpdateMaintenanceTypeDto } from './dto/update-maintenance-type.dto';

@Injectable()
export class MaintenanceTypesService {
  constructor(
    @InjectModel(TipoVehiculoTipoMantenimiento.name)
    private model: Model<TipoVehiculoTipoMantenimientoDocument>,
  ) {}

  /** Solo habilitados — para mobile */
  findByCompany(company: string) {
    return this.model
      .find({ company: new Types.ObjectId(company), enabled: true })
      .sort({ tipo_parte: 1, orden: 1, dispositivo: 1 })
      .lean();
  }

  /** Todos (habilitados + deshabilitados) — para admin web */
  findAllByCompany(company: string) {
    return this.model
      .find({ company: new Types.ObjectId(company) })
      .sort({ tipo_parte: 1, orden: 1, dispositivo: 1 })
      .lean();
  }

  /** Crear (company viene del JWT) */
  createForCompany(company: string, dto: CreateMaintenanceTypeDto) {
    return this.model.create({
      ...dto,
      clase_vehiculo: dto.clase_vehiculo || 'GENERAL',
      company: new Types.ObjectId(company),
    });
  }

  /** Actualizar campos */
  update(id: string, company: string, dto: UpdateMaintenanceTypeDto) {
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
