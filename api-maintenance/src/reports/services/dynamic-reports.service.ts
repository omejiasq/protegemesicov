import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import axios from 'axios';

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
  private originalQuery: any = null;

  constructor(@InjectConnection() private connection: Connection) {}

  /**
   * Detecta automáticamente los campos disponibles inspeccionando la colección
   */
  private async introspectCollection(collectionName: string): Promise<DatasetField[]> {
    try {
      if (!this.connection.db) {
        //console.warn(`Database connection not available for introspection of ${collectionName}`);
        return [];
      }

      //console.log(`🔍 Introspecting collection: ${collectionName}`);

      // Obtener una muestra de documentos para analizar estructura
      const sampleDocs = await this.connection.db.collection(collectionName)
        .aggregate([
          { $sample: { size: 100 } }, // Muestra de 100 documentos
          { $limit: 10 } // Analizar solo los primeros 10 para eficiencia
        ]).toArray();

      //console.log(`📊 Found ${sampleDocs.length} sample documents in ${collectionName}`);

      if (sampleDocs.length === 0) {
        //console.warn(`⚠️  No documents found in collection ${collectionName}`);
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

      //.log(`✅ Successfully introspected ${fields.length} fields from ${collectionName}`);
      return fields.sort((a, b) => a.label.localeCompare(b.label));
    } catch (error) {
      //console.error(`❌ Error introspecting collection ${collectionName}:`, error);
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
    // Campos exactos basados en los ejemplos de las 3 colecciones
    const fields: DatasetField[] = [
      // De enlistments
      { key: 'placa', label: 'Placa', type: 'string', groupable: true },
      { key: 'nombresResponsable', label: 'Responsable', type: 'string', groupable: true },
      { key: 'nombresConductor', label: 'Conductor', type: 'string', groupable: true },
      { key: 'numeroIdentificacionConductor', label: 'Número Identificación Conductor', type: 'string', groupable: false },
      { key: 'Fecha', label: 'Fecha', type: 'date', groupable: true }, // createdAt renombrado

      // Campo individual de estado (usar solo cuando no se active el modo pivot)
      { key: 'estado', label: 'Estado (Individual)', type: 'string', groupable: true }, // "OK", "NO OK", etc.

      // Campo pivot interno (no visible en la lista de campos disponibles pero necesario para la lógica)
      { key: 'dispositivo', label: 'Items (Pivot)', type: 'string', groupable: true }, // Genera columnas dinámicas sin mostrarse como columna
    ];

    //console.log('🔧 [getAlistamientosDataset] Campos definidos:', fields);

    return {
      id: 'alistamientos',
      name: 'Alistamientos',
      source: 'api-maintenance',
      fields: fields
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
      'nombresResponsable': { label: 'Mecánico', priority: 5 },
      'detalleActividades': { label: 'Detalle de actividades', priority: 6 },
      'fecha': { label: 'Fecha', priority: 7 },
      'fechaBogota': { label: 'Fecha (Bogotá)', priority: 8 },
      'horaBogota': { label: 'Hora (Bogotá)', priority: 9 },
      'hora': { label: 'Hora', priority: 10 },
      'createdAt': { label: 'Fecha de creación', priority: 11 },
      'estado': { label: 'Estado', priority: 12 }
    };

    // Fallback: si no hay campos desde introspección, usar campos básicos
    const fallbackFields: DatasetField[] = [
      { key: 'placa', label: 'Placa', type: 'string', groupable: true },
      { key: 'nit', label: 'NIT - Centro especializado', type: 'number', groupable: true },
      { key: 'razonSocial', label: 'Razón Social - Centro especializado', type: 'string', groupable: true },
      { key: 'numeroIdentificacion', label: 'Número identificación – Ingeniero mecánico', type: 'string', groupable: false },
      { key: 'nombresResponsable', label: 'Mecánico', type: 'string', groupable: true },
      { key: 'detalleActividades', label: 'Detalle de actividades', type: 'string', groupable: false },
      { key: 'fecha', label: 'Fecha', type: 'date', groupable: true },
      { key: 'fechaBogota', label: 'Fecha (Bogotá)', type: 'date', groupable: true },
      { key: 'horaBogota', label: 'Hora (Bogotá)', type: 'string', groupable: true },
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
   * Define el dataset de mantenimientos correctivos de manera dinámica
   */
  async getCorrectiveMaintenanceDataset(): Promise<Dataset> {
    const fields = await this.introspectCollection('corrective_details');

    // Configuración específica de campos para mantenimientos correctivos
    const correctiveFieldConfig = {
      'placa': { label: 'Placa', priority: 1 },
      'nit': { label: 'NIT - Centro especializado', priority: 2 },
      'razonSocial': { label: 'Razón Social - Centro especializado', priority: 3 },
      'numeroIdentificacion': { label: 'Número identificación – Ingeniero mecánico', priority: 4 },
      'nombresResponsable': { label: 'Mecánico', priority: 5 },
      'detalleActividades': { label: 'Detalle de actividades', priority: 6 },
      'fecha': { label: 'Fecha', priority: 7 },
      'fechaBogota': { label: 'Fecha (Bogotá)', priority: 8 },
      'horaBogota': { label: 'Hora (Bogotá)', priority: 9 },
      'hora': { label: 'Hora', priority: 10 },
      'createdAt': { label: 'Fecha de creación', priority: 11 },
      'estado': { label: 'Estado', priority: 12 }
    };

    // Fallback: si no hay campos desde introspección, usar campos básicos
    const fallbackFields: DatasetField[] = [
      { key: 'placa', label: 'Placa', type: 'string', groupable: true },
      { key: 'nit', label: 'NIT - Centro especializado', type: 'number', groupable: true },
      { key: 'razonSocial', label: 'Razón Social - Centro especializado', type: 'string', groupable: true },
      { key: 'numeroIdentificacion', label: 'Número identificación – Ingeniero mecánico', type: 'string', groupable: false },
      { key: 'nombresResponsable', label: 'Mecánico', type: 'string', groupable: true },
      { key: 'detalleActividades', label: 'Detalle de actividades', type: 'string', groupable: false },
      { key: 'fecha', label: 'Fecha', type: 'date', groupable: true },
      { key: 'fechaBogota', label: 'Fecha (Bogotá)', type: 'date', groupable: true },
      { key: 'horaBogota', label: 'Hora (Bogotá)', type: 'string', groupable: true },
      { key: 'hora', label: 'Hora', type: 'string', groupable: true },
    ];

    // Filtrar y configurar campos relevantes para correctivos
    const configuredFields = fields.length > 0 ?
      fields
        .filter(field => correctiveFieldConfig[field.key])
        .map(field => ({
          ...field,
          label: correctiveFieldConfig[field.key].label,
          priority: correctiveFieldConfig[field.key].priority
        }))
        .sort((a, b) => (a as any).priority - (b as any).priority)
        .map(({ priority, ...field }) => field) // Remover priority del resultado final
      : fallbackFields;

    return {
      id: 'corrective_details',
      name: 'Mantenimientos Correctivos',
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
      this.getPreventiveMaintenanceDataset(),
      this.getCorrectiveMaintenanceDataset()
    ]);
  }

  /**
   * Busca todas las placas de vehículos de la empresa
   * Llama al servicio de api-vehicle vía HTTP
   */
  async searchPlacas(dataset: string, enterpriseId: string, userToken?: string): Promise<string[]> {
    try {
      const vehiclesApiUrl = process.env.VEHICLES_API_URL || 'http://localhost:4005';
      
      console.log(`🔍 [searchPlacas] Llamando a api-vehicle para empresa: ${enterpriseId}`);
      console.log(`🔍 [searchPlacas] URL: ${vehiclesApiUrl}/vehicles`);
      console.log(`🔍 [searchPlacas] Token del usuario: ${userToken ? 'Presente' : 'Ausente'}`);
      
      // Llamar al servicio de vehículos con el token del usuario
      const response = await axios.get(`${vehiclesApiUrl}/vehicles`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'x-enterprise-id': enterpriseId
        },
        params: {
          enterprise_id: enterpriseId
        }
      });

      console.log(`✅ [searchPlacas] Respuesta de api-vehicle (status ${response.status})`);
      console.log(`✅ [searchPlacas] Total vehículos: ${response.data?.data?.length || 0}`);

      // Extraer placas de la respuesta
      const vehicles = response.data?.data || response.data || [];
      const placas = vehicles
        .map((v: any) => v.placa)
        .filter((placa: string) => placa && typeof placa === 'string')
        .sort();

      console.log(`✅ [searchPlacas] Placas únicas extraídas: ${placas.length}`);

      return placas;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('❌ [searchPlacas] Error HTTP:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
      } else {
        console.error('❌ [searchPlacas] Error:', error);
      }
      
      // Si falla la llamada HTTP, intentar con la base de datos local
      console.log('⚠️ [searchPlacas] Intentando con base de datos local...');
      try {
        if (!this.connection.db) {
          throw new BadRequestException('Base de datos no disponible');
        }
        
        const vehiclesCollection = this.connection.db.collection('vehicles');
        const vehicles = await vehiclesCollection.find(
          { enterprise_id: enterpriseId },
          { projection: { placa: 1 } }
        ).sort({ placa: 1 }).toArray();
        
        const placas = vehicles
          .map(v => v.placa)
          .filter(placa => placa && typeof placa === 'string');
          
        console.log(`✅ [searchPlacas] Placas de BD local: ${placas.length}`);
        return placas;
      } catch (dbError) {
        console.error('❌ [searchPlacas] Error en BD local:', dbError);
        throw new BadRequestException('Error al buscar placas de vehículos');
      }
    }
  }

  /**
   * Ejecuta una consulta dinámica contra el dataset especificado
   */
  async executeQuery(query: QueryRequest, enterpriseId: string): Promise<any> {
    console.log('🔧 [executeQuery] Iniciando ejecución de query:', {
      dataset: query.dataset,
      fields: query.fields,
      filters: query.filters?.length || 0,
      mode: query.mode,
      enterpriseId
    });

    let dataset: Dataset;
    let pipeline: any[];
    let collection: any;

    switch (query.dataset) {
      case 'alistamientos':
        dataset = await this.getAlistamientosDataset();

        // Procesar consulta para lógica especial de campos
        const processedQuery = this.processQuery(query, dataset);

        this.validateQuery(processedQuery, dataset);
        // Pasar la query original para determinar si necesita campos de dispositivos
        pipeline = this.buildAlistamientosPipeline(processedQuery, enterpriseId, query);
        collection = this.connection.collection('enlistments');

        // Almacenar query original para usar después
        this.originalQuery = query;
        break;

      case 'preventive_details':
        console.log('🔧 [executeQuery] Procesando dataset preventive_details');
        dataset = await this.getPreventiveMaintenanceDataset();
        console.log('🔧 [executeQuery] Dataset obtenido, campos disponibles:', dataset.fields.map(f => f.key));

        this.validateQuery(query, dataset);
        console.log('🔧 [executeQuery] Validación exitosa');

        pipeline = this.buildPreventiveDetailsPipeline(query, enterpriseId);
        collection = this.connection.collection('preventive_details');
        break;

      case 'corrective_details':
        console.log('🔧 [executeQuery] Procesando dataset corrective_details');
        dataset = await this.getCorrectiveMaintenanceDataset();
        console.log('🔧 [executeQuery] Dataset obtenido, campos disponibles:', dataset.fields.map(f => f.key));

        this.validateQuery(query, dataset);
        console.log('🔧 [executeQuery] Validación exitosa');

        pipeline = this.buildCorrectiveDetailsPipeline(query, enterpriseId);
        collection = this.connection.collection('corrective_details');
        break;

      default:
        throw new BadRequestException(`Dataset "${query.dataset}" no soportado`);
    }

    //console.log('🔍 [executeQuery] Ejecutando pipeline en colección:', collection.collectionName);
    const results = await collection.aggregate(pipeline).toArray();

    //console.log('📊 [executeQuery] Resultados obtenidos:', results.length);
    //console.log('📊 [executeQuery] Primer resultado (muestra):', JSON.stringify(results[0], null, 2));

    // Para alistamientos con pivot, detectar columnas dinámicas
    let dynamicColumns: any[] = [];
    const hasDeviceFields = this.originalQuery && this.originalQuery.fields.includes('dispositivo');
    if (query.dataset === 'alistamientos' && hasDeviceFields && results.length > 0) {
      const sampleResult = results[0];
      const staticFields = ['placa', 'nombresResponsable', 'nombresConductor', 'numeroIdentificacionConductor', 'Fecha', 'enterprise_id', 'mantenimientoId'];

      // Detectar campos dinámicos (los que no están en la lista estática)
      const dynamicFields = Object.keys(sampleResult).filter(key => !staticFields.includes(key));

      dynamicColumns = dynamicFields.map(fieldName => ({
        key: fieldName,
        label: fieldName,
        type: 'string',
        isDynamic: true
      }));

      //console.log('🎯 [executeQuery] Columnas dinámicas detectadas:', dynamicColumns);
    }

    return {
      dataset: dataset.name,
      totalRecords: results.length,
      data: results,
      query: query,
      dynamicColumns: dynamicColumns
    };
  }

  /**
   * Construye el pipeline de agregación para alistamientos con pivoteo de items
   */
  private buildAlistamientosPipeline(query: QueryRequest, enterpriseId: string, originalQuery?: QueryRequest): any[] {
    const pipeline: any[] = [];

    //console.log('🔧 [buildAlistamientosPipeline] Iniciando pipeline para alistamientos');
    //console.log('🔧 [buildAlistamientosPipeline] Query:', JSON.stringify(query, null, 2));
    //console.log('🔧 [buildAlistamientosPipeline] Enterprise ID:', enterpriseId);

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
        let: { itemId: '$items.itemId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$_id', '$$itemId']
              }
            }
          }
        ],
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
        // NO incluir estado de enlistments
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
                k: { $toString: '$$item.dispositivo' }, // Usar directamente el nombre del dispositivo
                v: '$$item.estado'
              }
            }
          }
        }
      }
    });

    // 10. Aplicar filtros adicionales si existen (ANTES del ReplaceRoot)
    if (query.filters && query.filters.length > 0) {
      // Para alistamientos, mapear 'Fecha' a 'createdAt' en los filtros
      const mappedFilters = query.filters.map(filter => {
        if (filter.field === 'Fecha') {
          return { ...filter, field: 'createdAt' };
        }
        if (filter.field === 'numeroIdentificacionConductor') {
          return { ...filter, field: 'numeroIdentificacion' };
        }
        return filter;
      });
      
      const matchConditions = this.buildFilterConditions(mappedFilters);
      //console.log('🔍 [buildAlistamientosPipeline] Match conditions:', JSON.stringify(matchConditions, null, 2));
      if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions });
      }
    }

    // 11. ReplaceRoot - Combinar campos base con campos pivoteados (SIN campos individuales dispositivo/estado)
    pipeline.push({
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            {
              _id: '$_id',
              placa: '$placa',
              nombresResponsable: '$nombresResponsable',
              nombresConductor: '$nombresConductor',
              numeroIdentificacionConductor: '$numeroIdentificacion', // Renombrando numeroIdentificacion -> numeroIdentificacionConductor
              Fecha: '$createdAt', // Renombrando createdAt -> Fecha
              enterprise_id: '$enterprise_id',
              mantenimientoId: '$mantenimientoId'
              // NO incluir campos individuales dispositivo/estado
              // NO incluir campos de debug en producción
            },
            { $ifNull: ['$pivotedItems', {}] } // Aquí se añaden las columnas dinámicas de dispositivos
          ]
        }
      }
    });

    // 12. Agrupación si es necesario
    if (query.mode === 'grouped' && query.groupBy && query.groupBy.length > 0) {
      pipeline.push(...this.buildGroupingPipeline(query));
    } else {
      // Verificar si la consulta original incluía campos de dispositivos
      const hasDeviceFields = (originalQuery?.fields || query.fields).includes('dispositivo') ||
                              (originalQuery?.fields || query.fields).includes('estado');
      const projection = this.buildAlistamientosProjection(query.fields, hasDeviceFields);
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

    //console.log('🔧 [buildAlistamientosPipeline] Pipeline final:', JSON.stringify(pipeline, null, 2));

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
      const isDateField = filter.field.includes('At') ||
                         filter.field.includes('fecha') ||
                         filter.field.includes('Fecha') ||
                         filter.field === 'fecha' ||
                         filter.field === 'Fecha' ||
                         filter.field === 'createdAt' ||
                         filter.field === 'updatedAt';

      if (isDateField && typeof processedValue === 'string') {
        // Extraer solo la fecha (YYYY-MM-DD) del valor, ignorando la hora
        const dateMatch = processedValue.match(/^(\d{4}-\d{2}-\d{2})/);
        
        if (dateMatch) {
          const dateOnly = dateMatch[1]; // YYYY-MM-DD
          
          // Para operadores >= y > usar inicio del día (00:00:00)
          // Para operadores <= y < usar final del día (23:59:59)
          if (filter.operator === 'gte' || filter.operator === 'gt') {
            processedValue = new Date(dateOnly + 'T00:00:00.000Z');
          } else if (filter.operator === 'lte' || filter.operator === 'lt') {
            processedValue = new Date(dateOnly + 'T23:59:59.999Z');
          } else {
            // Para eq y otros operadores, usar inicio del día
            processedValue = new Date(dateOnly + 'T00:00:00.000Z');
          }
        } else {
          // Si no hay match de fecha, intentar conversión directa
          processedValue = new Date(processedValue);
        }
      }

      switch (filter.operator) {
        case 'eq':
          // Para fechas, siempre usar rango completo del día
          if (isDateField && typeof filter.value === 'string') {
            // Extraer solo la fecha (YYYY-MM-DD) del valor, ignorando la hora
            const dateMatch = filter.value.match(/^(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              const dateOnly = dateMatch[1];
              const startOfDay = new Date(dateOnly + 'T00:00:00.000Z');
              const endOfDay = new Date(dateOnly + 'T23:59:59.999Z');
              conditions[filter.field] = { $gte: startOfDay, $lte: endOfDay };
            } else {
              conditions[filter.field] = processedValue;
            }
          } else {
            conditions[filter.field] = processedValue;
          }
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
   * Construye la proyección para alistamientos incluyendo campos dinámicos
   */
  private buildAlistamientosProjection(fields: string[], hasDeviceFields: boolean = false): any {
    if (hasDeviceFields) {
      // Si incluye campos de dispositivos, no usar proyección restrictiva
      // para permitir que aparezcan las columnas dinámicas de dispositivos
      const projection: any = {
        _id: 0,
        // Excluir campos de debug y el campo dispositivo individual
        debug_itemsWithDevices: 0,
        debug_allDeviceInfo: 0,
        debug_allItems: 0,
        dispositivo: 0 // Excluir la columna dispositivo individual
      };

      //console.log('🔧 [buildAlistamientosProjection] Proyección para alistamientos con dispositivos (sin restricciones):', projection);
      return projection;
    }

    // Si no incluye campos de dispositivos, usar proyección normal
    const projection: any = { _id: 0 };

    // Incluir solo los campos solicitados, pero excluir dispositivo si está presente
    fields.forEach(field => {
      if (field !== 'dispositivo') { // Nunca mostrar dispositivo como columna individual
        projection[field] = 1;
      }
    });

    // Siempre incluir campos clave
    projection.enterprise_id = 1;
    projection.mantenimientoId = 1;

    //console.log('🔧 [buildAlistamientosProjection] Proyección estándar para alistamientos:', projection);

    return projection;
  }

  /**
   * Construye la proyección para modo detalle (preventivos y correctivos)
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

    // Si se solicitan campos de fecha/hora de Bogotá explícitamente, asegurar que estén incluidos
    if (fields.includes('fechaBogota')) {
      projection.fechaBogota = 1;
    }
    if (fields.includes('horaBogota')) {
      projection.horaBogota = 1;
    }

    return projection;
  }

  /**
   * Procesa la consulta para manejar lógica especial de campos
   */
  private processQuery(query: QueryRequest, dataset: Dataset): QueryRequest {
    // Crear una copia de la consulta para no mutar la original
    const processedQuery = JSON.parse(JSON.stringify(query));

    // Lógica especial para el dataset de alistamientos
    if (query.dataset === 'alistamientos') {
      // Si se selecciona 'dispositivo' (Item), es un campo pivot especial
      if (processedQuery.fields.includes('dispositivo')) {
        // Remover TANTO 'dispositivo' como 'estado' porque se convierten en columnas dinámicas
        processedQuery.fields = processedQuery.fields.filter(field =>
          field !== 'dispositivo' && field !== 'estado'
        );

        //console.log('🔧 [processQuery] Campo "dispositivo" detectado: activando modo pivot');
        //console.log('🔧 [processQuery] Removidos campos individuales "dispositivo" y "estado"');
        //console.log('🔧 [processQuery] Campos resultantes para proyección:', processedQuery.fields);
        //console.log('🔧 [processQuery] Se generarán columnas dinámicas automáticamente');
      }

      // Si se selecciona solo 'estado' sin 'dispositivo', mantenerlo como campo normal
      if (processedQuery.fields.includes('estado') && !query.fields.includes('dispositivo')) {
        //console.log('🔧 [processQuery] Campo "estado" seleccionado sin pivoteo');
      }
    }

    return processedQuery;
  }

  /**
   * Valida que la consulta sea válida para el dataset
   */
  private validateQuery(query: QueryRequest, dataset: Dataset): void {
    const validFields = dataset.fields.map(f => f.key);

    // Para mantenimientos preventivos y correctivos, agregar campos calculados válidos
    if (query.dataset === 'preventive_details' || query.dataset === 'corrective_details') {
      validFields.push('fechaBogota', 'horaBogota');
    }

    // Validar campos solicitados
    for (const field of query.fields) {
      if (!validFields.includes(field)) {
        throw new BadRequestException(`Campo no válido: ${field}`);
      }
    }

    // Validar campos de agrupación
    if (query.groupBy) {
      for (const field of query.groupBy) {
        // Verificar si el campo está en la lista de campos válidos
        if (!validFields.includes(field)) {
          throw new BadRequestException(`Campo de agrupación no válido: ${field}`);
        }

        const fieldDef = dataset.fields.find(f => f.key === field);
        // Los campos calculados (fechaBogota, horaBogota) son agrupables por defecto
        const isCalculatedField = (query.dataset === 'preventive_details' || query.dataset === 'corrective_details') &&
                                 ['fechaBogota', 'horaBogota'].includes(field);

        if (!fieldDef && !isCalculatedField) {
          throw new BadRequestException(`Campo de agrupación no válido: ${field}`);
        }

        if (fieldDef && !fieldDef.groupable) {
          throw new BadRequestException(`Campo no agrupable: ${field}`);
        }
      }
    }

    // Validar agregaciones
    if (query.aggregations) {
      for (const agg of query.aggregations) {
        // Verificar si el campo está en la lista de campos válidos
        if (!validFields.includes(agg.field)) {
          throw new BadRequestException(`Campo de agregación no válido: ${agg.field}`);
        }

        const fieldDef = dataset.fields.find(f => f.key === agg.field);
        // Los campos calculados de fecha/hora no son agregables
        const isCalculatedField = (query.dataset === 'preventive_details') &&
                                 ['fechaBogota', 'horaBogota'].includes(agg.field);

        if (isCalculatedField) {
          throw new BadRequestException(`Campo calculado no agregable: ${agg.field}`);
        }

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

    // 2. AddFields - Convertir fecha a Date si es string, con manejo de errores
    pipeline.push({
      $addFields: {
        fechaAsDate: {
          $cond: {
            if: { $eq: [{ $type: "$fecha" }, "date"] },
            then: "$fecha",
            else: {
              $dateFromString: {
                dateString: {
                  $cond: {
                    if: { $eq: [{ $type: "$fecha" }, "string"] },
                    then: "$fecha",
                    else: null
                  }
                },
                onError: null
              }
            }
          }
        }
      }
    });

    // 3. AddFields - Convertir el campo hora original también si es string ISO
    pipeline.push({
      $addFields: {
        horaAsDate: {
          $cond: {
            if: { $eq: [{ $type: "$hora" }, "date"] },
            then: "$hora",
            else: {
              $dateFromString: {
                dateString: {
                  $cond: {
                    if: { $eq: [{ $type: "$hora" }, "string"] },
                    then: "$hora",
                    else: null
                  }
                },
                onError: null
              }
            }
          }
        }
      }
    });

    // 4. AddFields - Generar campos formateados de fecha y hora en horario de Bogotá (con protección contra null)
    pipeline.push({
      $addFields: {
        fechaBogota: {
          $cond: {
            if: { $ne: ["$fechaAsDate", null] },
            then: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$fechaAsDate",
                timezone: "America/Bogota"
              }
            },
            else: "N/A"
          }
        },
        horaBogota: {
          $cond: {
            if: { $ne: ["$fechaAsDate", null] },
            then: {
              $dateToString: {
                format: "%H:%M",
                date: "$fechaAsDate",
                timezone: "America/Bogota"
              }
            },
            else: "N/A"
          }
        },
        // Formatear el campo hora original para mostrar solo HH:mm
        hora: {
          $cond: {
            if: { $ne: ["$horaAsDate", null] },
            then: {
              $dateToString: {
                format: "%H:%M",
                date: "$horaAsDate",
                timezone: "America/Bogota"
              }
            },
            else: {
              $cond: {
                if: { $eq: [{ $type: "$hora" }, "string"] },
                then: "$hora", // Si ya es string, mantenerlo (por si ya está en formato HH:mm)
                else: "N/A"
              }
            }
          }
        }
      }
    });

    // 5. Aplicar filtros adicionales si existen
    if (query.filters && query.filters.length > 0) {
      // Para preventive_details, mapear 'fecha' a 'fechaAsDate' en los filtros
      const mappedFilters = query.filters.map(filter => {
        if (filter.field === 'fecha') {
          return { ...filter, field: 'fechaAsDate' };
        }
        return filter;
      });
      
      const matchConditions = this.buildFilterConditions(mappedFilters);
      //console.log('🔍 [buildPreventiveDetailsPipeline] Match conditions:', JSON.stringify(matchConditions, null, 2));
      if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions });
      }
    }

    // 6. Reemplazar campo 'fecha' con 'fechaBogota' si está en los campos solicitados
    if (query.fields.includes('fecha')) {
      pipeline.push({
        $addFields: {
          fecha: '$fechaBogota' // Reemplazar fecha con el formato legible
        }
      });
    }
    
    // 7. Agrupación si es necesario
    if (query.mode === 'grouped' && query.groupBy && query.groupBy.length > 0) {
      pipeline.push(...this.buildGroupingPipeline(query));
    } else {
      // Modo detalle: solo proyectar campos solicitados
      const projection = this.buildProjection(query.fields);
      pipeline.push({ $project: projection });
    }

    // 8. Ordenamiento
    pipeline.push({
      $sort: { fecha: -1, hora: -1 }
    });

    // 9. Límite si se especifica
    if (query.limit && query.limit > 0) {
      pipeline.push({ $limit: query.limit });
    }

    //console.log('🔧 [buildPreventiveDetailsPipeline] Pipeline final:', JSON.stringify(pipeline, null, 2));
    return pipeline;
  }

  /**
   * Construye el pipeline de agregación específico para mantenimientos correctivos
   */
  private buildCorrectiveDetailsPipeline(query: QueryRequest, enterpriseId: string): any[] {
    const pipeline: any[] = [];

    // 1. Match por empresa (OBLIGATORIO)
    pipeline.push({
      $match: {
        enterprise_id: enterpriseId
      }
    });

    // 2. AddFields - Convertir fecha a Date si es string, con manejo de errores
    pipeline.push({
      $addFields: {
        fechaAsDate: {
          $cond: {
            if: { $eq: [{ $type: "$fecha" }, "date"] },
            then: "$fecha",
            else: {
              $dateFromString: {
                dateString: {
                  $cond: {
                    if: { $eq: [{ $type: "$fecha" }, "string"] },
                    then: "$fecha",
                    else: null
                  }
                },
                onError: null
              }
            }
          }
        }
      }
    });

    // 3. AddFields - Convertir el campo hora original también si es string ISO
    pipeline.push({
      $addFields: {
        horaAsDate: {
          $cond: {
            if: { $eq: [{ $type: "$hora" }, "date"] },
            then: "$hora",
            else: {
              $dateFromString: {
                dateString: {
                  $cond: {
                    if: { $eq: [{ $type: "$hora" }, "string"] },
                    then: "$hora",
                    else: null
                  }
                },
                onError: null
              }
            }
          }
        }
      }
    });

    // 4. AddFields - Generar campos formateados de fecha y hora en horario de Bogotá (con protección contra null)
    pipeline.push({
      $addFields: {
        fechaBogota: {
          $cond: {
            if: { $ne: ["$fechaAsDate", null] },
            then: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$fechaAsDate",
                timezone: "America/Bogota"
              }
            },
            else: "N/A"
          }
        },
        horaBogota: {
          $cond: {
            if: { $ne: ["$fechaAsDate", null] },
            then: {
              $dateToString: {
                format: "%H:%M",
                date: "$fechaAsDate",
                timezone: "America/Bogota"
              }
            },
            else: "N/A"
          }
        },
        // Formatear el campo hora original para mostrar solo HH:mm
        hora: {
          $cond: {
            if: { $ne: ["$horaAsDate", null] },
            then: {
              $dateToString: {
                format: "%H:%M",
                date: "$horaAsDate",
                timezone: "America/Bogota"
              }
            },
            else: {
              $cond: {
                if: { $eq: [{ $type: "$hora" }, "string"] },
                then: "$hora", // Si ya es string, mantenerlo (por si ya está en formato HH:mm)
                else: "N/A"
              }
            }
          }
        }
      }
    });

    // 5. Aplicar filtros adicionales si existen
    if (query.filters && query.filters.length > 0) {
      // Para corrective_details, mapear 'fecha' a 'fechaAsDate' en los filtros
      const mappedFilters = query.filters.map(filter => {
        if (filter.field === 'fecha') {
          return { ...filter, field: 'fechaAsDate' };
        }
        return filter;
      });
      
      const matchConditions = this.buildFilterConditions(mappedFilters);
      //console.log('🔍 [buildCorrectiveDetailsPipeline] Match conditions:', JSON.stringify(matchConditions, null, 2));
      if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions });
      }
    }

    // 6. Reemplazar campo 'fecha' con 'fechaBogota' si está en los campos solicitados
    if (query.fields.includes('fecha')) {
      pipeline.push({
        $addFields: {
          fecha: '$fechaBogota' // Reemplazar fecha con el formato legible
        }
      });
    }
    
    // 7. Agrupación si es necesario
    if (query.mode === 'grouped' && query.groupBy && query.groupBy.length > 0) {
      pipeline.push(...this.buildGroupingPipeline(query));
    } else {
      // Modo detalle: solo proyectar campos solicitados
      const projection = this.buildProjection(query.fields);
      pipeline.push({ $project: projection });
    }

    // 8. Ordenamiento
    pipeline.push({
      $sort: { fecha: -1, hora: -1 }
    });

    // 9. Límite si se especifica
    if (query.limit && query.limit > 0) {
      pipeline.push({ $limit: query.limit });
    }

    //console.log('🔧 [buildCorrectiveDetailsPipeline] Pipeline final:', JSON.stringify(pipeline, null, 2));
    return pipeline;
  }
}