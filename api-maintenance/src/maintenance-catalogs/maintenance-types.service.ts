import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TipoVehiculoTipoMantenimiento,
  TipoVehiculoTipoMantenimientoDocument,
} from '../schema/tipos-vehiculos-tipos-mantenimientos.schema';
import { CreateMaintenanceTypeDto } from './dto/create-maintenance-type.dto';

@Injectable()
export class MaintenanceTypesService {
  constructor(
    @InjectModel(TipoVehiculoTipoMantenimiento.name)
    private model: Model<TipoVehiculoTipoMantenimientoDocument>,
  ) {}

  create(dto: CreateMaintenanceTypeDto) {
    return this.model.create({
      ...dto,
      company: new Types.ObjectId(dto.company),
    });
  }

  findByCompany(company: string) {
    return this.model
      .find({ company: new Types.ObjectId(company), enabled: true })
      .sort({ tipo_parte: 1, dispositivo: 1 });
  }
}
