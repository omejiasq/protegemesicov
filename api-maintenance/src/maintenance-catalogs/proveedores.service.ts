import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Proveedor, ProveedorDocument } from '../schema/proveedor.schema';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectModel(Proveedor.name)
    private model: Model<ProveedorDocument>,
  ) {}

  /** Solo habilitados — para selects en formularios */
  findByCompany(company: string) {
    return this.model
      .find({ company: new Types.ObjectId(company), enabled: true })
      .sort({ razon_social: 1 })
      .lean();
  }

  /** Todos (habilitados + deshabilitados) — para gestión admin web */
  findAllByCompany(company: string) {
    return this.model
      .find({ company: new Types.ObjectId(company) })
      .sort({ razon_social: 1 })
      .lean();
  }

  /** Crear proveedor */
  createForCompany(company: string, dto: CreateProveedorDto) {
    return this.model.create({
      ...dto,
      company: new Types.ObjectId(company),
    });
  }

  /** Actualizar campos */
  update(id: string, company: string, dto: UpdateProveedorDto) {
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
