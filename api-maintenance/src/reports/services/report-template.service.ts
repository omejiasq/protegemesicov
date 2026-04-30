// src/reports/services/report-template.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReportTemplate, ReportTemplateDocument } from '../schemas/report-template.schema';
import { CreateReportTemplateDto, UpdateReportTemplateDto, GenerateReportDto } from '../dto/report-template.dto';
import { FieldDiscoveryService } from './field-discovery.service';

@Injectable()
export class ReportTemplateService {
  constructor(
    @InjectModel(ReportTemplate.name)
    private reportTemplateModel: Model<ReportTemplateDocument>,
    private fieldDiscoveryService: FieldDiscoveryService,
  ) {}

  async create(createDto: CreateReportTemplateDto, enterprise_id: string, createdBy?: string): Promise<ReportTemplate> {
    // Validar que los campos seleccionados existan en las colecciones
    await this.validateFieldConfiguration(createDto.configuracion);

    const reportTemplate = new this.reportTemplateModel({
      ...createDto,
      enterprise_id,
      createdBy,
      usageCount: 0,
      activo: true,
    });

    return reportTemplate.save();
  }

  async findAll(enterprise_id: string, filters?: {
    categoria?: string;
    activo?: boolean;
    isPublic?: boolean;
    search?: string;
  }): Promise<ReportTemplate[]> {
    const query: any = { enterprise_id };

    if (filters) {
      if (filters.categoria) query.categoria = filters.categoria;
      if (typeof filters.activo === 'boolean') query.activo = filters.activo;
      if (typeof filters.isPublic === 'boolean') query.isPublic = filters.isPublic;

      if (filters.search) {
        query.$or = [
          { nombre: { $regex: filters.search, $options: 'i' } },
          { descripcion: { $regex: filters.search, $options: 'i' } },
          { tags: { $in: [new RegExp(filters.search, 'i')] } }
        ];
      }
    }

    return this.reportTemplateModel
      .find(query)
      .sort({ lastUsed: -1, createdAt: -1 })
      .exec();
  }

  async findById(id: string, enterprise_id: string): Promise<ReportTemplate | null> {
    return this.reportTemplateModel
      .findOne({ _id: id, enterprise_id })
      .exec();
  }

  async update(id: string, updateDto: UpdateReportTemplateDto, enterprise_id: string): Promise<ReportTemplate | null> {
    if (updateDto.configuracion) {
      await this.validateFieldConfiguration(updateDto.configuracion);
    }

    return this.reportTemplateModel
      .findOneAndUpdate(
        { _id: id, enterprise_id },
        updateDto,
        { new: true }
      )
      .exec();
  }

  async remove(id: string, enterprise_id: string): Promise<boolean> {
    const result = await this.reportTemplateModel
      .deleteOne({ _id: id, enterprise_id })
      .exec();

    return result.deletedCount > 0;
  }

  async generateReport(id: string, generateDto: GenerateReportDto, enterprise_id: string): Promise<any> {
    const template = await this.findById(id, enterprise_id);
    if (!template) {
      throw new Error('Plantilla de reporte no encontrada');
    }

    // Incrementar contador de uso
    await this.reportTemplateModel
      .updateOne(
        { _id: id },
        {
          $inc: { usageCount: 1 },
          $set: { lastUsed: new Date() }
        }
      )
      .exec();

    // Construir y ejecutar consulta
    const data = await this.executeReportQuery(template, generateDto);

    return {
      template,
      data,
      generatedAt: new Date(),
      parameters: generateDto
    };
  }

  async getAvailableFields(collections: string[]): Promise<any> {
    const result: any = {};

    for (const collection of collections) {
      const fields = await this.fieldDiscoveryService.getCollectionFields(collection);
      result[collection] = {
        displayName: this.getCollectionDisplayName(collection),
        fields: fields.map(field => ({
          path: field.path,
          label: field.label,
          type: field.type,
          isRequired: field.isRequired,
          isArray: field.isArray,
          enumValues: field.enumValues,
          ref: field.ref
        }))
      };
    }

    return result;
  }

  async duplicateTemplate(id: string, enterprise_id: string, newName: string): Promise<ReportTemplate> {
    const originalTemplate = await this.findById(id, enterprise_id);
    if (!originalTemplate) {
      throw new Error('Plantilla original no encontrada');
    }

    const duplicatedTemplate = new this.reportTemplateModel({
      ...(originalTemplate as any).toObject(),
      _id: undefined,
      nombre: newName,
      descripcion: `Copia de ${originalTemplate.descripcion || originalTemplate.nombre}`,
      usageCount: 0,
      lastUsed: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    });

    return duplicatedTemplate.save();
  }

  private async validateFieldConfiguration(configuracion: any): Promise<void> {
    for (const collection of configuracion.collections) {
      const availableFields = await this.fieldDiscoveryService.getCollectionFields(collection);
      const availablePaths = availableFields.map(f => f.path);

      for (const campo of configuracion.campos) {
        if (!availablePaths.includes(campo.path) && !campo.path.includes('.')) {
          throw new Error(`Campo '${campo.path}' no existe en la colección '${collection}'`);
        }
      }

      for (const filtro of configuracion.filtros || []) {
        if (!availablePaths.includes(filtro.field) && !filtro.field.includes('.')) {
          throw new Error(`Campo de filtro '${filtro.field}' no existe en la colección '${collection}'`);
        }
      }
    }
  }

  private async executeReportQuery(template: ReportTemplate, params: GenerateReportDto): Promise<any[]> {
    const { configuracion } = template;

    // Si es una sola colección, usar agregación simple
    if (configuracion.collections.length === 1) {
      return this.executeSingleCollectionQuery(configuracion, params);
    }

    // Para múltiples colecciones, usar agregación con joins
    return this.executeMultiCollectionQuery(configuracion, params);
  }

  private async executeSingleCollectionQuery(configuracion: any, params: GenerateReportDto): Promise<any[]> {
    const collectionName = configuracion.collections[0];
    const collection = this.reportTemplateModel.db.collection(collectionName);

    const pipeline: any[] = [];

    // Filtros base del template
    if (configuracion.filtros && configuracion.filtros.length > 0) {
      const matchStage = this.buildMatchStage(configuracion.filtros);
      if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
      }
    }

    // Filtros dinámicos del request
    if (params.dateRange) {
      const dateFilter: any = {};
      if (params.dateRange.start) {
        dateFilter.$gte = new Date(params.dateRange.start);
      }
      if (params.dateRange.end) {
        dateFilter.$lte = new Date(params.dateRange.end);
      }
      if (Object.keys(dateFilter).length > 0) {
        pipeline.push({ $match: { createdAt: dateFilter } });
      }
    }

    if (params.additionalFilters) {
      pipeline.push({ $match: params.additionalFilters });
    }

    // Proyección de campos seleccionados
    if (configuracion.campos && configuracion.campos.length > 0) {
      const project: any = {};
      configuracion.campos.forEach((campo: any) => {
        project[campo.path] = 1;
      });
      pipeline.push({ $project: project });
    }

    // Agrupación si está configurada
    if (configuracion.agrupacion && configuracion.agrupacion.length > 0) {
      const groupStage = this.buildGroupStage(configuracion);
      pipeline.push(groupStage);
    }

    // Ordenamiento
    if (configuracion.ordenamiento && configuracion.ordenamiento.length > 0) {
      const sortStage: any = {};
      configuracion.ordenamiento.forEach((orden: any) => {
        sortStage[orden.campo] = orden.direccion === 'desc' ? -1 : 1;
      });
      pipeline.push({ $sort: sortStage });
    }

    // Límite
    if (configuracion.limite && configuracion.limite > 0) {
      pipeline.push({ $limit: configuracion.limite });
    }

    console.log(`Executing pipeline for ${collectionName}:`, JSON.stringify(pipeline, null, 2));

    return collection.aggregate(pipeline).toArray();
  }

  private async executeMultiCollectionQuery(configuracion: any, params: GenerateReportDto): Promise<any[]> {
    // Para reportes multi-colección, necesitamos identificar la colección principal
    // y hacer joins con las otras colecciones
    const mainCollection = configuracion.collections[0];
    const collection = this.reportTemplateModel.db.collection(mainCollection);

    const pipeline: any[] = [];

    // Joins con otras colecciones
    for (let i = 1; i < configuracion.collections.length; i++) {
      const joinCollection = configuracion.collections[i];
      // Aquí deberíamos implementar lógica para detectar campos de relación automáticamente
      // Por ahora, usamos una estrategia básica
      pipeline.push({
        $lookup: {
          from: joinCollection,
          localField: this.guessRelationField(mainCollection, joinCollection),
          foreignField: '_id',
          as: joinCollection
        }
      });
    }

    // Resto de la pipeline igual que en single collection
    if (configuracion.filtros && configuracion.filtros.length > 0) {
      const matchStage = this.buildMatchStage(configuracion.filtros);
      if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
      }
    }

    if (params.dateRange) {
      const dateFilter: any = {};
      if (params.dateRange.start) {
        dateFilter.$gte = new Date(params.dateRange.start);
      }
      if (params.dateRange.end) {
        dateFilter.$lte = new Date(params.dateRange.end);
      }
      if (Object.keys(dateFilter).length > 0) {
        pipeline.push({ $match: { createdAt: dateFilter } });
      }
    }

    if (configuracion.campos && configuracion.campos.length > 0) {
      const project: any = {};
      configuracion.campos.forEach((campo: any) => {
        project[campo.path] = 1;
      });
      pipeline.push({ $project: project });
    }

    return collection.aggregate(pipeline).toArray();
  }

  private buildMatchStage(filtros: any[]): any {
    const match: any = {};
    const andConditions: any[] = [];
    const orConditions: any[] = [];

    filtros.forEach(filtro => {
      const condition = this.buildFilterCondition(filtro);
      if (filtro.logic === 'or') {
        orConditions.push(condition);
      } else {
        andConditions.push(condition);
      }
    });

    if (andConditions.length > 0) {
      Object.assign(match, ...andConditions);
    }

    if (orConditions.length > 0) {
      if (Object.keys(match).length > 0) {
        match.$and = [{ ...match }, { $or: orConditions }];
      } else {
        match.$or = orConditions;
      }
    }

    return match;
  }

  private buildFilterCondition(filtro: any): any {
    const { field, operator, value } = filtro;
    const condition: any = {};

    switch (operator) {
      case 'eq':
        condition[field] = value;
        break;
      case 'ne':
        condition[field] = { $ne: value };
        break;
      case 'gt':
        condition[field] = { $gt: value };
        break;
      case 'gte':
        condition[field] = { $gte: value };
        break;
      case 'lt':
        condition[field] = { $lt: value };
        break;
      case 'lte':
        condition[field] = { $lte: value };
        break;
      case 'in':
        condition[field] = { $in: Array.isArray(value) ? value : [value] };
        break;
      case 'nin':
        condition[field] = { $nin: Array.isArray(value) ? value : [value] };
        break;
      case 'like':
        condition[field] = { $regex: value, $options: 'i' };
        break;
      default:
        condition[field] = value;
    }

    return condition;
  }

  private buildGroupStage(configuracion: any): any {
    const groupStage: any = {
      _id: {}
    };

    // Campos de agrupación
    configuracion.agrupacion.forEach((campo: string) => {
      groupStage._id[campo] = `$${campo}`;
    });

    // Agregaciones de campos
    configuracion.campos.forEach((campo: any) => {
      if (campo.aggregation) {
        switch (campo.aggregation) {
          case 'count':
            groupStage[campo.path] = { $sum: 1 };
            break;
          case 'sum':
            groupStage[campo.path] = { $sum: `$${campo.path}` };
            break;
          case 'avg':
            groupStage[campo.path] = { $avg: `$${campo.path}` };
            break;
          case 'min':
            groupStage[campo.path] = { $min: `$${campo.path}` };
            break;
          case 'max':
            groupStage[campo.path] = { $max: `$${campo.path}` };
            break;
          default:
            groupStage[campo.path] = { $first: `$${campo.path}` };
        }
      } else {
        groupStage[campo.path] = { $first: `$${campo.path}` };
      }
    });

    return { $group: groupStage };
  }

  private guessRelationField(mainCollection: string, joinCollection: string): string {
    // Estrategia básica para detectar campos de relación
    const relationMap: Record<string, Record<string, string>> = {
      'terminal_salidas': {
        'users': 'createdBy',
        'vehicles': 'placa',
        'empresas': 'nitEmpresaTransporte'
      },
      'terminal_llegadas': {
        'terminal_salidas': 'numeroUnicoPlanilla',
        'users': 'createdBy'
      }
    };

    return relationMap[mainCollection]?.[joinCollection] || '_id';
  }

  private getCollectionDisplayName(collectionName: string): string {
    const displayNames: Record<string, string> = {
      'terminal_salidas': 'Despachos de Salida',
      'terminal_llegadas': 'Llegadas de Terminal',
      'terminal_novedades': 'Novedades de Terminal',
      'users': 'Usuarios',
      'vehicles': 'Vehículos',
      'alistamientos': 'Alistamientos',
      'conductores': 'Conductores',
      'empresas': 'Empresas'
    };

    return displayNames[collectionName] || collectionName;
  }
}