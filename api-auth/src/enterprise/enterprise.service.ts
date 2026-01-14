import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Enterprise } from './schemas/enterprise.schema';

@Injectable()
export class EnterpriseService {
  constructor(
    @InjectModel(Enterprise.name)
    private readonly enterpriseModel: Model<Enterprise>,
  ) {}

  // ✅ CREAR empresa
  async create(data: Partial<Enterprise>) {
    const created = new this.enterpriseModel(data);
    return created.save();
  }

  // ✅ ACTUALIZAR empresa (todos los campos)
  async update(id: string, data: Partial<Enterprise>) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid enterprise id');
    }

    const updated = await this.enterpriseModel.findByIdAndUpdate(
      id,
      { $set: data },
      {
        new: true,
        runValidators: true,
        strict: true,
      },
    );

    if (!updated) {
      throw new NotFoundException('Enterprise not found');
    }

    return updated;
  }

  // ✅ BUSCAR por ID
  async findById(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid enterprise id');
    }

    const ent = await this.enterpriseModel.findById(id).lean();

    if (!ent) {
      throw new NotFoundException('Enterprise not found');
    }

    return ent;
  }

  // ✅ LISTAR todas
  async findAll() {
    return this.enterpriseModel.find().lean();
  }
}
