<template>
  <div class="results-report">
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
          <h1 class="page-title">
            <i class="pi pi-chart-bar mr-3"></i>
            Resultados: {{ report.name }}
          </h1>
          <div class="result-summary">
            <Badge :value="results?.totalRecords || 0" severity="success" />
            <span class="summary-text">registros encontrados</span>
            <span class="execution-time">• Tiempo: {{ executionTime }}ms</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <Button
          label="Exportar Excel"
          icon="pi pi-file-excel"
          @click="exportToExcel"
          :disabled="!hasResults || exporting"
          :loading="exporting && exportFormat === 'excel'"
          class="mr-2"
        />
        <Button
          label="Exportar PDF"
          icon="pi pi-file-pdf"
          @click="exportToPDF"
          :disabled="!hasResults || exporting"
          :loading="exporting && exportFormat === 'pdf'"
          severity="secondary"
        />
      </div>
    </div>

    <!-- Filtros aplicados (si existen) -->
    <Card v-if="hasAppliedFilters" class="filters-summary">
      <template #title>
        <i class="pi pi-filter mr-2"></i>
        Filtros Aplicados
      </template>
      <template #content>
        <div class="filters-display">
          <Tag
            v-for="(filter, index) in report.filters"
            :key="`filter-${index}`"
            :value="`${getFieldLabel(filter.field)} ${getOperatorLabel(filter.operator)} ${filter.value}`"
            severity="info"
          />
        </div>
      </template>
    </Card>

    <!-- Resultados -->
    <Card v-if="results" class="results-card">
      <template #title>
        <div class="results-header">
          <div class="flex items-center">
            <i class="pi pi-table mr-2"></i>
            Datos del Reporte
          </div>
          <div class="results-actions">
            <Button
              icon="pi pi-refresh"
              @click="refreshResults"
              title="Actualizar resultados"
              outlined
              size="small"
            />
          </div>
        </div>
      </template>

      <template #content>
        <div class="results-container">
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
            :loading="loading"
            :globalFilterFields="globalFilterFields"
            v-model:globalFilter="globalFilter"
            :exportFilename="exportFilename"
          >
            <!-- Header con filtros globales -->
            <template #header>
              <div class="table-header">
                <span class="p-input-icon-left">
                  <i class="pi pi-search" />
                  <InputText
                    v-model="globalFilter"
                    placeholder="Buscar en toda la tabla..."
                    class="global-search"
                  />
                </span>
              </div>
            </template>

            <!-- Columnas dinámicas -->
            <Column
              v-for="field in displayFields"
              :key="field.key"
              :field="field.key"
              :header="field.label"
              :sortable="true"
              :style="getColumnStyle(field.type)"
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
                <p class="text-gray-500">No hay datos que coincidan con los criterios de búsqueda</p>
              </div>
            </template>

            <template #loading>
              <div class="loading-results">
                <ProgressSpinner />
                <p>Cargando resultados...</p>
              </div>
            </template>
          </DataTable>
        </div>
      </template>
    </Card>

    <!-- Estado de carga inicial -->
    <div v-else-if="loading" class="loading-state">
      <Card>
        <template #content>
          <div class="loading-content">
            <ProgressSpinner />
            <p>Ejecutando reporte...</p>
          </div>
        </template>
      </Card>
    </div>

    <!-- Toast para notificaciones -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'

// Componentes PrimeVue
import Button from 'primevue/button'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Badge from 'primevue/badge'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import Toast from 'primevue/toast'

// Services y tipos
import {
  DynamicReportsApi,
  type SavedReport,
  type QueryResult,
  type Dataset,
  type ExportQuery
} from '../../api/dynamic-reports.service'

// Composables
const route = useRoute()
const router = useRouter()
const toast = useToast()

// Estado reactivo
const loading = ref(false)
const exporting = ref(false)
const exportFormat = ref<'excel' | 'pdf'>('excel')
const report = ref<SavedReport | null>(null)
const results = ref<QueryResult | null>(null)
const dataset = ref<Dataset | null>(null)
const executionTime = ref(0)

// Filtros de tabla
const globalFilter = ref('')

// Computed properties
const hasResults = computed(() => {
  return results.value && results.value.data && results.value.data.length > 0
})

const hasAppliedFilters = computed(() => {
  return report.value?.filters && report.value.filters.length > 0
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

const globalFilterFields = computed(() => {
  return displayFields.value.map(field => field.key)
})

const exportFilename = computed(() => {
  if (!report.value) return 'reporte'
  const timestamp = new Date().toISOString().split('T')[0]
  return `${report.value.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`
})

// Métodos principales
const loadReportAndExecute = async () => {
  const reportId = route.query.reportId as string
  if (!reportId) {
    router.push('/pesv/reports')
    return
  }

  try {
    loading.value = true

    // Cargar información del reporte
    const { data: reportData } = await DynamicReportsApi.getSavedReport(reportId)
    report.value = reportData

    // Cargar dataset
    const { data: datasetData } = await DynamicReportsApi.getAlistamientosDataset()
    dataset.value = datasetData

    // Ejecutar el reporte
    const startTime = Date.now()
    const { data: resultsData } = await DynamicReportsApi.executeReport(reportId)
    results.value = resultsData
    executionTime.value = Date.now() - startTime

    // Los filtros de tabla se inicializan automáticamente

    toast.add({
      severity: 'success',
      summary: 'Reporte ejecutado',
      detail: `${resultsData.totalRecords} registros encontrados`,
      life: 3000
    })
  } catch (error: any) {
    console.error('Error loading and executing report:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Error al cargar y ejecutar el reporte',
      life: 3000
    })
    router.push('/pesv/reports')
  } finally {
    loading.value = false
  }
}


const refreshResults = async () => {
  if (!report.value?._id) return

  try {
    loading.value = true
    const startTime = Date.now()

    const { data } = await DynamicReportsApi.executeReport(report.value._id)
    results.value = data
    executionTime.value = Date.now() - startTime

    toast.add({
      severity: 'success',
      summary: 'Resultados actualizados',
      detail: `${data.totalRecords} registros encontrados`,
      life: 2000
    })
  } catch (error: any) {
    console.error('Error refreshing results:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error al actualizar los resultados',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const exportToExcel = async () => {
  await exportReport('excel')
}

const exportToPDF = async () => {
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
    const filename = `${exportFilename.value}.${format === 'excel' ? 'xlsx' : 'pdf'}`

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

const goBack = () => {
  router.push('/pesv/reports')
}

// Helpers
const getFieldLabel = (fieldKey: string): string => {
  const field = dataset.value?.fields.find(f => f.key === fieldKey)
  return field?.label || fieldKey
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

const getColumnStyle = (type: string): any => {
  switch (type) {
    case 'number':
      return { minWidth: '120px', textAlign: 'right' }
    case 'date':
      return { minWidth: '150px' }
    default:
      return { minWidth: '150px' }
  }
}

// Inicialización
onMounted(() => {
  loadReportAndExecute()
})
</script>

<style scoped>
.results-report {
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

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
  margin: 0 0 0.5rem 0;
}

.result-summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #6b7280;
}

.summary-text {
  font-size: 0.9rem;
}

.execution-time {
  font-size: 0.85rem;
  color: #9ca3af;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

/* Filtros aplicados */
.filters-summary {
  margin-bottom: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.filters-display {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* Resultados */
.results-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.results-container {
  width: 100%;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.global-search {
  width: 300px;
}


.results-table {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

/* Estados especiales */
.empty-results,
.loading-results {
  text-align: center;
  padding: 3rem;
}

.loading-state {
  margin-top: 2rem;
}

.loading-content {
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

/* Mejoras visuales para la tabla */
.results-table :deep(.p-datatable-thead) {
  background: #f8fafc;
}

.results-table :deep(.p-datatable-thead th) {
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
  padding: 1rem 0.75rem;
}

.results-table :deep(.p-datatable-tbody tr:nth-child(even)) {
  background: #f9fafb;
}

.results-table :deep(.p-datatable-tbody tr:hover) {
  background: #f3f4f6;
}

.results-table :deep(.p-datatable-tbody td) {
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}


/* Responsive */
@media (max-width: 768px) {
  .results-report {
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

  .result-summary {
    justify-content: center;
  }

  .global-search {
    width: 100%;
  }

  .filters-display {
    justify-content: center;
  }
}
</style>