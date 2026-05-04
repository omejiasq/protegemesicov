import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_MAINTENANCE_URL

export interface DatasetField {
  key: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean'
  groupable: boolean
  aggregations?: ('sum' | 'avg' | 'count')[]
}

export interface Dataset {
  id: string
  name: string
  source: string
  fields: DatasetField[]
}

export interface FilterCondition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'nin'
  value: any
  logic?: 'and' | 'or'
}

export interface Aggregation {
  field: string
  type: 'sum' | 'avg' | 'count' | 'min' | 'max'
}

export interface DynamicQuery {
  dataset: string
  fields: string[]
  filters?: FilterCondition[]
  groupBy?: string[]
  aggregations?: Aggregation[]
  mode?: 'detail' | 'grouped'
  limit?: number
}

export interface ExportQuery extends DynamicQuery {
  format?: 'excel' | 'pdf'
  includeHeader?: boolean
  includeLogo?: boolean
  customTitle?: string
  headerColor?: string
  textColor?: string
}

export interface QueryResult {
  dataset: string
  totalRecords: number
  data: any[]
  query: DynamicQuery
}

export interface SavedReport {
  _id?: string
  name: string
  description?: string
  dataset: string
  fields: string[]
  filters?: FilterCondition[]
  groupBy?: string[]
  aggregations?: Aggregation[]
  mode?: 'detail' | 'grouped'
  limit?: number
  is_public?: boolean
  is_active?: boolean
  enterprise_id?: string
  created_by?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateReportDto {
  name: string
  description?: string
  dataset: string
  fields: string[]
  filters?: FilterCondition[]
  groupBy?: string[]
  aggregations?: Aggregation[]
  mode?: 'detail' | 'grouped'
  limit?: number
  is_public?: boolean
}

export interface UpdateReportDto {
  name?: string
  description?: string
  fields?: string[]
  filters?: FilterCondition[]
  groupBy?: string[]
  aggregations?: Aggregation[]
  mode?: 'detail' | 'grouped'
  limit?: number
  is_public?: boolean
  is_active?: boolean
}

export class DynamicReportsApi {
  private static getAuthToken(): string {
    return localStorage.getItem('token') || ''
  }

  private static getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json'
    }
  }

  /**
   * Obtiene todos los datasets disponibles
   */
  static async getAvailableDatasets(): Promise<{ success: boolean; data: Dataset[] }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/reports/datasets`, {
        headers: this.getAuthHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Error fetching datasets:', error)
      throw error
    }
  }

  /**
   * Obtiene la definición del dataset de alistamientos
   */
  static async getAlistamientosDataset(): Promise<{ success: boolean; data: Dataset }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/reports/datasets/alistamientos`, {
        headers: this.getAuthHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Error fetching alistamientos dataset:', error)
      throw error
    }
  }

  /**
   * Ejecuta una consulta dinámica
   */
  static async executeQuery(query: DynamicQuery): Promise<{ success: boolean; data: QueryResult; message: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/reports/query`, query, {
        headers: this.getAuthHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Error executing query:', error)
      throw error
    }
  }

  /**
   * Exporta a Excel
   */
  static async exportToExcel(query: ExportQuery, filename?: string): Promise<void> {
    try {
      const response = await axios.post(`${API_BASE_URL}/reports/export/excel`, query, {
        headers: this.getAuthHeaders(),
        responseType: 'blob'
      })

      // Crear blob y descargar archivo
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `alistamientos_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      throw error
    }
  }

  /**
   * Exporta a PDF
   */
  static async exportToPDF(query: ExportQuery, filename?: string): Promise<void> {
    try {
      const response = await axios.post(`${API_BASE_URL}/reports/export/pdf`, query, {
        headers: this.getAuthHeaders(),
        responseType: 'blob'
      })

      // Crear blob y descargar archivo
      const blob = new Blob([response.data], { type: 'application/pdf' })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `alistamientos_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      throw error
    }
  }

  // ── Gestión de Reportes Guardados ────────────────────────────────────────

  /**
   * Obtiene todos los reportes guardados de la empresa
   */
  static async getSavedReports(): Promise<{ success: boolean; data: SavedReport[] }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/reports/templates`, {
        headers: this.getAuthHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Error fetching saved reports:', error)
      throw error
    }
  }

  /**
   * Obtiene un reporte específico por ID
   */
  static async getSavedReport(id: string): Promise<{ success: boolean; data: SavedReport }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/reports/templates/${id}`, {
        headers: this.getAuthHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Error fetching saved report:', error)
      throw error
    }
  }

  /**
   * Guarda un nuevo reporte
   */
  static async saveReport(report: CreateReportDto): Promise<{ success: boolean; data: SavedReport; message: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/reports/templates`, report, {
        headers: this.getAuthHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Error saving report:', error)
      throw error
    }
  }

  /**
   * Actualiza un reporte existente
   */
  static async updateSavedReport(id: string, report: UpdateReportDto): Promise<{ success: boolean; data: SavedReport; message: string }> {
    try {
      const response = await axios.put(`${API_BASE_URL}/reports/templates/${id}`, report, {
        headers: this.getAuthHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Error updating saved report:', error)
      throw error
    }
  }

  /**
   * Elimina un reporte guardado
   */
  static async deleteSavedReport(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.delete(`${API_BASE_URL}/reports/templates/${id}`, {
        headers: this.getAuthHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Error deleting saved report:', error)
      throw error
    }
  }

  /**
   * Duplica un reporte guardado
   */
  static async duplicateReport(id: string, newName: string): Promise<{ success: boolean; data: SavedReport; message: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/reports/templates/${id}/duplicate`, {
        newName: newName
      }, {
        headers: this.getAuthHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Error duplicating report:', error)
      throw error
    }
  }

  /**
   * Ejecuta un reporte guardado
   */
  static async executeReport(id: string): Promise<{ success: boolean; data: QueryResult; message: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/reports/templates/${id}/execute`, {}, {
        headers: this.getAuthHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Error executing saved report:', error)
      throw error
    }
  }

  /**
   * Convierte un DynamicQuery a CreateReportDto
   */
  static queryToReportDto(query: DynamicQuery, name: string, description?: string, isPublic: boolean = false): CreateReportDto {
    return {
      name,
      description,
      dataset: query.dataset,
      fields: query.fields,
      filters: query.filters,
      groupBy: query.groupBy,
      aggregations: query.aggregations,
      mode: query.mode || 'detail',
      limit: query.limit || 1000,
      is_public: isPublic
    }
  }

  /**
   * Convierte un SavedReport a DynamicQuery
   */
  static reportToQuery(report: SavedReport): DynamicQuery {
    return {
      dataset: report.dataset,
      fields: report.fields,
      filters: report.filters,
      groupBy: report.groupBy,
      aggregations: report.aggregations,
      mode: report.mode || 'detail',
      limit: report.limit || 1000
    }
  }
}