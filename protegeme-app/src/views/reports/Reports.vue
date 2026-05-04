<template>
  <div class="reports-container">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <i class="pi pi-chart-bar mr-3"></i>
          Reportes Dinámicos de Alistamientos
        </h1>
        <p class="page-description">
          Crea reportes personalizados, aplica filtros y exporta a Excel/PDF de manera visual
        </p>
      </div>
      <div class="header-actions">
        <Button
          label="Exportar a Excel"
          icon="pi pi-file-excel"
          @click="exportToExcel"
          :disabled="!hasResults || exporting"
          :loading="exporting && exportFormat === 'excel'"
          class="mr-2"
        />
        <Button
          label="Exportar a PDF"
          icon="pi pi-file-pdf"
          @click="exportToPDF"
          :disabled="!hasResults || exporting"
          :loading="exporting && exportFormat === 'pdf'"
          severity="secondary"
        />
      </div>
    </div>

    <!-- Panel de Acceso Rápido a Reportes Guardados -->
    <div class="quick-reports-section" v-if="quickReports.length > 0">
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <i class="pi pi-bookmark mr-2"></i>
              Reportes Guardados
            </div>
            <Button
              icon="pi pi-refresh"
              text
              @click="loadQuickReports"
              :loading="loadingQuickReports"
              title="Actualizar"
            />
          </div>
        </template>

        <template #content>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div
              v-for="report in quickReports"
              :key="report._id"
              class="quick-report-card"
            >
              <div class="p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-400"
                @click="executeQuickReport(report)"
              >
                <div class="flex items-start justify-between mb-2">
                  <h4 class="font-semibold text-sm text-gray-800 line-clamp-2">
                    {{ report.name }}
                  </h4>
                  <span v-if="report.is_public" class="text-green-600 text-xs">
                    <i class="pi pi-users"></i>
                  </span>
                </div>

                <p v-if="report.description" class="text-xs text-gray-500 mb-3 line-clamp-2">
                  {{ report.description }}
                </p>

                <div class="flex items-center justify-between text-xs text-gray-400">
                  <span>{{ report.fields?.length || 0 }} campos</span>
                  <span v-if="report.createdAt">
                    {{ formatQuickDate(report.createdAt) }}
                  </span>
                </div>

                <div class="flex items-center justify-between mt-3">
                  <Button
                    label="Ejecutar"
                    size="small"
                    @click.stop="executeQuickReport(report)"
                    :loading="executingReport === report._id"
                    class="flex-1 mr-2"
                  />
                  <Button
                    icon="pi pi-pencil"
                    size="small"
                    outlined
                    @click.stop="editQuickReport(report)"
                    title="Editar en constructor"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Constructor de Consultas -->
    <div class="query-builder-section">
      <DynamicQueryBuilder
        @queryExecuted="handleQueryResult"
        @loading="handleLoading"
      />
    </div>

    <!-- Resultados -->
    <div class="results-section" v-if="hasResults">
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <i class="pi pi-table mr-2"></i>
              Resultados del Reporte
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-gray-600">
                {{ queryResult?.totalRecords || 0 }} registros encontrados
              </span>
              <Button
                icon="pi pi-refresh"
                outlined
                size="small"
                @click="refreshResults"
                title="Actualizar resultados"
              />
            </div>
          </div>
        </template>

        <template #content>
          <div class="results-table-container">
            <DataTable
              :value="queryResult?.data || []"
              :loading="queryLoading"
              paginator
              :rows="20"
              :rowsPerPageOptions="[10, 20, 50, 100]"
              paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
              currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} registros"
              responsiveLayout="scroll"
              class="results-table"
              scrollable
              scrollHeight="600px"
              :virtualScrollerOptions="{ itemSize: 46 }"
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
                  <p class="text-gray-500">Ajusta los filtros o cambia la consulta para obtener datos</p>
                </div>
              </template>
            </DataTable>
          </div>
        </template>
      </Card>
    </div>

    <!-- Estado vacío cuando no hay resultados -->
    <div class="empty-state-container" v-else-if="!queryLoading">
      <Card>
        <template #content>
          <div class="text-center py-12">
            <i class="pi pi-search text-6xl text-gray-400 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-600 mb-2">Construye tu primer reporte</h3>
            <p class="text-gray-500 mb-4">
              Selecciona los campos que deseas incluir, aplica filtros y ejecuta la consulta para ver los resultados
            </p>
          </div>
        </template>
      </Card>
    </div>

    <!-- Dialog: Opciones de Exportación -->
    <Dialog
      v-model:visible="showExportDialog"
      header="Configurar Exportación"
      modal
      :style="{ width: '500px' }"
    >
      <div class="export-form">
        <div class="form-field">
          <label class="block text-sm font-medium mb-2">Título del reporte</label>
          <InputText
            v-model="exportOptions.customTitle"
            placeholder="Reporte de Alistamientos"
            class="w-full"
          />
        </div>

        <div class="form-field">
          <label class="block text-sm font-medium mb-2">Opciones de encabezado</label>
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <Checkbox v-model="exportOptions.includeHeader" binary inputId="includeHeader" />
              <label for="includeHeader">Incluir encabezado empresarial</label>
            </div>
            <div class="flex items-center gap-2">
              <Checkbox v-model="exportOptions.includeLogo" binary inputId="includeLogo" />
              <label for="includeLogo">Incluir logo de la empresa</label>
            </div>
          </div>
        </div>

        <div class="form-field" v-if="exportOptions.includeHeader">
          <label class="block text-sm font-medium mb-2">Colores del encabezado</label>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-600 mb-1">Color de fondo</label>
              <InputText v-model="exportOptions.headerColor" placeholder="#2563EB" />
            </div>
            <div>
              <label class="block text-xs text-gray-600 mb-1">Color de texto</label>
              <InputText v-model="exportOptions.textColor" placeholder="#FFFFFF" />
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            label="Cancelar"
            outlined
            @click="showExportDialog = false"
          />
          <Button
            :label="`Exportar ${exportFormat === 'excel' ? 'Excel' : 'PDF'}`"
            :icon="`pi pi-file-${exportFormat === 'excel' ? 'excel' : 'pdf'}`"
            @click="executeExport"
            :loading="exporting"
          />
        </div>
      </template>
    </Dialog>

    <!-- Toast Messages -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import Toast from 'primevue/toast'
import { DynamicReportsApi, type ExportQuery, type DatasetField, type SavedReport } from '../../api/dynamic-reports.service'
import DynamicQueryBuilder from '../../components/reports/DynamicQueryBuilder.vue'

// Composables
const toast = useToast()

// Estado reactivo
const queryLoading = ref(false)
const exporting = ref(false)
const exportFormat = ref<'excel' | 'pdf'>('excel')
const showExportDialog = ref(false)
const queryResult = ref<any>(null)
const lastQuery = ref<any>(null)

// Estado para reportes rápidos
const quickReports = ref<SavedReport[]>([])
const loadingQuickReports = ref(false)
const executingReport = ref<string | null>(null)

// Opciones de exportación
const exportOptions = reactive({
  customTitle: 'Reporte de Alistamientos',
  includeHeader: true,
  includeLogo: false,
  headerColor: '#2563EB',
  textColor: '#FFFFFF'
})

// Computed properties
const hasResults = computed(() => {
  return queryResult.value && queryResult.value.data && queryResult.value.data.length > 0
})

const displayFields = computed(() => {
  if (!queryResult.value || !lastQuery.value) return []

  // Obtener los campos que se solicitaron en la consulta
  const requestedFields = lastQuery.value.fields || []

  // Mapear a objetos con etiquetas
  return requestedFields.map((fieldKey: string) => {
    // Para simplificar, usamos el fieldKey como label también
    // En una implementación real, buscarías la definición del campo en el dataset
    return {
      key: fieldKey,
      label: formatFieldLabel(fieldKey),
      type: inferFieldType(fieldKey)
    }
  })
})

// Métodos principales
const handleQueryResult = (result: any) => {
  queryResult.value = result.data
  lastQuery.value = result.data.query
  toast.add({
    severity: 'success',
    summary: 'Consulta exitosa',
    detail: result.message,
    life: 3000
  })
}

const handleLoading = (loading: boolean) => {
  queryLoading.value = loading
}

const refreshResults = () => {
  // Reejecutar la última consulta
  if (lastQuery.value) {
    // Aquí podrías emitir un evento al QueryBuilder para que reejecutar la consulta
    toast.add({
      severity: 'info',
      summary: 'Actualizando',
      detail: 'Reejecutando la consulta...',
      life: 2000
    })
  }
}

// Métodos de exportación
const exportToExcel = () => {
  exportFormat.value = 'excel'
  showExportDialog.value = true
}

const exportToPDF = () => {
  exportFormat.value = 'pdf'
  showExportDialog.value = true
}

const executeExport = async () => {
  if (!queryResult.value || !lastQuery.value) {
    toast.add({
      severity: 'warn',
      summary: 'Sin datos',
      detail: 'No hay datos para exportar. Ejecuta una consulta primero.',
      life: 3000
    })
    return
  }

  try {
    exporting.value = true

    // Construir la consulta de exportación
    const exportQuery: ExportQuery = {
      ...lastQuery.value,
      format: exportFormat.value,
      customTitle: exportOptions.customTitle,
      includeHeader: exportOptions.includeHeader,
      includeLogo: exportOptions.includeLogo,
      headerColor: exportOptions.headerColor,
      textColor: exportOptions.textColor
    }

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `alistamientos_${timestamp}.${exportFormat.value === 'excel' ? 'xlsx' : 'pdf'}`

    if (exportFormat.value === 'excel') {
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

    showExportDialog.value = false
  } catch (error: any) {
    console.error('Export error:', error)
    toast.add({
      severity: 'error',
      summary: 'Error de exportación',
      detail: error.response?.data?.message || `Error al exportar a ${exportFormat.value.toUpperCase()}`,
      life: 3000
    })
  } finally {
    exporting.value = false
  }
}

// Helpers para formateo
const formatFieldLabel = (fieldKey: string): string => {
  const labels: Record<string, string> = {
    'placa': 'Placa',
    'nombresResponsable': 'Responsable',
    'nombresConductor': 'Conductor',
    'numeroIdentificacionConductor': 'Cédula Conductor',
    'estado': 'Estado',
    'sicov_sync_status': 'Estado SICOV',
    'createdAt': 'Fecha Creación',
    'fechaSyncSicov': 'Fecha Sync SICOV',
    'total_items': 'Total Ítems',
    'items_ok': 'Ítems Conformes',
    'items_falla': 'Ítems No Conformes',
    'porcentaje_conformidad': '% Conformidad'
  }
  return labels[fieldKey] || fieldKey
}

const inferFieldType = (fieldKey: string): string => {
  const types: Record<string, string> = {
    'placa': 'string',
    'nombresResponsable': 'string',
    'nombresConductor': 'string',
    'numeroIdentificacionConductor': 'string',
    'estado': 'boolean',
    'sicov_sync_status': 'string',
    'createdAt': 'date',
    'fechaSyncSicov': 'date',
    'total_items': 'number',
    'items_ok': 'number',
    'items_falla': 'number',
    'porcentaje_conformidad': 'number'
  }
  return types[fieldKey] || 'string'
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

// ── Métodos para Reportes Rápidos ──────────────────────────────────────────

const loadQuickReports = async () => {
  try {
    loadingQuickReports.value = true
    const { data } = await DynamicReportsApi.getSavedReports()
    // Limitar a los primeros 8 reportes para el panel rápido
    quickReports.value = (data || []).slice(0, 8)
  } catch (error) {
    console.error('Error loading quick reports:', error)
    quickReports.value = []
  } finally {
    loadingQuickReports.value = false
  }
}

const executeQuickReport = async (report: SavedReport) => {
  if (!report._id) return

  try {
    executingReport.value = report._id
    const result = await DynamicReportsApi.executeReport(report._id)

    queryResult.value = result.data
    lastQuery.value = result.data.query

    toast.add({
      severity: 'success',
      summary: 'Reporte ejecutado',
      detail: `"${report.name}" ejecutado exitosamente. ${result.data.totalRecords} registros encontrados.`,
      life: 3000
    })
  } catch (error: any) {
    console.error('Error executing quick report:', error)
    toast.add({
      severity: 'error',
      summary: 'Error al ejecutar',
      detail: error.response?.data?.message || `Error al ejecutar el reporte "${report.name}"`,
      life: 3000
    })
  } finally {
    executingReport.value = null
  }
}

const editQuickReport = (report: SavedReport) => {
  // Emitir evento para que el QueryBuilder cargue este reporte
  // Para esto, necesitaremos una referencia al componente QueryBuilder
  toast.add({
    severity: 'info',
    summary: 'Cargando reporte',
    detail: `Cargando "${report.name}" en el constructor de consultas`,
    life: 2000
  })

  // Hacer scroll hacia el constructor de consultas
  const queryBuilder = document.querySelector('.query-builder-section')
  if (queryBuilder) {
    queryBuilder.scrollIntoView({ behavior: 'smooth' })
  }
}

const formatQuickDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-CO', {
    month: 'short',
    day: 'numeric'
  })
}

// Inicialización
onMounted(() => {
  loadQuickReports()
})
</script>

<style scoped>
.reports-container {
  padding: 1.5rem;
  max-width: 100%;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  display: flex;
  align-items: center;
}

.page-description {
  color: #6b7280;
  margin-top: 0.5rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.quick-reports-section {
  margin-bottom: 2rem;
}

.query-builder-section {
  margin-bottom: 2rem;
}

.results-section {
  margin-bottom: 2rem;
}

.quick-report-card {
  height: 100%;
}

.quick-report-card .p-card-content {
  padding: 0;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.results-table-container {
  width: 100%;
  overflow-x: auto;
}

.results-table {
  @apply bg-white rounded-lg shadow-sm;
  border: 1px solid #e5e7eb;
}

.empty-results {
  @apply text-center py-12;
}

.empty-state-container {
  margin-top: 2rem;
}

.export-form {
  @apply space-y-6;
}

.form-field {
  @apply space-y-2;
}

.form-field label {
  @apply block text-sm font-medium text-gray-700;
}

/* Estilos específicos para valores de tabla */
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
@media (max-width: 768px) {
  .reports-container {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
  }

  .header-actions {
    width: 100%;
    justify-content: center;
  }
}

/* Mejoras visuales para la tabla de resultados */
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

/* Loading states */
.loading-overlay {
  position: relative;
}

.loading-overlay::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
</style>