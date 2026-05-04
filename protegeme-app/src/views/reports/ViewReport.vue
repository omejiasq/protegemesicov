<template>
  <div class="view-report">
    <!-- Header con información del reporte -->
    <div class="page-header" v-if="report">
      <div class="header-navigation">
        <Button
          icon="pi pi-arrow-left"
          @click="goBack"
          text
          class="back-btn"
        />
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <i class="pi pi-eye mr-3"></i>
              {{ report.name }}
            </h1>
            <div class="report-badges">
              <Tag
                v-if="report.is_public"
                icon="pi pi-users"
                severity="success"
                value="Público"
              />
              <Tag
                v-else
                icon="pi pi-lock"
                severity="info"
                value="Privado"
              />
              <Tag
                :value="report.mode === 'grouped' ? 'Agrupado' : 'Detalle'"
                :severity="report.mode === 'grouped' ? 'warning' : 'info'"
              />
            </div>
          </div>
          <p v-if="report.description" class="page-description">
            {{ report.description }}
          </p>
        </div>
      </div>
      <div class="header-actions">
        <Button
          label="Ejecutar Reporte"
          icon="pi pi-play"
          @click="executeReport"
          :loading="executing"
          class="btn-primary"
        />
        <Button
          v-if="canEdit"
          label="Editar"
          icon="pi pi-pencil"
          @click="editReport"
          outlined
        />
        <Button
          icon="pi pi-ellipsis-v"
          @click="toggleMenu"
          text
        />
      </div>
    </div>

    <!-- Información del reporte -->
    <div class="report-info" v-if="report">
      <div class="info-grid">
        <Card class="info-card">
          <template #title>
            <i class="pi pi-info-circle mr-2"></i>
            Detalles del Reporte
          </template>
          <template #content>
            <div class="info-content">
              <div class="info-item">
                <label>Tipo de Reporte:</label>
                <span>{{ report.mode === 'grouped' ? 'Agrupado' : 'Detalle' }}</span>
              </div>
              <div class="info-item">
                <label>Campos Seleccionados:</label>
                <span>{{ report.fields?.length || 0 }} campos</span>
              </div>
              <div class="info-item">
                <label>Filtros Aplicados:</label>
                <span>{{ report.filters?.length || 0 }} filtros</span>
              </div>
              <div class="info-item">
                <label>Límite de Registros:</label>
                <span>{{ report.limit || 1000 }} registros</span>
              </div>
              <div class="info-item">
                <label>Fecha de Creación:</label>
                <span>{{ formatDate(report.createdAt) }}</span>
              </div>
              <div class="info-item" v-if="report.updatedAt !== report.createdAt">
                <label>Última Modificación:</label>
                <span>{{ formatDate(report.updatedAt) }}</span>
              </div>
            </div>
          </template>
        </Card>

        <Card class="info-card">
          <template #title>
            <i class="pi pi-table mr-2"></i>
            Campos del Reporte
          </template>
          <template #content>
            <div class="fields-preview">
              <div
                v-for="(fieldKey, index) in report.fields"
                :key="fieldKey"
                class="field-preview"
              >
                <div class="field-info">
                  <h5 class="field-name">{{ getFieldLabel(fieldKey) }}</h5>
                  <Tag :value="getFieldType(fieldKey)" :severity="getFieldTypeSeverity(getFieldType(fieldKey))" />
                </div>
                <span class="field-order">{{ index + 1 }}</span>
              </div>
            </div>
          </template>
        </Card>

        <!-- Filtros aplicados -->
        <Card v-if="report.filters && report.filters.length > 0" class="info-card">
          <template #title>
            <i class="pi pi-filter mr-2"></i>
            Filtros Aplicados
          </template>
          <template #content>
            <div class="filters-preview">
              <div
                v-for="(filter, index) in report.filters"
                :key="`filter-${index}`"
                class="filter-preview"
              >
                <div class="filter-content">
                  <strong>{{ getFieldLabel(filter.field) }}</strong>
                  <span class="filter-operator">{{ getOperatorLabel(filter.operator) }}</span>
                  <span class="filter-value">"{{ filter.value }}"</span>
                </div>
                <Tag
                  v-if="index < report.filters.length - 1"
                  :value="filter.logic?.toUpperCase() || 'Y'"
                  severity="secondary"
                  class="logic-tag"
                />
              </div>
            </div>
          </template>
        </Card>

        <!-- Configuración de agrupación -->
        <Card v-if="report.mode === 'grouped'" class="info-card">
          <template #title>
            <i class="pi pi-sitemap mr-2"></i>
            Configuración de Agrupación
          </template>
          <template #content>
            <div class="grouping-preview">
              <div v-if="report.groupBy && report.groupBy.length > 0" class="grouping-section">
                <h5>Agrupar por:</h5>
                <div class="grouping-fields">
                  <Tag
                    v-for="fieldKey in report.groupBy"
                    :key="`group-${fieldKey}`"
                    :value="getFieldLabel(fieldKey)"
                    severity="info"
                  />
                </div>
              </div>

              <div v-if="report.aggregations && report.aggregations.length > 0" class="aggregations-section">
                <h5>Agregaciones:</h5>
                <div class="aggregations-list">
                  <div
                    v-for="(agg, index) in report.aggregations"
                    :key="`agg-${index}`"
                    class="aggregation-item"
                  >
                    <span class="agg-field">{{ getFieldLabel(agg.field) }}</span>
                    <i class="pi pi-arrow-right"></i>
                    <span class="agg-type">{{ getAggregationLabel(agg.type) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Resultados del reporte -->
    <div v-if="results" class="results-section">
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <i class="pi pi-chart-bar mr-2"></i>
              Resultados del Reporte
            </div>
            <div class="results-actions">
              <Button
                label="Exportar Excel"
                icon="pi pi-file-excel"
                @click="exportToExcel"
                :disabled="exporting"
                :loading="exporting && exportFormat === 'excel'"
                outlined
                size="small"
                class="mr-2"
              />
              <Button
                label="Exportar PDF"
                icon="pi pi-file-pdf"
                @click="exportToPDF"
                :disabled="exporting"
                :loading="exporting && exportFormat === 'pdf'"
                outlined
                size="small"
              />
            </div>
          </div>
        </template>

        <template #content>
          <div class="results-summary">
            <div class="summary-stats">
              <div class="stat-item">
                <i class="pi pi-database"></i>
                <span class="stat-number">{{ results.totalRecords }}</span>
                <span class="stat-label">Registros</span>
              </div>
              <div class="stat-item">
                <i class="pi pi-table"></i>
                <span class="stat-number">{{ displayFields.length }}</span>
                <span class="stat-label">Campos</span>
              </div>
              <div class="stat-item">
                <i class="pi pi-clock"></i>
                <span class="stat-number">{{ executionTime }}ms</span>
                <span class="stat-label">Tiempo</span>
              </div>
            </div>
          </div>

          <div class="results-table-container">
            <DataTable
              :value="results.data"
              :paginator="true"
              :rows="20"
              :rowsPerPageOptions="[10, 20, 50, 100]"
              paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
              currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} registros"
              responsiveLayout="scroll"
              class="results-table"
              scrollable
              scrollHeight="600px"
              :loading="executing"
            >
              <Column
                v-for="field in displayFields"
                :key="field.key"
                :field="field.key"
                :header="field.label"
                :sortable="true"
              >
                <template #body="slotProps">
                  <span :class="getFieldValueClass(field.type)">
                    {{ formatFieldValue(slotProps.data[field.key], field.type) }}
                  </span>
                </template>
              </Column>

              <template #empty>
                <div class="empty-results">
                  <i class="pi pi-info-circle text-4xl text-gray-400 mb-4"></i>
                  <h3 class="text-lg font-semibold text-gray-600 mb-2">No se encontraron resultados</h3>
                  <p class="text-gray-500">Los filtros aplicados no arrojaron datos</p>
                </div>
              </template>
            </DataTable>
          </div>
        </template>
      </Card>
    </div>

    <!-- Estado de carga -->
    <div v-else-if="!results && !report" class="loading-state">
      <Card>
        <template #content>
          <div class="loading-content">
            <ProgressSpinner />
            <p>Cargando información del reporte...</p>
          </div>
        </template>
      </Card>
    </div>

    <!-- Estado inicial -->
    <div v-else-if="report && !results" class="initial-state">
      <Card>
        <template #content>
          <div class="initial-content">
            <i class="pi pi-play-circle text-6xl text-blue-500 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-700 mb-2">Listo para Ejecutar</h3>
            <p class="text-gray-500 mb-4">
              Haz clic en "Ejecutar Reporte" para ver los resultados con la configuración actual
            </p>
            <Button
              label="Ejecutar Reporte"
              icon="pi pi-play"
              @click="executeReport"
              :loading="executing"
              class="btn-primary"
            />
          </div>
        </template>
      </Card>
    </div>

    <!-- Menú contextual -->
    <Menu ref="contextMenu" :model="menuItems" :popup="true" />

    <!-- Toast para notificaciones -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'

// Componentes PrimeVue
import Button from 'primevue/button'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Menu from 'primevue/menu'
import ProgressSpinner from 'primevue/progressspinner'
import Toast from 'primevue/toast'

// Services y tipos
import {
  DynamicReportsApi,
  type SavedReport,
  type QueryResult,
  type DatasetField,
  type Dataset,
  type ExportQuery
} from '../../api/dynamic-reports.service'

// Composables
const route = useRoute()
const router = useRouter()
const toast = useToast()

// Referencias del template
const contextMenu = ref()

// Estado reactivo
const loading = ref(false)
const executing = ref(false)
const exporting = ref(false)
const exportFormat = ref<'excel' | 'pdf'>('excel')
const report = ref<SavedReport | null>(null)
const results = ref<QueryResult | null>(null)
const dataset = ref<Dataset | null>(null)
const executionTime = ref(0)
const currentUserId = ref<string>('') // Se debe obtener del contexto de autenticación

// Computed properties
const canEdit = computed(() => {
  return report.value && report.value.created_by === currentUserId.value
})

const displayFields = computed(() => {
  if (!report.value || !dataset.value) return []

  return report.value.fields
    .map(fieldKey => {
      const fieldDef = dataset.value!.fields.find(f => f.key === fieldKey)
      return {
        key: fieldKey,
        label: fieldDef?.label || fieldKey,
        type: fieldDef?.type || 'string'
      }
    })
    .filter(field => field !== undefined)
})

// Menú contextual
const menuItems = computed(() => [
  {
    label: 'Ejecutar',
    icon: 'pi pi-play',
    command: executeReport
  },
  {
    separator: true
  },
  {
    label: 'Duplicar',
    icon: 'pi pi-copy',
    command: duplicateReport
  },
  ...(canEdit.value ? [
    {
      separator: true
    },
    {
      label: 'Editar',
      icon: 'pi pi-pencil',
      command: editReport
    }
  ] : [])
])

// Métodos principales
const loadReport = async () => {
  const reportId = route.params.id as string
  if (!reportId) {
    router.push('/pesv/reports')
    return
  }

  try {
    loading.value = true
    const { data } = await DynamicReportsApi.getSavedReport(reportId)
    report.value = data
  } catch (error: any) {
    console.error('Error loading report:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Error al cargar el reporte',
      life: 3000
    })
    router.push('/pesv/reports')
  } finally {
    loading.value = false
  }
}

const loadDataset = async () => {
  try {
    const { data } = await DynamicReportsApi.getAlistamientosDataset()
    dataset.value = data
  } catch (error) {
    console.error('Error loading dataset:', error)
  }
}

const executeReport = async () => {
  if (!report.value?._id) return

  try {
    executing.value = true
    const startTime = Date.now()

    const { data } = await DynamicReportsApi.executeReport(report.value._id)
    results.value = data
    executionTime.value = Date.now() - startTime

    toast.add({
      severity: 'success',
      summary: 'Reporte ejecutado',
      detail: `${data.totalRecords} registros encontrados`,
      life: 3000
    })
  } catch (error: any) {
    console.error('Error executing report:', error)
    toast.add({
      severity: 'error',
      summary: 'Error al ejecutar',
      detail: error.response?.data?.message || 'Error al ejecutar el reporte',
      life: 3000
    })
  } finally {
    executing.value = false
  }
}

const exportToExcel = async () => {
  if (!results.value || !report.value) return
  await exportReport('excel')
}

const exportToPDF = async () => {
  if (!results.value || !report.value) return
  await exportReport('pdf')
}

const exportReport = async (format: 'excel' | 'pdf') => {
  if (!results.value || !report.value) return

  try {
    exporting.value = true
    exportFormat.value = format

    const exportQuery: ExportQuery = {
      dataset: report.value.dataset,
      fields: report.value.fields,
      filters: report.value.filters,
      groupBy: report.value.groupBy,
      aggregations: report.value.aggregations,
      mode: report.value.mode,
      limit: report.value.limit,
      format: format,
      customTitle: report.value.name,
      includeHeader: true,
      includeLogo: false
    }

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `${report.value.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${format === 'excel' ? 'xlsx' : 'pdf'}`

    if (format === 'excel') {
      await DynamicReportsApi.exportToExcel(exportQuery, filename)
    } else {
      await DynamicReportsApi.exportToPDF(exportQuery, filename)
    }

    toast.add({
      severity: 'success',
      summary: 'Exportación exitosa',
      detail: `Archivo ${filename} descargado correctamente`,
      life: 3000
    })
  } catch (error: any) {
    console.error('Export error:', error)
    toast.add({
      severity: 'error',
      summary: 'Error de exportación',
      detail: error.response?.data?.message || `Error al exportar a ${format.toUpperCase()}`,
      life: 3000
    })
  } finally {
    exporting.value = false
  }
}

const duplicateReport = async () => {
  if (!report.value?._id) return

  try {
    const newName = `${report.value.name} (Copia)`
    await DynamicReportsApi.duplicateReport(report.value._id, newName)

    toast.add({
      severity: 'success',
      summary: 'Reporte duplicado',
      detail: `Reporte duplicado como "${newName}"`,
      life: 3000
    })

    router.push('/pesv/reports')
  } catch (error: any) {
    console.error('Error duplicating report:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Error al duplicar el reporte',
      life: 3000
    })
  }
}

const editReport = () => {
  if (report.value?._id) {
    router.push(`/pesv/reports/edit/${report.value._id}`)
  }
}

const goBack = () => {
  router.push('/pesv/reports')
}

const toggleMenu = (event: Event) => {
  contextMenu.value.toggle(event)
}

// Helpers
const getFieldLabel = (fieldKey: string): string => {
  const field = dataset.value?.fields.find(f => f.key === fieldKey)
  return field?.label || fieldKey
}

const getFieldType = (fieldKey: string): string => {
  const field = dataset.value?.fields.find(f => f.key === fieldKey)
  return field?.type || 'string'
}

const getFieldTypeSeverity = (type: string): string => {
  switch (type) {
    case 'string': return 'info'
    case 'number': return 'success'
    case 'date': return 'warning'
    case 'boolean': return 'secondary'
    default: return 'info'
  }
}

const getOperatorLabel = (operator: string): string => {
  const operatorLabels: Record<string, string> = {
    eq: 'igual a',
    ne: 'diferente de',
    gt: 'mayor que',
    gte: 'mayor o igual a',
    lt: 'menor que',
    lte: 'menor o igual a',
    like: 'contiene',
    in: 'en lista',
    nin: 'no en lista'
  }
  return operatorLabels[operator] || operator
}

const getAggregationLabel = (type: string): string => {
  const aggregationLabels: Record<string, string> = {
    count: 'Contar',
    sum: 'Suma',
    avg: 'Promedio',
    min: 'Mínimo',
    max: 'Máximo'
  }
  return aggregationLabels[type] || type
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Fecha no disponible'

  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatFieldValue = (value: any, type: string): string => {
  if (value === null || value === undefined) return ''

  switch (type) {
    case 'date':
      return new Date(value).toLocaleDateString('es-CO')
    case 'number':
      return typeof value === 'number' ? value.toLocaleString('es-CO') : value
    case 'boolean':
      return value ? 'Sí' : 'No'
    default:
      return String(value)
  }
}

const getFieldValueClass = (type: string): string => {
  switch (type) {
    case 'number':
      return 'text-right font-mono'
    case 'date':
      return 'text-gray-600'
    case 'boolean':
      return 'font-medium'
    default:
      return ''
  }
}

// Inicialización
onMounted(() => {
  loadReport()
  loadDataset()
  // Obtener el ID del usuario actual del contexto de autenticación
  // currentUserId.value = getCurrentUserId()
})
</script>

<style scoped>
.view-report {
  padding: 1.5rem;
  max-width: 100%;
  background: #fafbfc;
  min-height: calc(100vh - 80px);
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.header-navigation {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  flex: 1;
}

.back-btn {
  margin-top: 0.25rem;
  flex-shrink: 0;
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
  margin: 0;
}

.report-badges {
  display: flex;
  gap: 0.5rem;
}

.page-description {
  color: #6b7280;
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.6;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.btn-primary {
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  border-radius: 8px;
}

/* Información del reporte */
.report-info {
  margin-bottom: 2rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.info-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  height: fit-content;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 6px;
}

.info-item label {
  font-weight: 600;
  color: #374151;
}

.info-item span {
  color: #6b7280;
}

/* Vista previa de campos */
.fields-preview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
}

.field-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 6px;
  border-left: 4px solid #3b82f6;
}

.field-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.field-name {
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.field-order {
  background: #3b82f6;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.75rem;
}

/* Vista previa de filtros */
.filters-preview {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
  border-left: 4px solid #f59e0b;
}

.filter-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-operator {
  color: #6b7280;
  font-style: italic;
}

.filter-value {
  color: #1f2937;
  font-family: monospace;
  background: #e5e7eb;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.logic-tag {
  align-self: flex-start;
}

/* Configuración de agrupación */
.grouping-preview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.grouping-section,
.aggregations-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.grouping-section h5,
.aggregations-section h5 {
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.grouping-fields {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.aggregations-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.aggregation-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 6px;
}

.agg-field {
  font-weight: 600;
  color: #1f2937;
}

.agg-type {
  color: #059669;
  font-weight: 500;
}

/* Resultados */
.results-section {
  margin-bottom: 2rem;
}

.results-actions {
  display: flex;
  gap: 0.5rem;
}

.results-summary {
  margin-bottom: 1.5rem;
}

.summary-stats {
  display: flex;
  gap: 2rem;
  justify-content: center;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}

.stat-item i {
  font-size: 1.5rem;
  color: #3b82f6;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  text-transform: uppercase;
  font-weight: 500;
  letter-spacing: 0.05em;
}

.results-table-container {
  width: 100%;
  overflow-x: auto;
}

.results-table {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.empty-results {
  text-align: center;
  padding: 3rem;
}

/* Estados especiales */
.loading-state,
.initial-state {
  margin-top: 2rem;
}

.loading-content,
.initial-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.loading-content p {
  margin-top: 1rem;
  color: #6b7280;
}

.initial-content {
  color: #6b7280;
}

/* Utilidades de campo */
.text-right {
  text-align: right;
}

.font-mono {
  font-family: 'Courier New', monospace;
}

.text-gray-600 {
  color: #6b7280;
}

.font-medium {
  font-weight: 500;
}

/* Responsive */
@media (max-width: 1024px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .summary-stats {
    flex-direction: column;
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .view-report {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .header-navigation {
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .title-section {
    align-items: center;
  }

  .results-actions {
    flex-direction: column;
    width: 100%;
  }

  .filter-content {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* Scroll personalizado */
.fields-preview::-webkit-scrollbar {
  width: 6px;
}

.fields-preview::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.fields-preview::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.fields-preview::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Mejoras visuales para la tabla */
.results-table :deep(.p-datatable-thead) {
  background: #f8fafc;
}

.results-table :deep(.p-datatable-thead th) {
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

.results-table :deep(.p-datatable-tbody tr:nth-child(even)) {
  background: #f9fafb;
}

.results-table :deep(.p-datatable-tbody tr:hover) {
  background: #f3f4f6;
}
</style>