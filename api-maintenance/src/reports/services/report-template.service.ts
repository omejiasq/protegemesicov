import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReportTemplate, ReportTemplateDocument } from '../schemas/report-template.schema';

export interface CreateTemplateDto {
  name: string;
  description?: string;
  dataset: string;
  fields: string[];
  filters?: any[];
  groupBy?: string[];
  aggregations?: any[];
  mode?: 'detail' | 'grouped';
  limit?: number;
  is_public?: boolean;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  fields?: string[];
  filters?: any[];
  groupBy?: string[];
  aggregations?: any[];
  mode?: 'detail' | 'grouped';
  limit?: number;
  is_public?: boolean;
  is_active?: boolean;
}

@Injectable()
export class ReportTemplateService {
  constructor(
    @InjectModel(ReportTemplate.name)
    private templateModel: Model<ReportTemplateDocument>,
  ) {}

  /**
   * Crear una nueva plantilla de reporte
   */
  async create(
    createDto: CreateTemplateDto,
    enterpriseId: string,
    userId: string,
  ): Promise<ReportTemplateDocument> {
    // Verificar que no exista una plantilla con el mismo nombre para la empresa
    const existingTemplate = await this.templateModel.findOne({
      name: createDto.name,
      enterprise_id: enterpriseId,
      is_active: true,
    });

    if (existingTemplate) {
      throw new BadRequestException(
        `Ya existe una plantilla con el nombre "${createDto.name}"`,
      );
    }

    const template = new this.templateModel({
      ...createDto,
      enterprise_id: enterpriseId,
      created_by: userId,
    });

    return await template.save();
  }

  /**
   * Obtener todas las plantillas de una empresa
   */
  async findByEnterprise(
    enterpriseId: string,
    userId?: string,
  ): Promise<ReportTemplateDocument[]> {
    const query: any = {
      enterprise_id: enterpriseId,
      is_active: true,
      $or: [
        { is_public: true }, // plantillas públicas
        { created_by: userId }, // plantillas propias del usuario
      ],
    };

    return await this.templateModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Obtener una plantilla específica
   */
  async findById(
    templateId: string,
    enterpriseId: string,
    userId?: string,
  ): Promise<ReportTemplateDocument> {
    const template = await this.templateModel.findOne({
      _id: templateId,
      enterprise_id: enterpriseId,
      is_active: true,
    });

    if (!template) {
      throw new NotFoundException('Plantilla no encontrada');
    }

    // Verificar permisos: debe ser pública o del usuario
    if (!template.is_public && template.created_by !== userId) {
      throw new NotFoundException('No tienes permisos para acceder a esta plantilla');
    }

    return template;
  }

  /**
   * Actualizar una plantilla
   */
  async update(
    templateId: string,
    updateDto: UpdateTemplateDto,
    enterpriseId: string,
    userId: string,
  ): Promise<ReportTemplateDocument> {
    const template = await this.templateModel.findOne({
      _id: templateId,
      enterprise_id: enterpriseId,
      created_by: userId, // Solo el creador puede modificar
      is_active: true,
    });

    if (!template) {
      throw new NotFoundException('Plantilla no encontrada o no tienes permisos para modificarla');
    }

    // Si se cambia el nombre, verificar que no exista otra con el mismo nombre
    if (updateDto.name && updateDto.name !== template.name) {
      const existingTemplate = await this.templateModel.findOne({
        name: updateDto.name,
        enterprise_id: enterpriseId,
        is_active: true,
        _id: { $ne: templateId },
      });

      if (existingTemplate) {
        throw new BadRequestException(
          `Ya existe una plantilla con el nombre "${updateDto.name}"`,
        );
      }
    }

    Object.assign(template, updateDto);
    return await template.save();
  }

  /**
   * Eliminar (desactivar) una plantilla
   */
  async remove(
    templateId: string,
    enterpriseId: string,
    userId: string,
  ): Promise<void> {
    const template = await this.templateModel.findOne({
      _id: templateId,
      enterprise_id: enterpriseId,
      created_by: userId, // Solo el creador puede eliminar
      is_active: true,
    });

    if (!template) {
      throw new NotFoundException('Plantilla no encontrada o no tienes permisos para eliminarla');
    }

    template.is_active = false;
    await template.save();
  }

  /**
   * Duplicar una plantilla (crear copia)
   */
  async duplicate(
    templateId: string,
    enterpriseId: string,
    userId: string,
    newName?: string,
  ): Promise<ReportTemplateDocument> {
    const originalTemplate = await this.findById(templateId, enterpriseId, userId);

    const duplicateName = newName || `${originalTemplate.name} (copia)`;

    const createDto: CreateTemplateDto = {
      name: duplicateName,
      description: originalTemplate.description,
      dataset: originalTemplate.dataset,
      fields: [...originalTemplate.fields],
      filters: originalTemplate.filters ? [...originalTemplate.filters] : [],
      groupBy: originalTemplate.groupBy ? [...originalTemplate.groupBy] : [],
      aggregations: originalTemplate.aggregations ? [...originalTemplate.aggregations] : [],
      mode: originalTemplate.mode,
      limit: originalTemplate.limit,
      is_public: false, // Las copias son privadas por defecto
    };

    return await this.create(createDto, enterpriseId, userId);
  }
}