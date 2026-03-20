import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Enterprise } from './schemas/enterprise.schema';
import { UpsertEnterpriseAdminDto } from './dto/upsert-enterprise-admin.dto';

@Injectable()
export class EnterpriseService {
  constructor(
    @InjectModel(Enterprise.name)
    private readonly enterpriseModel: Model<Enterprise>,
  ) {}

  // ✅ CREAR empresa (superadmin)
  async createAdmin(dto: UpsertEnterpriseAdminDto) {
    const vigiladoId =
      dto.vigiladoId !== undefined
        ? dto.vigiladoId
        : dto.document_number
          ? parseInt(dto.document_number, 10) || null
          : null;

    const created = new this.enterpriseModel({
      ...dto,
      document_type: 'NIT',
      admin: false,
      vigiladoId,
    });
    return created.save();
  }

  // ✅ ACTUALIZAR empresa (superadmin) — nunca permite cambiar el campo admin
  async updateAdmin(id: string, dto: Partial<UpsertEnterpriseAdminDto>) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid enterprise id');
    }

    const update: Record<string, any> = { ...dto };

    // Auto-update vigiladoId si cambia document_number y no se envió vigiladoId
    if (dto.document_number !== undefined && dto.vigiladoId === undefined) {
      update.vigiladoId = parseInt(dto.document_number, 10) || null;
    }

    // Nunca permitir cambiar admin a true
    delete update.admin;

    const updated = await this.enterpriseModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    );

    if (!updated) {
      throw new NotFoundException('Enterprise not found');
    }

    return updated;
  }

  // ✅ CREAR empresa (uso interno legado)
  async create(data: Partial<Enterprise>) {
    const created = new this.enterpriseModel(data);
    return created.save();
  }

  // ✅ ACTUALIZAR empresa (uso interno legado)
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

  // ✅ ACTUALIZAR campos propios (admin de empresa sobre su propia empresa)
  async updateOwn(id: string, dto: {
    logo?: string;
    specialized_center_name?: string;
    specialized_center_document_number?: string;
    specialized_center_document_type?: number;
    mechanic_document_type?: number;
    mechanic_document_number?: string;
    mechanic_name?: string;
    default_inspector_id?: string | null;
    default_inspector_document_type?: number | null;
    default_inspector_document_number?: string;
    default_inspector_name?: string;
  }) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid enterprise id');
    }
    const updated = await this.enterpriseModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true, runValidators: false, strict: false },
    );
    if (!updated) throw new NotFoundException('Enterprise not found');
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