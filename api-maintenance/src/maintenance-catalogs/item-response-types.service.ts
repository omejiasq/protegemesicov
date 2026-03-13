import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ItemResponseType,
  ItemResponseTypeDocument,
} from '../schema/item-response-type.schema';
import { CreateItemResponseTypeDto } from './dto/create-item-response-type.dto';
import { UpdateItemResponseTypeDto } from './dto/update-item-response-type.dto';

@Injectable()
export class ItemResponseTypesService {
  constructor(
    @InjectModel(ItemResponseType.name)
    private readonly model: Model<ItemResponseTypeDocument>,
  ) {}

  /** Habilitados de la empresa, opcionalmente filtrado por tipo — para mobile */
  findByCompany(company: string, tipo?: string) {
    if (!Types.ObjectId.isValid(company)) {
      throw new BadRequestException('company inválido');
    }
    const filter: any = {
      company: new Types.ObjectId(company),
      enabled: true,
    };
    if (tipo) filter.tipo_mantenimiento = tipo;
    return this.model.find(filter).sort({ tipo_mantenimiento: 1, orden: 1 }).lean();
  }

  /** Todos (habilitados + deshabilitados) de la empresa — para admin web */
  findAllByCompany(company: string, tipo?: string) {
    if (!Types.ObjectId.isValid(company)) {
      throw new BadRequestException('company inválido');
    }
    const filter: any = { company: new Types.ObjectId(company) };
    if (tipo) filter.tipo_mantenimiento = tipo;
    return this.model.find(filter).sort({ tipo_mantenimiento: 1, orden: 1 }).lean();
  }

  createForCompany(company: string, dto: CreateItemResponseTypeDto) {
    return this.model.create({
      ...dto,
      company: new Types.ObjectId(company),
    });
  }

  update(id: string, company: string, dto: UpdateItemResponseTypeDto) {
    return this.model.findOneAndUpdate(
      { _id: id, company: new Types.ObjectId(company) },
      { $set: dto },
      { new: true },
    );
  }

  async toggle(id: string, company: string) {
    const doc = await this.model
      .findOne({ _id: id, company: new Types.ObjectId(company) })
      .lean();
    if (!doc) return null;
    return this.model.findOneAndUpdate(
      { _id: id, company: new Types.ObjectId(company) },
      { $set: { enabled: !doc.enabled } },
      { new: true },
    );
  }
}
