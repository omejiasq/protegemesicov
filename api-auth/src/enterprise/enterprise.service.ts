import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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

  // ✅ ACTIVAR / DESACTIVAR empresa
  async toggleActive(
    id: string,
    dto: { active: boolean; reason?: string },
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid enterprise id');
    }

    const enterprise = await this.enterpriseModel.findById(id);

    if (!enterprise) {
      throw new NotFoundException('Enterprise not found');
    }

    // Evitar operación redundante
    if (enterprise.active === dto.active) {
      throw new BadRequestException(
        dto.active
          ? 'La empresa ya está activa'
          : 'La empresa ya está desactivada',
      );
    }

    const update: Record<string, any> = {
      active: dto.active,
    };

    if (dto.active) {
      // Al activar: registrar fecha y limpiar razón
      update.activatedAt = new Date();
      update.deactivationReason = null;
    } else {
      // Al desactivar: registrar fecha y razón
      update.deactivatedAt = new Date();
      update.deactivationReason = dto.reason ?? 'Sin motivo especificado';
    }

    const updated = await this.enterpriseModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true },
    );

    return updated;
  }
}