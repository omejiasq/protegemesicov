import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  TipoVehiculoTipoInspeccion,
  TipoVehiculoTipoInspeccionDocument,
} from '../schema/tipos-vehiculos-tipos-inspecciones.schema';

import { CreateInspectionTypeDto } from './dto/create-inspection-type.dto';

@Injectable()
export class InspectionTypesService {
  private readonly BASE_COMPANY_ID = new Types.ObjectId(
    '693b66575a43ad156758e84c',
  );

  constructor(
    @InjectModel(TipoVehiculoTipoInspeccion.name)
    private readonly model: Model<TipoVehiculoTipoInspeccionDocument>,
  ) {}

  // ================= CREATE =================
  create(dto: CreateInspectionTypeDto) {
    if (!Types.ObjectId.isValid(dto.company)) {
      throw new BadRequestException('company inválido');
    }

    return this.model.create({
      ...dto,
      company: new Types.ObjectId(dto.company),
    });
  }

  // ================= FIND BY COMPANY + BASE =================
  async findByCompany(company: string) {
    if (!Types.ObjectId.isValid(company)) {
      throw new BadRequestException('company inválido');
    }

    return this.model
      .find({
        //enabled: true,
        company: {
          $in: [
            new Types.ObjectId(company),
            this.BASE_COMPANY_ID,
          ],
        },
      })
      .sort({ tipo_parte: 1, dispositivo: 1 })
      .lean();
  }
}
