<template>
  <div class="reports-container">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <i class="pi pi-chart-bar mr-3"></i>
          Constructor de Reportes
        </h1>
        <p class="page-description">
          Crea, gestiona y genera reportes personalizados de manera visual
        </p>
      </div>
      <div class="header-actions">
        <Button
          label="Nueva Plantilla"
          icon="pi pi-plus"
          @click="showCreateDialog = true"
          class="primary-button"
        />
      </div>
    </div>

    <!-- Filtros y Búsqueda -->
    <div class="filters-section">
      <Card class="filter-card">
        <template #content>
          <div class="filter-controls">
            <div class="search-input">
              <IconField iconPosition="left">
                <InputIcon class="pi pi-search" />
                <InputText
                  v-model="searchQuery"
                  placeholder="Buscar plantillas..."
                  class="w-full"
                />
              </IconField>
            </div>

            <Dropdown
              v-model="selectedCategory"
              :options="categoryOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Todas las categorías"
              showClear
              class="category-filter"
            />

            <ToggleButton
              v-model="showOnlyActive"
              onLabel="Solo activos"
              offLabel="Todos"
              onIcon="pi pi-eye"
              offIcon="pi pi-eye-slash"
              class="status-toggle"
            />

            <Button
              icon="pi pi-refresh"
              outlined
              @click="loadTemplates"
              :loading="loading"
              class="refresh-button"
            />
          </div>
        </template>
      </Card>
    </div>

    <!-- Lista de Plantillas -->
    <div class="templates-section">
      <DataTable
        :value="filteredTemplates"
        :loading="loading"
        paginator
        :rows="10"
        :rowsPerPageOptions="[10, 25, 50]"
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} plantillas"
        responsiveLayout="scroll"
        class="templates-table"
        :globalFilterFields="['nombre', 'descripcion', 'tags']"
        :lazy="false"
        :virtualScrollerOptions="{ itemSize: 46 }"
      >
        <template #header>
          <div class="table-header">
            <h3>Plantillas de Reportes</h3>
            <div class="table-actions">
              <Button
                label="Exportar Lista"
                icon="pi pi-download"
                outlined
                size="small"
                @click="exportTemplatesList"
              />
            </div>
          </div>
        </template>

        <Column field="nombre" header="Nombre" sortable>
          <template #body="slotProps">
            <div class="template-name">
              <i :class="getCategoryIcon(slotProps.data.categoria)" class="mr-2"></i>
              <span class="font-semibold">{{ slotProps.data.nombre }}</span>
              <div class="template-meta" v-if="slotProps.data.descripcion">
                <small>{{ slotProps.data.descripcion }}</small>
              </div>
            </div>
          </template>
        </Column>

        <Column field="categoria" header="Categoría" sortable>
          <template #body="slotProps">
            <Badge
              :value="formatCategory(slotProps.data.categoria)"
              :severity="getCategorySeverity(slotProps.data.categoria)"
            />
          </template>
        </Column>

        <Column field="configuracion.collections" header="Fuentes de Datos">
          <template #body="slotProps">
            <div class="data-sources">
              <Tag
                v-for="collection in slotProps.data.configuracion.collections"
                :key="collection"
                :value="getCollectionDisplayName(collection)"
                rounded
                class="mr-1 mb-1"
              />
            </div>
          </template>
        </Column>

        <Column field="usageCount" header="Usos" sortable>
          <template #body="slotProps">
            <div class="usage-info">
              <span class="font-semibold">{{ slotProps.data.usageCount }}</span>
              <div class="text-xs text-gray-500" v-if="slotProps.data.lastUsed">
                Último: {{ formatDate(slotProps.data.lastUsed) }}
              </div>
            </div>
          </template>
        </Column>

        <Column field="activo" header="Estado" sortable>
          <template #body="slotProps">
            <Badge
              :value="slotProps.data.activo ? 'Activo' : 'Inactivo'"
              :severity="slotProps.data.activo ? 'success' : 'danger'"
            />
          </template>
        </Column>

        <Column field="createdAt" header="Creado" sortable>
          <template #body="slotProps">
            {{ formatDate(slotProps.data.createdAt) }}
          </template>
        </Column>

        <Column header="Acciones" class="action-column">
          <template #body="slotProps">
            <div class="action-buttons">
              <Button
                icon="pi pi-play"
                size="small"
                outlined
                v-tooltip="'Generar reporte'"
                @click="generateReport(slotProps.data)"
              />
              <Button
                icon="pi pi-eye"
                size="small"
                outlined
                v-tooltip="'Ver detalles'"
                @click="viewTemplate(slotProps.data)"
              />
              <Button
                icon="pi pi-pencil"
                size="small"
                outlined
                v-tooltip="'Editar'"
                @click="editTemplate(slotProps.data)"
              />
              <Button
                icon="pi pi-copy"
                size="small"
                outlined
                v-tooltip="'Duplicar'"
                @click="duplicateTemplate(slotProps.data)"
              />
              <Button
                icon="pi pi-trash"
                size="small"
                outlined
                severity="danger"
                v-tooltip="'Eliminar'"
                @click="confirmDeleteTemplate(slotProps.data)"
              />
            </div>
          </template>
        </Column>

        <template #empty>
          <div class="empty-state">
            <i class="pi pi-chart-bar text-6xl text-gray-400 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-600 mb-2">No hay plantillas</h3>
            <p class="text-gray-500 mb-4">Comienza creando tu primera plantilla de reporte</p>
            <Button
              label="Crear Plantilla"
              icon="pi pi-plus"
              @click="showCreateDialog = true"
            />
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Dialog: Crear/Editar Plantilla -->
    <Dialog
      v-model:visible="showCreateDialog"
      :header="editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla de Reporte'"
      modal
      :style="{ width: '90vw', height: '90vh' }"
      :maximizable="true"
      class="template-dialog"
    >
      <div class="template-form">
        <!-- Información Básica -->
        <div class="form-section">
          <h4 class="section-title">Información Básica</h4>
          <div class="form-grid">
            <div class="form-field">
              <label>Nombre de la Plantilla *</label>
              <InputText
                v-model="templateForm.nombre"
                placeholder="Ej: Reporte de Despachos Mensuales"
                class="w-full"
              />
            </div>

            <div class="form-field">
              <label>Categoría</label>
              <Dropdown
                v-model="templateForm.categoria"
                :options="categoryOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar categoría"
                class="w-full"
              />
            </div>

            <div class="form-field span-2">
              <label>Descripción</label>
              <Textarea
                v-model="templateForm.descripcion"
                placeholder="Describe el propósito y contenido del reporte"
                rows="3"
                class="w-full"
              />
            </div>

            <div class="form-field">
              <label>Tags (opcional)</label>
              <Chips
                v-model="templateForm.tags"
                placeholder="Agregar tags"
                class="w-full"
              />
            </div>

            <div class="form-field">
              <div class="checkbox-field">
                <Checkbox
                  v-model="templateForm.isPublic"
                  binary
                  inputId="isPublic"
                />
                <label for="isPublic">Compartir con otras empresas</label>
              </div>
            </div>
          </div>
        </div>

        <!-- Constructor de Consulta -->
        <div class="form-section">
          <h4 class="section-title">Configuración del Reporte</h4>
          <Suspense>
            <template #default>
              <QueryBuilder v-model="templateForm.configuracion" />
            </template>
            <template #fallback>
              <div class="loading-placeholder">
                <i class="pi pi-spin pi-spinner"></i>
                Cargando constructor de consultas...
              </div>
            </template>
          </Suspense>
        </div>

        <!-- Configuración de Branding -->
        <div class="form-section">
          <h4 class="section-title">Personalización Visual</h4>
          <div class="branding-grid">
            <div class="branding-field">
              <div class="checkbox-field">
                <Checkbox
                  v-model="templateForm.branding.includeHeader"
                  binary
                  inputId="includeHeader"
                />
                <label for="includeHeader">Incluir encabezado empresarial</label>
              </div>
            </div>

            <div class="branding-field">
              <div class="checkbox-field">
                <Checkbox
                  v-model="templateForm.branding.includeLogo"
                  binary
                  inputId="includeLogo"
                />
                <label for="includeLogo">Incluir logo</label>
              </div>
            </div>

            <div class="branding-field">
              <label>Color del encabezado</label>
              <ColorPicker v-model="templateForm.branding.headerColor" />
            </div>

            <div class="branding-field">
              <label>Color del texto</label>
              <ColorPicker v-model="templateForm.branding.textColor" />
            </div>

            <div class="branding-field span-2">
              <label>Título personalizado</label>
              <InputText
                v-model="templateForm.branding.customTitle"
                placeholder="Ej: Reporte Gerencial de Operaciones"
                class="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <Button
            label="Cancelar"
            outlined
            @click="closeCreateDialog"
            class="mr-2"
          />
          <Button
            label="Vista Previa"
            outlined
            icon="pi pi-eye"
            @click="previewTemplate"
            :loading="previewing"
            class="mr-2"
          />
          <Button
            :label="editingTemplate ? 'Actualizar' : 'Crear'"
            icon="pi pi-save"
            @click="saveTemplate"
            :loading="saving"
          />
        </div>
      </template>
    </Dialog>

    <!-- Dialog: Generar Reporte -->
    <Dialog
      v-model:visible="showGenerateDialog"
      header="Generar Reporte"
      modal
      :style="{ width: '600px' }"
      class="generate-dialog"
    >
      <div class="generate-form" v-if="selectedTemplate">
        <h4 class="mb-4">{{ selectedTemplate.nombre }}</h4>

        <div class="form-field">
          <label>Rango de Fechas (opcional)</label>
          <Calendar
            v-model="generateForm.dateRange"
            selectionMode="range"
            dateFormat="yy-mm-dd"
            placeholder="Seleccionar rango"
            class="w-full"
          />
        </div>

        <div class="form-field">
          <label>Formato de Exportación</label>
          <SelectButton
            v-model="generateForm.format"
            :options="exportFormatOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>

        <div class="form-field">
          <div class="checkbox-field">
            <Checkbox
              v-model="generateForm.includeCharts"
              binary
              inputId="includeCharts"
            />
            <label for="includeCharts">Incluir gráficos (disponible en Excel)</label>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <Button
            label="Cancelar"
            outlined
            @click="showGenerateDialog = false"
            class="mr-2"
          />
          <Button
            label="Generar y Descargar"
            icon="pi pi-download"
            @click="executeGenerate"
            :loading="generating"
          />
        </div>
      </template>
    </Dialog>

    <!-- Dialog: Vista Previa -->
    <Dialog
      v-model:visible="showPreviewDialog"
      header="Vista Previa del Reporte"
      modal
      :style="{ width: '90vw', height: '80vh' }"
      :maximizable="true"
    >
      <div class="preview-content" v-if="previewData">
        <div class="preview-info">
          <h4>{{ previewData.template?.nombre }}</h4>
          <p class="text-gray-600">{{ previewData.data?.length || 0 }} registros encontrados</p>
        </div>

        <DataTable
          :value="previewData.data"
          scrollable
          scrollHeight="400px"
          class="preview-table"
        >
          <Column
            v-for="campo in visibleFields"
            :key="campo.path"
            :field="campo.path"
            :header="campo.label"
          />
        </DataTable>
      </div>
    </Dialog>

    <!-- Dialog: Confirmación de Eliminación -->
    <ConfirmDialog />

    <!-- Toast Messages -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import Chips from 'primevue/chips'
import Checkbox from 'primevue/checkbox'
import Calendar from 'primevue/calendar'
import SelectButton from 'primevue/selectbutton'
import Badge from 'primevue/badge'
import Tag from 'primevue/tag'
import ToggleButton from 'primevue/togglebutton'
import ColorPicker from 'primevue/colorpicker'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { ReportsApi, type ReportTemplate, type CreateReportTemplateDto, REPORT_CATEGORIES, EXPORT_FORMATS } from '../../api/reports.service'
import QueryBuilder from '../../components/reports/QueryBuilder.vue'

// Composables
const toast = useToast()
const confirm = useConfirm()

// Estado reactivo
const loading = ref(false)
const saving = ref(false)
const generating = ref(false)
const previewing = ref(false)
const templates = ref<ReportTemplate[]>([])

// Filtros con debouncing
const searchQuery = ref('')
const selectedCategory = ref('')
const showOnlyActive = ref(true)

// Dialogs
const showCreateDialog = ref(false)
const showGenerateDialog = ref(false)
const showPreviewDialog = ref(false)

// Formularios
const editingTemplate = ref<ReportTemplate | null>(null)
const selectedTemplate = ref<ReportTemplate | null>(null)
const previewData = ref<any>(null)

const templateForm = reactive<CreateReportTemplateDto>({
  nombre: '',
  descripcion: '',
  categoria: 'operacional',
  configuracion: {
    tipo: 'personalizado',
    collections: [],
    campos: [],
    filtros: [],
    ordenamiento: [],
    agrupacion: [],
    limite: 1000
  },
  branding: {
    includeHeader: true,
    includeLogo: true,
    headerColor: '#2563EB',
    textColor: '#1F2937',
    customTitle: ''
  },
  isPublic: false,
  tags: []
})

const generateForm = reactive({
  dateRange: null,
  format: 'excel',
  includeCharts: false,
  additionalFilters: {}
})

// Opciones para dropdowns
const categoryOptions = REPORT_CATEGORIES.map(cat => ({
  label: cat.label,
  value: cat.value
}))

const exportFormatOptions = EXPORT_FORMATS.map(format => ({
  label: format.label,
  value: format.value
}))

// Computed properties con debouncing para mejorar rendimiento
const filteredTemplates = computed(() => {
  // Cache básico para evitar recálculos innecesarios
  const cacheKey = `${searchQuery.value}-${selectedCategory.value}-${showOnlyActive.value}-${templates.value.length}`

  let filtered = [...templates.value] // Copia superficial para evitar mutaciones

  if (searchQuery.value && searchQuery.value.length > 1) { // Solo filtrar con más de 1 caracter
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(t => {
      const nombre = t.nombre?.toLowerCase() || ''
      const descripcion = t.descripcion?.toLowerCase() || ''
      const tags = t.tags?.some(tag => tag.toLowerCase().includes(query)) || false

      return nombre.includes(query) || descripcion.includes(query) || tags
    })
  }

  if (selectedCategory.value) {
    filtered = filtered.filter(t => t.categoria === selectedCategory.value)
  }

  if (showOnlyActive.value) {
    filtered = filtered.filter(t => t.activo)
  }

  // Ordenamiento optimizado
  return filtered.sort((a, b) => {
    const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0
    const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0

    if (aTime !== bTime) return bTime - aTime

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

const visibleFields = computed(() => {
  return previewData.value?.template?.configuracion?.campos?.filter((c: any) => c.visible !== false) || []
})

// Métodos principales
const loadTemplates = async () => {
  loading.value = true
  try {
    const { data } = await ReportsApi.getTemplates()
    templates.value = data
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error al cargar las plantillas de reportes',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const saveTemplate = async () => {
  saving.value = true
  try {
    if (editingTemplate.value) {
      await ReportsApi.updateTemplate(editingTemplate.value._id, templateForm)
      toast.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Plantilla actualizada exitosamente',
        life: 3000
      })
    } else {
      await ReportsApi.createTemplate(templateForm)
      toast.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Plantilla creada exitosamente',
        life: 3000
      })
    }

    await loadTemplates()
    closeCreateDialog()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Error al guardar la plantilla',
      life: 3000
    })
  } finally {
    saving.value = false
  }
}

const previewTemplate = async () => {
  previewing.value = true
  try {
    const { data } = await ReportsApi.getReportPreview(templateForm.configuracion, 20)
    previewData.value = {
      template: { ...templateForm },
      data: data
    }
    showPreviewDialog.value = true
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Error al generar vista previa',
      life: 3000
    })
  } finally {
    previewing.value = false
  }
}

const generateReport = (template: ReportTemplate) => {
  selectedTemplate.value = template
  generateForm.dateRange = null
  generateForm.format = 'excel'
  generateForm.includeCharts = false
  showGenerateDialog.value = true
}

const executeGenerate = async () => {
  if (!selectedTemplate.value) return

  generating.value = true
  try {
    const params = {
      format: generateForm.format,
      includeCharts: generateForm.includeCharts,
      dateRange: generateForm.dateRange ? {
        start: generateForm.dateRange[0]?.toISOString().split('T')[0],
        end: generateForm.dateRange[1]?.toISOString().split('T')[0]
      } : undefined
    }

    await ReportsApi.downloadReport(
      selectedTemplate.value._id,
      params,
      `${selectedTemplate.value.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`
    )

    toast.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Reporte generado y descargado exitosamente',
      life: 3000
    })

    showGenerateDialog.value = false
    await loadTemplates() // Actualizar contadores de uso
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Error al generar el reporte',
      life: 3000
    })
  } finally {
    generating.value = false
  }
}

const viewTemplate = (template: ReportTemplate) => {
  // Implementar vista de detalles
  console.log('View template:', template)
}

const editTemplate = (template: ReportTemplate) => {
  editingTemplate.value = template
  Object.assign(templateForm, {
    nombre: template.nombre,
    descripcion: template.descripcion,
    categoria: template.categoria,
    configuracion: template.configuracion,
    branding: template.branding || {},
    isPublic: template.isPublic,
    tags: template.tags
  })
  showCreateDialog.value = true
}

const duplicateTemplate = async (template: ReportTemplate) => {
  try {
    await ReportsApi.duplicateTemplate(template._id, `Copia de ${template.nombre}`)
    toast.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Plantilla duplicada exitosamente',
      life: 3000
    })
    await loadTemplates()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error al duplicar la plantilla',
      life: 3000
    })
  }
}

const confirmDeleteTemplate = (template: ReportTemplate) => {
  confirm.require({
    message: `¿Está seguro de eliminar la plantilla "${template.nombre}"?`,
    header: 'Confirmar Eliminación',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    acceptClass: 'p-button-danger',
    accept: () => deleteTemplate(template)
  })
}

const deleteTemplate = async (template: ReportTemplate) => {
  try {
    await ReportsApi.deleteTemplate(template._id)
    toast.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Plantilla eliminada exitosamente',
      life: 3000
    })
    await loadTemplates()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error al eliminar la plantilla',
      life: 3000
    })
  }
}

const closeCreateDialog = () => {
  showCreateDialog.value = false
  editingTemplate.value = null

  // Resetear formulario
  Object.assign(templateForm, {
    nombre: '',
    descripcion: '',
    categoria: 'operacional',
    configuracion: {
      tipo: 'personalizado',
      collections: [],
      campos: [],
      filtros: [],
      ordenamiento: [],
      agrupacion: [],
      limite: 1000
    },
    branding: {
      includeHeader: true,
      includeLogo: true,
      headerColor: '#2563EB',
      textColor: '#1F2937',
      customTitle: ''
    },
    isPublic: false,
    tags: []
  })
}

const exportTemplatesList = async () => {
  // Implementar exportación de lista de plantillas
  console.log('Export templates list')
}

// Helpers
const formatCategory = (categoria: string): string => {
  const found = REPORT_CATEGORIES.find(c => c.value === categoria)
  return found?.label || categoria
}

const getCategoryIcon = (categoria: string): string => {
  const icons: Record<string, string> = {
    operacional: 'pi pi-cog',
    gerencial: 'pi pi-chart-line',
    regulatorio: 'pi pi-shield',
    personalizado: 'pi pi-user'
  }
  return icons[categoria] || 'pi pi-file'
}

const getCategorySeverity = (categoria: string): string => {
  const severities: Record<string, string> = {
    operacional: 'info',
    gerencial: 'success',
    regulatorio: 'warning',
    personalizado: 'secondary'
  }
  return severities[categoria] || 'secondary'
}

const getCollectionDisplayName = (collection: string): string => {
  const names: Record<string, string> = {
    'terminal_salidas': 'Despachos',
    'terminal_llegadas': 'Llegadas',
    'terminal_novedades': 'Novedades',
    'users': 'Usuarios',
    'vehicles': 'Vehículos',
    'alistamientos': 'Alistamientos'
  }
  return names[collection] || collection
}

const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('es-CO')
}

// Inicialización
onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.reports-container {
  padding: 1.5rem;
  max-width: 80rem;
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

.filters-section {
  margin-bottom: 1.5rem;
}

.filter-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.search-input {
  flex: 1;
  min-width: 300px;
}

.templates-section {
  @apply bg-white rounded-lg shadow-sm;
}

.table-header {
  @apply flex justify-between items-center;
}

.table-actions {
  @apply flex gap-2;
}

.template-name {
  @apply space-y-1;
}

.template-meta {
  @apply text-gray-500;
}

.data-sources {
  @apply flex flex-wrap gap-1;
}

.usage-info {
  @apply text-center;
}

.action-column {
  @apply w-48;
}

.action-buttons {
  @apply flex gap-1;
}

.empty-state {
  @apply text-center py-12;
}

.template-dialog {
  @apply z-50;
}

.template-form {
  @apply max-h-[70vh] overflow-y-auto;
}

.form-section {
  @apply mb-8 pb-6 border-b border-gray-200 last:border-b-0;
}

.section-title {
  @apply text-lg font-semibold text-gray-800 mb-4;
}

.form-grid {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
}

.form-field {
  @apply space-y-2;
}

.form-field.span-2 {
  @apply lg:col-span-2;
}

.form-field label {
  @apply block text-sm font-medium text-gray-700;
}

.checkbox-field {
  @apply flex items-center gap-2;
}

.branding-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}

.branding-field {
  @apply space-y-2;
}

.branding-field.span-2 {
  @apply md:col-span-2;
}

.dialog-footer {
  @apply flex justify-end;
}

.generate-form {
  @apply space-y-6;
}

.preview-content {
  @apply space-y-4;
}

.preview-info {
  @apply border-b pb-4;
}

.preview-table {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.loading-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #6b7280;
  font-size: 0.875rem;
}

/* Optimizaciones adicionales para reducir reflow */
.query-builder * {
  box-sizing: border-box;
}

.templates-table {
  contain: layout style;
}
</style>