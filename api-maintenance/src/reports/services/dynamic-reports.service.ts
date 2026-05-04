import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export interface DatasetField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  groupable: boolean;
  aggregations?: ('sum' | 'avg' | 'count')[];
}

export interface Dataset {
  id: string;
  name: string;
  source: string;
  fields: DatasetField[];
}

export interface QueryRequest {
  dataset: string;
  fields: string[];
  filters?: any[];
  groupBy?: string[];
  aggregations?: { field: string; type: string }[];
  mode?: 'detail' | 'grouped';
  limit?: number;
}

@Injectable()
export class DynamicReportsService {
  constructor(@InjectConnection() private connection: Connection) {}

  /**
   * Detecta automáticamente los campos disponibles inspeccionando la colección
   */
  private async introspectCollection(collectionName: string): Promise<DatasetField[]> {
    try {
      if (!this.connection.db) {
        console.warn(`Database connection not available for introspection of ${collectionName}`);
        return [];
      }

      console.log(`🔍 Introspecting collection: ${collectionName}`);

      // Obtener una muestra de documentos para analizar estructura
      const sampleDocs = await this.connection.db.collection(collectionName)
        .aggregate([
          { $sample: { size: 100 } }, // Muestra de 100 documentos
          { $limit: 10 } // Analizar solo los primeros 10 para eficiencia
        ]).toArray();

      console.log(`📊 Found ${sampleDocs.length} sample documents in ${collectionName}`);

      if (sampleDocs.length === 0) {
        console.warn(`⚠️  No documents found in collection ${collectionName}`);
        return [];
      }

      // Analizar todos los campos únicos encontrados
      const fieldMap = new Map<string, { types: Set<string>, values: any[] }>();

      sampleDocs.forEach(doc => {
        this.extractFields(doc, '', fieldMap);
      });

      // Convertir a formato DatasetField
      const fields: DatasetField[] = [];
      for (const [key, info] of fieldMap) {
        // Determinar el tipo más común
        const type = this.inferFieldType(info.types, info.values);

        // Determinar si es agrupable (no campos únicos como IDs)
        const groupable = !this.isUniqueField(key, info.values);

        fields.push({
          key,
          label: this.generateLabel(key),
          type,
          groupable,
          ...(type === 'number' ? { aggregations: ['sum', 'avg', 'count'] } : {})
        });
      }

      console.log(`✅ Successfully introspected ${fields.length} fields from ${collectionName}`);
      return fields.sort((a, b) => a.label.localeCompare(b.label));
    } catch (error) {
      console.error(`❌ Error introspecting collection ${collectionName}:`, error);
      return [];
    }
  }

  /**
   * Extrae campos recursivamente de un documento (maneja objetos anidados)
   */
  private extractFields(obj: any, prefix: string, fieldMap: Map<string, { types: Set<string>, values: any[] }>) {
    Object.keys(obj).forEach(key => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (!fieldMap.has(fullKey)) {
        fieldMap.set(fullKey, { types: new Set(), values: [] });
      }

      const fieldInfo = fieldMap.get(fullKey)!;
      fieldInfo.values.push(value);

      if (value === null || value === undefined) {
        fieldInfo.types.add('null');
      } else if (Array.isArray(value)) {
        fieldInfo.types.add('array');
      } else if (value instanceof Date) {
        fieldInfo.types.add('date');
      } else if (typeof value === 'object') {
        fieldInfo.types.add('object');
        // Recursivamente analizar objetos anidados (máximo 2 niveles)
        if (prefix.split('.').length < 2) {
          this.extractFields(value, fullKey, fieldMap);
        }
      } else {
        fieldInfo.types.add(typeof value);
      }
    });
  }

  /**
   * Infiere el tipo más apropiado para un campo
   */
  private inferFieldType(types: Set<string>, values: any[]): 'string' | 'number' | 'date' | 'boolean' {
    if (types.has('date')) return 'date';
    if (types.has('boolean')) return 'boolean';
    if (types.has('number')) return 'number';

    // Verificar si strings son fechas
    if (types.has('string')) {
      const sampleStrings = values.filter(v => typeof v === 'string').slice(0, 5);
      const datePattern = /^\d{4}-\d{2}-\d{2}/; // YYYY-MM-DD
      if (sampleStrings.some(s => datePattern.test(s))) {
        return 'date';
      }
    }

    return 'string';
  }

  /**
   * Determina si un campo es único (como ID) y por tanto no agrupable
   */
  private isUniqueField(key: string, values: any[]): boolean {
    // IDs y campos que suelen ser únicos
    if (key.includes('_id') || key.includes('Id') || key === 'id') {
      return true;
    }

    // Si todos los valores son únicos, probablemente es un ID
    const uniqueValues = new Set(values);
    return uniqueValues.size === values.length && values.length > 5;
  }

  /**
   * Genera una etiqueta legible para un campo
   */
  private generateLabel(key: string): string {
    return key
      .split(/[._]/) // Dividir por punto o guión bajo
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Define el dataset principal de alistamientos de manera dinámica
   */
  async getAlistamientosDataset(): Promise<Dataset> {
    const fields = await this.introspectCollection('enlistments');

    // Fallback: si no hay campos desde introspección, usar campos básicos (sin actividades)
    const fallbackFields: DatasetField[] = [
      { key: 'placa', label: 'Placa', type: 'string', groupable: true },
      { key: 'nombresResponsable', label: 'Responsable', type: 'string', groupable: true },
      { key: 'nombresConductor', label: 'Conductor', type: 'string', groupable: true },
      { key: 'estado', label: 'Estado', type: 'string', groupable: true },
      { key: 'Fecha', label: 'Fecha', type: 'date', groupable: true }, // Renombrado de createdAt
      { key: 'numeroIdentificacionConductor', label: 'Número Identificación Conductor', type: 'string', groupable: false },
    ];

    const finalFields = fields.length > 0 ?
      fields.filter(field =>
        // Filtrar solo campos relevantes para alistamientos (ELIMINAR actividades)
        ['placa', 'nombresResponsable', 'nombresConductor', 'numeroIdentificacion',
         'estado', 'sicov_sync_status', 'createdAt', 'fechaSyncSicov'].includes(field.key) ||
        field.key.includes('dispositivo') ||
        field.key.includes('item')
      ).filter(field => field.key !== 'actividades') // Excluir explícitamente actividades
      .map(field => ({
        ...field,
        // Renombrar campos específicos según los requerimientos del usuario
        key: field.key === 'createdAt' ? 'Fecha' :
             field.key === 'numeroIdentificacion' ? 'numeroIdentificacionConductor' :
             field.key,
        label: field.key === 'createdAt' ? 'Fecha' :
               field.key === 'numeroIdentificacion' ? 'Número Identificación Conductor' :
               field.key === 'nombresResponsable' ? 'Responsable' :
               field.key === 'nombresConductor' ? 'Conductor' :
               field.key === 'estado' ? 'Estado' :
               field.key === 'placa' ? 'Placa' :
               field.label
      })) : fallbackFields;

    return {
      id: 'alistamientos',
      name: 'Alistamientos',
      source: 'api-maintenance',
      fields: finalFields
    };
  }

  /**
   * Define el dataset de mantenimientos preventivos de manera dinámica
   */
  async getPreventiveMaintenanceDataset(): Promise<Dataset> {
    const fields = await this.introspectCollection('preventive_details');

    // Configuración específica de campos para mantenimientos preventivos
    const preventiveFieldConfig = {
      'placa': { label: 'Placa', priority: 1 },
      'nit': { label: 'NIT - Centro especializado', priority: 2 },
      'razonSocial': { label: 'Razón Social - Centro especializado', priority: 3 },
      'numeroIdentificacion': { label: 'Número identificación – Ingeniero mecánico', priority: 4 },
      'nombresResponsable': { label: 'Nombres y apellidos – Ingeniero mecánico', priority: 5 },
      'detalleActividades': { label: 'Detalle de actividades', priority: 6 },
      'fecha': { label: 'Fecha', priority: 7 },
      'hora': { label: 'Hora', priority: 8 },
      'createdAt': { label: 'Fecha de creación', priority: 9 },
      'estado': { label: 'Estado', priority: 10 }
    };

    // Fallback: si no hay campos desde introspección, usar campos básicos
    const fallbackFields: DatasetField[] = [
      { key: 'placa', label: 'Placa', type: 'string', groupable: true },
      { key: 'nit', label: 'NIT - Centro especializado', type: 'number', groupable: true },
      { key: 'razonSocial', label: 'Razón Social - Centro especializado', type: 'string', groupable: true },
      { key: 'numeroIdentificacion', label: 'Número identificación – Ingeniero mecánico', type: 'string', groupable: false },
      { key: 'nombresResponsable', label: 'Nombres y apellidos – Ingeniero mecánico', type: 'string', groupable: true },
      { key: 'detalleActividades', label: 'Detalle de actividades', type: 'string', groupable: false },
      { key: 'fecha', label: 'Fecha', type: 'date', groupable: true },
      { key: 'hora', label: 'Hora', type: 'string', groupable: true },
    ];

    // Filtrar y configurar campos relevantes para preventivos
    const configuredFields = fields.length > 0 ?
      fields
        .filter(field => preventiveFieldConfig[field.key])
        .map(field => ({
          ...field,
          label: preventiveFieldConfig[field.key].label,
          priority: preventiveFieldConfig[field.key].priority
        }))
        .sort((a, b) => (a as any).priority - (b as any).priority)
        .map(({ priority, ...field }) => field) // Remover priority del resultado final
      : fallbackFields;

    return {
      id: 'preventive_details',
      name: 'Mantenimientos Preventivos',
      source: 'api-maintenance',
      fields: configuredFields
    };
  }

  /**
   * Obtiene todos los datasets disponibles
   */
  async getAvailableDatasets(): Promise<Dataset[]> {
    return Promise.all([
      this.getAlistamientosDataset(),
      this.getPreventiveMaintenanceDataset()
    ]);
  }

  /**
   * Ejecuta una consulta dinámica contra el dataset especificado
   */
  async executeQuery(query: QueryRequest, enterpriseId: string): Promise<any> {
    let dataset: Dataset;
    let pipeline: any[];
    let collection: any;

    switch (query.dataset) {
      case 'alistamientos':
        dataset = await this.getAlistamientosDataset();
        this.validateQuery(query, dataset);
        pipeline = this.buildAlistamientosPipeline(query, enterpriseId);
        collection = this.connection.collection('enlistments');
        break;

      case 'preventive_details':
        dataset = await this.getPreventiveMaintenanceDataset();
        this.validateQuery(query, dataset);
        pipeline = this.buildPreventiveDetailsPipeline(query, enterpriseId);
        collection = this.connection.collection('preventive_details');
        break;

      default:
        throw new BadRequestException(`Dataset "${query.dataset}" no soportado`);
    }

    console.log('🔍 [executeQuery] Ejecutando pipeline en colección:', collection.collectionName);
    const results = await collection.aggregate(pipeline).toArray();

    console.log('📊 [executeQuery] Resultados obtenidos:', results.length);
    console.log('📊 [executeQuery] Primer resultado (muestra):', JSON.stringify(results[0], null, 2));

    return {
      dataset: dataset.name,
      totalRecords: results.length,
      data: results,
      query: query
    };
  }

  /**
   * Construye el pipeline de agregación para alistamientos con pivoteo de items
   */
  private buildAlistamientosPipeline(query: QueryRequest, enterpriseId: string): any[] {
    const pipeline: any[] = [];

    console.log('🔧 [buildAlistamientosPipeline] Iniciando pipeline para alistamientos');
    console.log('🔧 [buildAlistamientosPipeline] Query:', JSON.stringify(query, null, 2));
    console.log('🔧 [buildAlistamientosPipeline] Enterprise ID:', enterpriseId);

    // 1. Match por empresa (OBLIGATORIO)
    pipeline.push({
      $match: {
        enterprise_id: enterpriseId
      }
    });

    // 2. Lookup con enlistment_item_results para obtener todos los items por mantenimientoId
    pipeline.push({
      $lookup: {
        from: 'enlistment_item_results',
        localField: 'mantenimientoId',
        foreignField: 'mantenimientoId',
        as: 'items'
      }
    });

    // 3. Unwind items para poder hacer el lookup correcto con tipos_vehiculos_tipos_inspecciones
    pipeline.push({
      $unwind: {
        path: '$items',
        preserveNullAndEmptyArrays: true // Mantener alistamientos sin items
      }
    });

    // 4. Lookup con tipos_vehiculos_tipos_inspecciones usando itemId de cada item
    pipeline.push({
      $lookup: {
        from: 'tipos_vehiculos_tipos_inspecciones',
        localField: 'items.itemId',
        foreignField: '_id',
        as: 'deviceInfo'
      }
    });

    // 5. Unwind deviceInfo para obtener información del dispositivo
    pipeline.push({
      $unwind: {
        path: '$deviceInfo',
        preserveNullAndEmptyArrays: true
      }
    });

    // 6. AddFields - Combinar información del item con dispositivo
    pipeline.push({
      $addFields: {
        itemWithDevice: {
          dispositivo: { $ifNull: ['$deviceInfo.dispositivo', 'N/A'] },
          estado: { $ifNull: ['$items.estado', 'N/A'] },
          itemId: '$items.itemId'
        }
      }
    });

    // 7. Group back by alistamiento para reagrupar los items
    pipeline.push({
      $group: {
        _id: '$_id',
        // Preservar todos los campos del alistamiento original
        placa: { $first: '$placa' },
        nombresResponsable: { $first: '$nombresResponsable' },
        nombresConductor: { $first: '$nombresConductor' },
        estado: { $first: '$estado' },
        createdAt: { $first: '$createdAt' },
        numeroIdentificacion: { $first: '$numeroIdentificacion' },
        enterprise_id: { $first: '$enterprise_id' },
        mantenimientoId: { $first: '$mantenimientoId' },
        // Colectar todos los items con sus dispositivos
        itemsWithDevices: {
          $push: {
            $cond: [
              { $ne: ['$itemWithDevice.itemId', null] },
              '$itemWithDevice',
              '$$REMOVE'
            ]
          }
        }
      }
    });

    // 8. AddFields - Procesar items con dispositivos para pivoteo
    pipeline.push({
      $addFields: {
        processedItems: {
          $map: {
            input: '$itemsWithDevices',
            as: 'item',
            in: {
              dispositivo: '$$item.dispositivo',
              estado: '$$item.estado',
              itemId: '$$item.itemId'
            }
          }
        }
      }
    });

    // 9. AddFields - Crear campos dinámicos por cada dispositivo (pivoteo)
    pipeline.push({
      $addFields: {
        pivotedItems: {
          $arrayToObject: {
            $map: {
              input: '$processedItems',
              as: 'item',
              in: {
                k: {
                  $concat: [
                    'item_',
                    { $replaceAll: { input: { $toString: '$$item.dispositivo' }, find: ' ', replacement: '_' } }
                  ]
                },
                v: '$$item.estado'
              }
            }
          }
        }
      }
    });

    // 10. ReplaceRoot - Combinar campos base con campos pivoteados
    pipeline.push({
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            {
              _id: '$_id',
              placa: '$placa',
              nombresResponsable: '$nombresResponsable',
              nombresConductor: '$nombresConductor',
              estado: '$estado',
              Fecha: '$createdAt', // Renombrando createdAt -> Fecha
              numeroIdentificacionConductor: '$numeroIdentificacion', // Renombrando numeroIdentificacion -> numeroIdentificacionConductor
              enterprise_id: '$enterprise_id',
              mantenimientoId: '$mantenimientoId'
            },
            { $ifNull: ['$pivotedItems', {}] } // Manejar casos donde no hay items pivoteados
          ]
        }
      }
    });

    // 11. Aplicar filtros adicionales si existen
    if (query.filters && query.filters.length > 0) {
      const matchConditions = this.buildFilterConditions(query.filters);
      if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions });
      }
    }

    // 12. Agrupación si es necesario
    if (query.mode === 'grouped' && query.groupBy && query.groupBy.length > 0) {
      pipeline.push(...this.buildGroupingPipeline(query));
    } else {
      // Modo detalle: solo proyectar campos solicitados
      const projection = this.buildProjection(query.fields);
      pipeline.push({ $project: projection });
    }

    // 13. Ordenamiento
    pipeline.push({
      $sort: { Fecha: -1 } // Cambiar ordenamiento por Fecha (anteriormente createdAt)
    });

    // 14. Límite
    if (query.limit && query.limit > 0) {
      pipeline.push({ $limit: Math.min(query.limit, 10000) }); // Máximo 10k registros
    }

    console.log('🔧 [buildAlistamientosPipeline] Pipeline final:', JSON.stringify(pipeline, null, 2));

    return pipeline;
  }

  /**
   * Construye las condiciones de filtro
   */
  private buildFilterConditions(filters: any[]): any {
    const conditions: any = {};

    filters.forEach(filter => {
      if (!filter.field || !filter.operator || filter.value === undefined) return;

      // Convertir el valor si es necesario
      let processedValue = filter.value;

      // Para campos de fecha, asegurarse de que el valor sea un Date object
      if (filter.field.includes('At') || filter.field.includes('fecha') || filter.field === 'fecha') {
        if (typeof processedValue === 'string') {
          processedValue = new Date(processedValue);
        }
      }

      switch (filter.operator) {
        case 'eq':
          conditions[filter.field] = processedValue;
          break;
        case 'ne':
          conditions[filter.field] = { $ne: processedValue };
          break;
        case 'gt':
          conditions[filter.field] = { $gt: processedValue };
          break;
        case 'gte':
          conditions[filter.field] = { $gte: processedValue };
          break;
        case 'lt':
          conditions[filter.field] = { $lt: processedValue };
          break;
        case 'lte':
          conditions[filter.field] = { $lte: processedValue };
          break;
        case 'like':
          conditions[filter.field] = { $regex: processedValue, $options: 'i' };
          break;
        case 'in':
          conditions[filter.field] = { $in: Array.isArray(processedValue) ? processedValue : [processedValue] };
          break;
        case 'nin':
          conditions[filter.field] = { $nin: Array.isArray(processedValue) ? processedValue : [processedValue] };
          break;
      }
    });

    return conditions;
  }

  /**
   * Construye el pipeline para agrupación
   */
  private buildGroupingPipeline(query: QueryRequest): any[] {
    const pipeline: any[] = [];

    // Construir _id del grupo
    const groupId: any = {};
    query.groupBy?.forEach(field => {
      groupId[field] = `$${field}`;
    });

    const groupStage: any = {
      _id: groupId,
      count: { $sum: 1 }
    };

    // Agregar agregaciones solicitadas
    if (query.aggregations) {
      query.aggregations.forEach(agg => {
        const fieldName = `${agg.field}_${agg.type}`;

        switch (agg.type) {
          case 'sum':
            groupStage[fieldName] = { $sum: `$${agg.field}` };
            break;
          case 'avg':
            groupStage[fieldName] = { $avg: `$${agg.field}` };
            break;
          case 'count':
            groupStage[fieldName] = { $sum: 1 };
            break;
          case 'min':
            groupStage[fieldName] = { $min: `$${agg.field}` };
            break;
          case 'max':
            groupStage[fieldName] = { $max: `$${agg.field}` };
            break;
        }
      });
    }

    pipeline.push({ $group: groupStage });

    // Reformatear salida para aplanar los grupos
    const projectStage: any = {
      count: 1
    };

    // Agregar campos del _id al nivel principal
    query.groupBy?.forEach(field => {
      projectStage[field] = `$_id.${field}`;
    });

    // Agregar agregaciones
    if (query.aggregations) {
      query.aggregations.forEach(agg => {
        const fieldName = `${agg.field}_${agg.type}`;
        projectStage[fieldName] = 1;
      });
    }

    pipeline.push({ $project: projectStage });

    return pipeline;
  }

  /**
   * Construye la proyección para modo detalle
   */
  private buildProjection(fields: string[]): any {
    const projection: any = { _id: 0 };

    fields.forEach(field => {
      projection[field] = 1;
    });

    // Siempre incluir algunos campos clave
    projection.mantenimientoId = 1;
    projection.enterprise_id = 1;
    projection.createdAt = 1;

    return projection;
  }

  /**
   * Valida que la consulta sea válida para el dataset
   */
  private validateQuery(query: QueryRequest, dataset: Dataset): void {
    const validFields = dataset.fields.map(f => f.key);

    // Validar campos solicitados
    for (const field of query.fields) {
      if (!validFields.includes(field)) {
        throw new BadRequestException(`Campo no válido: ${field}`);
      }
    }

    // Validar campos de agrupación
    if (query.groupBy) {
      for (const field of query.groupBy) {
        const fieldDef = dataset.fields.find(f => f.key === field);
        if (!fieldDef) {
          throw new BadRequestException(`Campo de agrupación no válido: ${field}`);
        }
        if (!fieldDef.groupable) {
          throw new BadRequestException(`Campo no agrupable: ${field}`);
        }
      }
    }

    // Validar agregaciones
    if (query.aggregations) {
      for (const agg of query.aggregations) {
        const fieldDef = dataset.fields.find(f => f.key === agg.field);
        if (!fieldDef) {
          throw new BadRequestException(`Campo de agregación no válido: ${agg.field}`);
        }
        if (!fieldDef.aggregations?.includes(agg.type as any)) {
          throw new BadRequestException(`Agregación no válida: ${agg.type} para el campo ${agg.field}`);
        }
      }
    }
  }

  /**
   * Construye el pipeline de agregación para mantenimientos preventivos
   */
  private buildPreventiveDetailsPipeline(query: QueryRequest, enterpriseId: string): any[] {
    const pipeline: any[] = [];

    // 1. Match por empresa (OBLIGATORIO)
    pipeline.push({
      $match: {
        enterprise_id: enterpriseId
      }
    });

    // 2. Aplicar filtros adicionales si existen
    if (query.filters && query.filters.length > 0) {
      const matchConditions = this.buildFilterConditions(query.filters);
      if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions });
      }
    }

    // 3. Agrupación si es necesario
    if (query.mode === 'grouped' && query.groupBy && query.groupBy.length > 0) {
      pipeline.push(...this.buildGroupingPipeline(query));
    } else {
      // Modo detalle: solo proyectar campos solicitados
      const projection = this.buildProjection(query.fields);
      pipeline.push({ $project: projection });
    }

    // 4. Ordenamiento
    pipeline.push({
      $sort: { fecha: -1, hora: -1 }
    });

    // 5. Límite si se especifica
    if (query.limit && query.limit > 0) {
      pipeline.push({ $limit: query.limit });
    }

    return pipeline;
  }
}