// src/reports/services/field-discovery.service.ts
import { Injectable } from '@nestjs/common';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';

export interface FieldInfo {
  path: string;
  label: string;
  type: string;
  isRequired?: boolean;
  isArray?: boolean;
  enumValues?: string[];
  ref?: string; // Para referencias
  nested?: FieldInfo[]; // Para objetos anidados
}

export interface CollectionInfo {
  name: string;
  displayName: string;
  fields: FieldInfo[];
}

@Injectable()
export class FieldDiscoveryService {
  constructor(@InjectConnection() private connection: Connection) {}

  async getAvailableCollections(): Promise<CollectionInfo[]> {
    if (!this.connection.db) {
      throw new Error('Database connection not available');
    }

    const collections = await this.connection.db.listCollections().toArray();
    const result: CollectionInfo[] = [];

    for (const collection of collections) {
      const collectionName = collection.name;

      // Filtrar solo las colecciones que nos interesan
      if (this.isRelevantCollection(collectionName)) {
        const fields = await this.getCollectionFields(collectionName);
        result.push({
          name: collectionName,
          displayName: this.getDisplayName(collectionName),
          fields
        });
      }
    }

    return result;
  }

  async getCollectionFields(collectionName: string): Promise<FieldInfo[]> {
    try {
      // Obtener esquema desde el modelo registrado si existe
      const model = this.connection.models[this.getModelName(collectionName)];
      if (model && model.schema) {
        return this.extractFieldsFromSchema(model.schema);
      }

      // Fallback: analizar documentos existentes
      return await this.analyzeCollectionSamples(collectionName);
    } catch (error) {
      console.warn(`Error analyzing collection ${collectionName}:`, error.message);
      return [];
    }
  }

  private extractFieldsFromSchema(schema: any): FieldInfo[] {
    const fields: FieldInfo[] = [];
    const paths = schema.paths;

    for (const [path, schemaType] of Object.entries(paths)) {
      // Omitir campos internos de MongoDB
      if (['_id', '__v', 'createdAt', 'updatedAt'].includes(path)) {
        continue;
      }

      const fieldInfo = this.createFieldInfo(path, schemaType as any);
      if (fieldInfo) {
        fields.push(fieldInfo);
      }
    }

    return fields.sort((a, b) => a.label.localeCompare(b.label));
  }

  private createFieldInfo(path: string, schemaType: any): FieldInfo | null {
    const instance = schemaType.instance;
    const options = schemaType.options || {};

    let type = this.mapMongooseType(instance);
    let label = this.generateLabel(path);

    // Detectar arrays
    const isArray = schemaType.schema || Array.isArray(schemaType.type);
    if (isArray) {
      type = 'array';
      if (schemaType.schema) {
        // Array de subdocumentos
        const nested = this.extractFieldsFromSchema(schemaType.schema);
        return {
          path,
          label,
          type,
          isArray: true,
          nested
        };
      }
    }

    // Detectar enums
    const enumValues = options.enum;
    if (enumValues && Array.isArray(enumValues)) {
      type = 'enum';
    }

    // Detectar referencias
    const ref = options.ref;

    return {
      path,
      label,
      type,
      isRequired: !!options.required,
      isArray,
      enumValues,
      ref
    };
  }

  private async analyzeCollectionSamples(collectionName: string): Promise<FieldInfo[]> {
    if (!this.connection.db) {
      throw new Error('Database connection not available');
    }

    const collection = this.connection.db.collection(collectionName);

    // Obtener muestra de documentos para análisis
    const samples = await collection.find({})
      .limit(100)
      .toArray();

    if (samples.length === 0) {
      return [];
    }

    const fieldMap = new Map<string, FieldInfo>();

    samples.forEach(doc => {
      this.analyzeDocument(doc, '', fieldMap);
    });

    return Array.from(fieldMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }

  private analyzeDocument(obj: any, prefix: string, fieldMap: Map<string, FieldInfo>, depth = 0): void {
    // Limitar profundidad para evitar ciclos infinitos
    if (depth > 3) return;

    for (const [key, value] of Object.entries(obj)) {
      // Omitir campos internos
      if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) {
        continue;
      }

      const path = prefix ? `${prefix}.${key}` : key;

      if (!fieldMap.has(path)) {
        const fieldInfo = this.analyzeValue(path, value, depth);
        if (fieldInfo) {
          fieldMap.set(path, fieldInfo);
        }
      }

      // Analizar objetos anidados
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        this.analyzeDocument(value, path, fieldMap, depth + 1);
      }
    }
  }

  private analyzeValue(path: string, value: any, depth: number): FieldInfo | null {
    let type = 'string';
    let isArray = false;
    let nested: FieldInfo[] | undefined;

    if (value === null || value === undefined) {
      return {
        path,
        label: this.generateLabel(path),
        type: 'mixed'
      };
    }

    if (Array.isArray(value)) {
      isArray = true;
      if (value.length > 0) {
        const firstItem = value[0];
        if (typeof firstItem === 'object' && firstItem !== null && !(firstItem instanceof Date)) {
          type = 'array';
          const nestedMap = new Map<string, FieldInfo>();
          this.analyzeDocument(firstItem, '', nestedMap, depth + 1);
          nested = Array.from(nestedMap.values());
        } else {
          type = this.getJavaScriptType(firstItem);
        }
      }
    } else {
      type = this.getJavaScriptType(value);
    }

    return {
      path,
      label: this.generateLabel(path),
      type,
      isArray,
      nested
    };
  }

  private mapMongooseType(instance: string): string {
    const typeMap: Record<string, string> = {
      'String': 'string',
      'Number': 'number',
      'Date': 'date',
      'Boolean': 'boolean',
      'ObjectID': 'objectid',
      'Buffer': 'buffer',
      'Mixed': 'mixed',
      'Decimal128': 'decimal',
      'Array': 'array'
    };

    return typeMap[instance] || 'string';
  }

  private getJavaScriptType(value: any): string {
    if (value instanceof Date) return 'date';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') {
      // Detectar ObjectIds
      if (/^[0-9a-fA-F]{24}$/.test(value)) return 'objectid';
      return 'string';
    }
    return 'mixed';
  }

  private generateLabel(path: string): string {
    return path
      .split('.')
      .pop()!
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ')
      .trim();
  }

  private getDisplayName(collectionName: string): string {
    const displayNames: Record<string, string> = {
      'terminal_salidas': 'Despachos de Salida',
      'terminal_llegadas': 'Llegadas de Terminal',
      'terminal_novedades': 'Novedades de Terminal',
      'users': 'Usuarios',
      'vehicles': 'Vehículos',
      'alistamientos': 'Alistamientos',
      'conductores': 'Conductores',
      'empresas': 'Empresas',
      'report_templates': 'Plantillas de Reportes'
    };

    return displayNames[collectionName] || this.generateLabel(collectionName);
  }

  private getModelName(collectionName: string): string {
    const modelNames: Record<string, string> = {
      'terminal_salidas': 'TerminalSalida',
      'terminal_llegadas': 'TerminalLlegada',
      'terminal_novedades': 'TerminalNovedad',
      'users': 'User',
      'vehicles': 'Vehicle',
      'alistamientos': 'Alistamiento',
      'conductores': 'Conductor',
      'empresas': 'Empresa',
      'report_templates': 'ReportTemplate'
    };

    return modelNames[collectionName] || collectionName;
  }

  private isRelevantCollection(collectionName: string): boolean {
    const relevantCollections = [
      'terminal_salidas',
      'terminal_llegadas',
      'terminal_novedades',
      'users',
      'vehicles',
      'alistamientos',
      'conductores',
      'empresas'
    ];

    return relevantCollections.includes(collectionName) ||
           !collectionName.startsWith('system.') &&
           !collectionName.startsWith('__');
  }

  // Método para obtener campos específicos de una colección con filtros
  async getFilteredFields(collectionName: string, filters?: {
    types?: string[];
    excludePaths?: string[];
    includeNested?: boolean;
  }): Promise<FieldInfo[]> {
    const fields = await this.getCollectionFields(collectionName);

    if (!filters) return fields;

    return fields.filter(field => {
      // Filtrar por tipos
      if (filters.types && !filters.types.includes(field.type)) {
        return false;
      }

      // Excluir paths específicos
      if (filters.excludePaths && filters.excludePaths.includes(field.path)) {
        return false;
      }

      // Incluir/excluir campos anidados
      if (!filters.includeNested && field.nested) {
        return false;
      }

      return true;
    });
  }
}