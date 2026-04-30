// src/api/reports.service.ts
import { http } from './http'

const base = import.meta.env.VITE_API_MAINTENANCE_URL;
const url = (path: string) => `${base}/reports${path}`;

export interface CreateReportTemplateDto {
  nombre: string
  descripcion?: string
  categoria?: 'operacional' | 'gerencial' | 'regulatorio' | 'personalizado'
  configuracion: {
    tipo: string
    collections: string[]
    campos: Array<{
      path: string
      label: string
      type: string
      visible?: boolean
      format?: string
      aggregation?: string
    }>
    filtros?: Array<{
      field: string
      operator: string
      value: any
      logic?: 'and' | 'or'
    }>
    ordenamiento?: Array<{
      campo: string
      direccion: 'asc' | 'desc'
    }>
    agrupacion?: string[]
    limite?: number
  }
  branding?: {
    includeHeader?: boolean
    includeLogo?: boolean
    headerColor?: string
    textColor?: string
    customTitle?: string
  }
  isPublic?: boolean
  tags?: string[]
  scheduledConfig?: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    recipients: string[]
    nextRun?: Date
  }
}

export interface GenerateReportDto {
  dateRange?: {
    start?: string
    end?: string
  }
  additionalFilters?: Record<string, any>
  format?: 'excel' | 'pdf' | 'csv'
  includeCharts?: boolean
}

export interface ReportTemplate {
  _id: string
  nombre: string
  descripcion?: string
  categoria: string
  configuracion: any
  branding?: any
  enterprise_id: string
  createdBy?: string
  activo: boolean
  lastUsed?: Date
  usageCount: number
  isPublic: boolean
  tags: string[]
  scheduledConfig?: any
  createdAt: Date
  updatedAt: Date
}

export const ReportsApi = {
  // ── Gestión de plantillas ────────────────────────────────────────────

  async getTemplates(filters?: {
    categoria?: string
    activo?: boolean
    isPublic?: boolean
    search?: string
  }) {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }

    return http.get(`${url('/templates')}?${params.toString()}`)
  },

  async getTemplate(id: string) {
    return http.get(url(`/templates/${id}`))
  },

  async createTemplate(data: CreateReportTemplateDto) {
    return http.post(url('/templates'), data)
  },

  async updateTemplate(id: string, data: Partial<CreateReportTemplateDto>) {
    return http.put(url(`/templates/${id}`), data)
  },

  async deleteTemplate(id: string) {
    return http.delete(url(`/templates/${id}`))
  },

  async duplicateTemplate(id: string, newName: string) {
    return http.post(url(`/templates/${id}/duplicate`), { newName })
  },

  // ── Generación y exportación ─────────────────────────────────────────

  async generateReport(id: string, params: GenerateReportDto) {
    return http.post(url(`/templates/${id}/generate`), params)
  },

  async exportReport(id: string, params: GenerateReportDto): Promise<Blob> {
    const response = await http.post(url(`/templates/${id}/export`), params, {
      responseType: 'blob'
    })
    return response.data
  },

  async downloadReport(id: string, params: GenerateReportDto, filename?: string) {
    try {
      const blob = await this.exportReport(id, params)

      // Crear URL para descarga
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Determinar nombre del archivo
      const format = params.format || 'excel'
      const extension = format === 'excel' ? 'xlsx' : format
      link.download = filename || `reporte_${Date.now()}.${extension}`

      // Trigger descarga
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      return { success: true }
    } catch (error) {
      console.error('Error downloading report:', error)
      throw error
    }
  },

  // ── Descubrimiento de campos ─────────────────────────────────────────

  async getAvailableCollections() {
    return http.get(url('/collections'))
  },

  async getAvailableFields(collections: string[]) {
    return http.post(url('/fields'), { collections })
  },

  async getCollectionFields(
    collectionName: string,
    filters?: {
      types?: string[]
      excludePaths?: string[]
      includeNested?: boolean
    }
  ) {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.types) params.append('types', filters.types.join(','))
      if (filters.excludePaths) params.append('excludePaths', filters.excludePaths.join(','))
      if (filters.includeNested) params.append('includeNested', 'true')
    }

    return http.get(url(`/collections/${collectionName}/fields?${params.toString()}`))
  },

  // ── Utilidades ────────────────────────────────────────────────────────

  async getReportPreview(templateConfig: any, sampleSize = 10) {
    return http.post(url('/preview'), {
      ...templateConfig,
      limite: sampleSize
    })
  },

  async validateTemplate(templateConfig: any) {
    return http.post(url('/validate'), templateConfig)
  },

  async getReportStats(id: string, dateRange?: { start: string; end: string }) {
    const params = new URLSearchParams()
    if (dateRange) {
      params.append('start', dateRange.start)
      params.append('end', dateRange.end)
    }

    return http.get(url(`/templates/${id}/stats?${params.toString()}`))
  }
}

// ── Tipos auxiliares ─────────────────────────────────────────────────────

export interface FieldInfo {
  path: string
  label: string
  type: string
  isRequired?: boolean
  isArray?: boolean
  enumValues?: string[]
  ref?: string
  nested?: FieldInfo[]
}

export interface CollectionInfo {
  name: string
  displayName: string
  fields: FieldInfo[]
}

export interface ReportData {
  template: ReportTemplate
  data: any[]
  generatedAt: Date
  parameters: GenerateReportDto
}

export interface ReportFilters {
  categoria?: string
  activo?: boolean
  isPublic?: boolean
  search?: string
  tags?: string[]
  createdBy?: string
  dateRange?: {
    start: string
    end: string
  }
}

// ── Constantes útiles ────────────────────────────────────────────────────

export const REPORT_CATEGORIES = [
  { value: 'operacional', label: 'Operacional' },
  { value: 'gerencial', label: 'Gerencial' },
  { value: 'regulatorio', label: 'Regulatorio' },
  { value: 'personalizado', label: 'Personalizado' }
] as const

export const EXPORT_FORMATS = [
  { value: 'excel', label: 'Excel (.xlsx)', icon: 'pi pi-file-excel' },
  { value: 'csv', label: 'CSV (.csv)', icon: 'pi pi-file' },
  { value: 'pdf', label: 'PDF (.pdf)', icon: 'pi pi-file-pdf' }
] as const

export const FIELD_TYPES = [
  { value: 'string', label: 'Texto', icon: 'pi pi-align-left' },
  { value: 'number', label: 'Número', icon: 'pi pi-hashtag' },
  { value: 'date', label: 'Fecha', icon: 'pi pi-calendar' },
  { value: 'boolean', label: 'Booleano', icon: 'pi pi-check-square' },
  { value: 'array', label: 'Lista', icon: 'pi pi-list' },
  { value: 'objectid', label: 'ID', icon: 'pi pi-key' },
  { value: 'enum', label: 'Opciones', icon: 'pi pi-list' }
] as const

export const OPERATORS = [
  { value: 'eq', label: 'Igual a', types: ['string', 'number', 'date', 'boolean'] },
  { value: 'ne', label: 'Diferente de', types: ['string', 'number', 'date', 'boolean'] },
  { value: 'gt', label: 'Mayor que', types: ['number', 'date'] },
  { value: 'gte', label: 'Mayor o igual', types: ['number', 'date'] },
  { value: 'lt', label: 'Menor que', types: ['number', 'date'] },
  { value: 'lte', label: 'Menor o igual', types: ['number', 'date'] },
  { value: 'like', label: 'Contiene', types: ['string'] },
  { value: 'in', label: 'En lista', types: ['string', 'number', 'date'] },
  { value: 'nin', label: 'No en lista', types: ['string', 'number', 'date'] }
] as const

export const AGGREGATIONS = [
  { value: 'sum', label: 'Suma', types: ['number'] },
  { value: 'avg', label: 'Promedio', types: ['number'] },
  { value: 'count', label: 'Contar', types: ['string', 'number', 'date', 'boolean'] },
  { value: 'min', label: 'Mínimo', types: ['number', 'date'] },
  { value: 'max', label: 'Máximo', types: ['number', 'date'] }
] as const