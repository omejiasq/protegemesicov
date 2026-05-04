<template>
  <div class="dynamic-query-builder">
    <!-- Configuración Básica -->
    <Card>
      <template #title>
        <div class="flex items-center">
          <i class="pi pi-cog mr-2"></i>
          Configuración del Reporte
        </div>
      </template>

      <template #content>
        <!-- Selección de Campos -->
        <div class="mb-6">
          <h5 class="text-lg font-semibold mb-3">Campos a Mostrar</h5>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Campos Disponibles -->
            <div class="available-fields">
              <h6 class="text-sm font-medium mb-3">Campos Disponibles</h6>
              <div class="field-search mb-3">
                <InputText
                  v-model="fieldSearch"
                  placeholder="Buscar campos..."
                  class="w-full"
                />
              </div>
              <div class="fields-list h-64 overflow-y-auto border rounded p-3">
                <div
                  v-for="field in filteredAvailableFields"
                  :key="field.key"
                  class="field-item p-2 border rounded mb-2 cursor-pointer hover:bg-blue-50"
                  :class="{ 'bg-blue-50 border-blue-300': selectedFieldKeys.includes(field.key) }"
                  @click="toggleField(field)"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="font-medium">{{ field.label }}</div>
                      <div class="text-sm text-gray-500">{{ field.type }}</div>
                    </div>
                    <i
                      v-if="selectedFieldKeys.includes(field.key)"
                      class="pi pi-check text-green-600"
                    ></i>
                  </div>
                </div>
              </div>
            </div>

            <!-- Campos Seleccionados -->
            <div class="selected-fields">
              <h6 class="text-sm font-medium mb-3">Campos Seleccionados ({{ selectedFields.length }})</h6>
              <div class="fields-list h-64 overflow-y-auto border rounded p-3">
                <div
                  v-for="(field, index) in selectedFields"
                  :key="`selected-${field.key}`"
                  class="selected-field-item p-2 border rounded mb-2 bg-gray-50"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div class="font-medium">{{ field.label }}</div>
                      <div class="text-sm text-gray-500">{{ field.type }}</div>
                    </div>
                    <div class="flex items-center gap-2">
                      <Button
                        icon="pi pi-angle-up"
                        size="small"
                        text
                        @click="moveFieldUp(index)"
                        :disabled="index === 0"
                      />
                      <Button
                        icon="pi pi-angle-down"
                        size="small"
                        text
                        @click="moveFieldDown(index)"
                        :disabled="index === selectedFields.length - 1"
                      />
                      <Button
                        icon="pi pi-times"
                        size="small"
                        text
                        severity="danger"
                        @click="removeField(index)"
                      />
                    </div>
                  </div>
                </div>

                <div v-if="selectedFields.length === 0" class="text-center text-gray-500 py-8">
                  <i class="pi pi-inbox text-4xl mb-2 block"></i>
                  Selecciona campos del panel izquierdo
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Filtros -->
        <div class="mb-6" v-if="selectedFields.length > 0">
          <h5 class="text-lg font-semibold mb-3">Filtros</h5>
          <div class="filters-container">
            <div
              v-for="(filter, index) in filters"
              :key="`filter-${index}`"
              class="filter-row flex items-center gap-3 mb-3 p-3 border rounded"
            >
              <Dropdown
                v-model="filter.field"
                :options="filterableFields"
                optionLabel="label"
                optionValue="key"
                placeholder="Campo"
                class="flex-1"
              />

              <Dropdown
                v-model="filter.operator"
                :options="getOperatorOptions(filter.field)"
                optionLabel="label"
                optionValue="value"
                placeholder="Operador"
                class="w-32"
              />

              <component
                :is="getFilterComponent(filter.field, filter.operator)"
                v-model="filter.value"
                :placeholder="getValuePlaceholder(filter.field)"
                class="flex-1"
              />

              <Dropdown
                v-model="filter.logic"
                :options="[
                  { label: 'Y', value: 'and' },
                  { label: 'O', value: 'or' }
                ]"
                optionLabel="label"
                optionValue="value"
                class="w-20"
                v-if="index < filters.length - 1"
              />

              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                @click="removeFilter(index)"
              />
            </div>

            <Button
              label="Agregar Filtro"
              icon="pi pi-plus"
              outlined
              @click="addFilter"
              class="w-full"
            />
          </div>
        </div>

        <!-- Agrupación y Agregaciones -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" v-if="selectedFields.length > 0">
          <!-- Agrupación -->
          <div>
            <h5 class="text-lg font-semibold mb-3">Agrupación</h5>
            <MultiSelect
              v-model="groupBy"
              :options="groupableFields"
              optionLabel="label"
              optionValue="key"
              placeholder="Seleccionar campos para agrupar"
              class="w-full"
            />
          </div>

          <!-- Agregaciones -->
          <div>
            <h5 class="text-lg font-semibold mb-3">Agregaciones</h5>
            <div class="aggregations-container">
              <div
                v-for="(agg, index) in aggregations"
                :key="`agg-${index}`"
                class="aggregation-row flex items-center gap-2 mb-2"
              >
                <Dropdown
                  v-model="agg.field"
                  :options="aggregatableFields"
                  optionLabel="label"
                  optionValue="key"
                  placeholder="Campo"
                  class="flex-1"
                />

                <Dropdown
                  v-model="agg.type"
                  :options="getAggregationOptions(agg.field)"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Tipo"
                  class="w-28"
                />

                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  @click="removeAggregation(index)"
                />
              </div>

              <Button
                label="Agregar"
                icon="pi pi-plus"
                outlined
                size="small"
                @click="addAggregation"
                class="w-full"
              />
            </div>
          </div>
        </div>

        <!-- Opciones de Consulta -->
        <div class="mt-6" v-if="selectedFields.length > 0">
          <h5 class="text-lg font-semibold mb-3">Opciones de Consulta</h5>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">Modo</label>
              <SelectButton
                v-model="mode"
                :options="[
                  { label: 'Detalle', value: 'detail' },
                  { label: 'Agrupado', value: 'grouped' }
                ]"
                optionLabel="label"
                optionValue="value"
                class="w-full"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Límite de registros</label>
              <InputNumber
                v-model="limit"
                :min="1"
                :max="10000"
                placeholder="1000"
                class="w-full"
              />
            </div>

            <div class="flex items-end gap-2">
              <Button
                label="Ejecutar"
                icon="pi pi-search"
                @click="executeQuery"
                :loading="loading"
                class="flex-1"
                :disabled="selectedFields.length === 0"
              />
              <Button
                icon="pi pi-save"
                outlined
                @click="openSaveDialog"
                title="Guardar reporte"
                :disabled="selectedFields.length === 0"
              />
            </div>
          </div>
        </div>

        <!-- Reportes Guardados -->
        <div class="mt-6">
          <div class="flex items-center justify-between mb-3">
            <h5 class="text-lg font-semibold">Reportes Guardados</h5>
            <Button
              icon="pi pi-refresh"
              text
              @click="loadSavedReports"
              :loading="loadingSavedReports"
              title="Actualizar lista"
            />
          </div>
          <div class="saved-reports-grid">
            <div
              v-for="report in savedReports"
              :key="report._id"
              class="saved-report-card p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
              @click="loadReport(report)"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h6 class="font-semibold text-sm">{{ report.name }}</h6>
                  <p class="text-xs text-gray-500 mt-1" v-if="report.description">
                    {{ report.description }}
                  </p>
                  <div class="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span>{{ report.fields?.length || 0 }} campos</span>
                    <span>•</span>
                    <span v-if="report.createdAt">
                      {{ formatDate(report.createdAt) }}
                    </span>
                    <span v-if="report.is_public" class="text-green-600">
                      <i class="pi pi-users mr-1"></i>Público
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <Button
                    icon="pi pi-pencil"
                    text
                    size="small"
                    @click.stop="editReport(report)"
                    title="Editar"
                  />
                  <Button
                    icon="pi pi-copy"
                    text
                    size="small"
                    @click.stop="duplicateReport(report)"
                    title="Duplicar"
                  />
                  <Button
                    icon="pi pi-trash"
                    text
                    size="small"
                    severity="danger"
                    @click.stop="deleteReport(report)"
                    title="Eliminar"
                  />
                </div>
              </div>
            </div>

            <div v-if="savedReports.length === 0 && !loadingSavedReports" class="text-center text-gray-500 py-8">
              <i class="pi pi-bookmark text-4xl mb-2 block"></i>
              No tienes reportes guardados
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Dialog: Guardar Reporte -->
    <Dialog
      v-model:visible="showSaveDialog"
      header="Guardar Reporte"
      modal
      :style="{ width: '500px' }"
    >
      <div class="save-form space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Nombre del reporte *</label>
          <InputText
            v-model="saveForm.name"
            placeholder="Ej: Reporte de Alistamientos Enero 2024"
            class="w-full"
            :class="{ 'border-red-500': saveFormErrors.name }"
          />
          <small class="text-red-500" v-if="saveFormErrors.name">{{ saveFormErrors.name }}</small>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Descripción</label>
          <Textarea
            v-model="saveForm.description"
            placeholder="Descripción opcional del reporte..."
            class="w-full"
            rows="3"
          />
        </div>

        <div class="flex items-center gap-2">
          <Checkbox v-model="saveForm.is_public" binary inputId="isPublic" />
          <label for="isPublic" class="text-sm">
            Compartir con otros usuarios de la empresa
          </label>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            label="Cancelar"
            outlined
            @click="closeSaveDialog"
          />
          <Button
            :label="editingReport ? 'Actualizar' : 'Guardar'"
            @click="saveCurrentReport"
            :loading="savingReport"
            :disabled="!saveForm.name.trim()"
          />
        </div>
      </template>
    </Dialog>

    <!-- Dialog: Confirmar Eliminación -->
    <Dialog
      v-model:visible="showDeleteDialog"
      header="Confirmar Eliminación"
      modal
      :style="{ width: '400px' }"
    >
      <div class="text-center">
        <i class="pi pi-exclamation-triangle text-4xl text-orange-500 mb-4 block"></i>
        <h3 class="text-lg font-semibold mb-2">¿Eliminar reporte?</h3>
        <p class="text-gray-600 mb-4">
          Esta acción no se puede deshacer. El reporte "{{ reportToDelete?.name }}" será eliminado permanentemente.
        </p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            label="Cancelar"
            outlined
            @click="showDeleteDialog = false"
          />
          <Button
            label="Eliminar"
            severity="danger"
            @click="confirmDeleteReport"
            :loading="deletingReport"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import SelectButton from 'primevue/selectbutton'
import InputNumber from 'primevue/inputnumber'
import Calendar from 'primevue/calendar'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'

import {
  DynamicReportsApi,
  type Dataset,
  type DatasetField,
  type DynamicQuery,
  type FilterCondition,
  type Aggregation,
  type SavedReport,
  type CreateReportDto,
  type UpdateReportDto
} from '../../api/dynamic-reports.service'

const emit = defineEmits<{
  queryExecuted: [result: any]
  loading: [isLoading: boolean]
}>()

// Composables
const toast = useToast()

// Estado reactivo
const loading = ref(false)
const dataset = ref<Dataset | null>(null)
const fieldSearch = ref('')
const selectedFields = ref<DatasetField[]>([])
const filters = ref<FilterCondition[]>([])
const groupBy = ref<string[]>([])
const aggregations = ref<Aggregation[]>([])
const mode = ref<'detail' | 'grouped'>('detail')
const limit = ref(1000)

// Estado para reportes guardados
const savedReports = ref<SavedReport[]>([])
const loadingSavedReports = ref(false)

// Estado para dialogs
const showSaveDialog = ref(false)
const showDeleteDialog = ref(false)
const savingReport = ref(false)
const deletingReport = ref(false)
const editingReport = ref<SavedReport | null>(null)
const reportToDelete = ref<SavedReport | null>(null)

// Formulario de guardado
const saveForm = reactive({
  name: '',
  description: '',
  is_public: false
})

const saveFormErrors = reactive({
  name: ''
})

// Computed properties
const availableFields = computed(() => dataset.value?.fields || [])

const filteredAvailableFields = computed(() => {
  const search = fieldSearch.value.toLowerCase()
  if (!search) return availableFields.value

  return availableFields.value.filter(field =>
    field.label.toLowerCase().includes(search) ||
    field.key.toLowerCase().includes(search)
  )
})

const selectedFieldKeys = computed(() => selectedFields.value.map(f => f.key))

const filterableFields = computed(() =>
  selectedFields.value.map(field => ({
    label: field.label,
    key: field.key,
    type: field.type
  }))
)

const groupableFields = computed(() =>
  selectedFields.value
    .filter(field => field.groupable)
    .map(field => ({
      label: field.label,
      key: field.key
    }))
)

const aggregatableFields = computed(() =>
  selectedFields.value
    .filter(field => field.type === 'number' && field.aggregations && field.aggregations.length > 0)
    .map(field => ({
      label: field.label,
      key: field.key,
      aggregations: field.aggregations
    }))
)

// Métodos principales
const loadDataset = async () => {
  try {
    loading.value = true
    const { data } = await DynamicReportsApi.getAlistamientosDataset()
    dataset.value = data
  } catch (error) {
    console.error('Error loading dataset:', error)
  } finally {
    loading.value = false
  }
}

const toggleField = (field: DatasetField) => {
  const index = selectedFields.value.findIndex(f => f.key === field.key)
  if (index >= 0) {
    selectedFields.value.splice(index, 1)
  } else {
    selectedFields.value.push(field)
  }
}

const moveFieldUp = (index: number) => {
  if (index > 0) {
    const field = selectedFields.value.splice(index, 1)[0]
    selectedFields.value.splice(index - 1, 0, field)
  }
}

const moveFieldDown = (index: number) => {
  if (index < selectedFields.value.length - 1) {
    const field = selectedFields.value.splice(index, 1)[0]
    selectedFields.value.splice(index + 1, 0, field)
  }
}

const removeField = (index: number) => {
  selectedFields.value.splice(index, 1)
}

const addFilter = () => {
  filters.value.push({
    field: '',
    operator: 'eq',
    value: '',
    logic: 'and'
  })
}

const removeFilter = (index: number) => {
  filters.value.splice(index, 1)
}

const addAggregation = () => {
  aggregations.value.push({
    field: '',
    type: 'count'
  })
}

const removeAggregation = (index: number) => {
  aggregations.value.splice(index, 1)
}

const executeQuery = async () => {
  if (selectedFields.value.length === 0) return

  try {
    loading.value = true
    emit('loading', true)

    const query: DynamicQuery = {
      dataset: 'alistamientos',
      fields: selectedFields.value.map(f => f.key),
      filters: filters.value.filter(f => f.field && f.operator),
      groupBy: mode.value === 'grouped' ? groupBy.value : undefined,
      aggregations: mode.value === 'grouped' ? aggregations.value.filter(a => a.field && a.type) : undefined,
      mode: mode.value,
      limit: limit.value
    }

    const result = await DynamicReportsApi.executeQuery(query)
    emit('queryExecuted', result)
  } catch (error) {
    console.error('Error executing query:', error)
  } finally {
    loading.value = false
    emit('loading', false)
  }
}

// Helpers
const getOperatorOptions = (fieldKey: string) => {
  const field = selectedFields.value.find(f => f.key === fieldKey)
  if (!field) return []

  const baseOptions = [
    { label: 'Igual a', value: 'eq' },
    { label: 'Diferente de', value: 'ne' }
  ]

  if (field.type === 'string') {
    return [
      ...baseOptions,
      { label: 'Contiene', value: 'like' },
      { label: 'En lista', value: 'in' }
    ]
  }

  if (field.type === 'number' || field.type === 'date') {
    return [
      ...baseOptions,
      { label: 'Mayor que', value: 'gt' },
      { label: 'Mayor o igual', value: 'gte' },
      { label: 'Menor que', value: 'lt' },
      { label: 'Menor o igual', value: 'lte' }
    ]
  }

  return baseOptions
}

const getFilterComponent = (fieldKey: string, operator: string) => {
  const field = selectedFields.value.find(f => f.key === fieldKey)
  if (!field) return 'InputText'

  if (field.type === 'date') return 'Calendar'
  if (field.type === 'number') return 'InputNumber'
  if (field.type === 'boolean') return 'Dropdown'

  return 'InputText'
}

const getValuePlaceholder = (fieldKey: string) => {
  const field = selectedFields.value.find(f => f.key === fieldKey)
  if (!field) return 'Valor'

  const placeholders: Record<string, string> = {
    string: 'Ingrese texto',
    number: 'Ingrese número',
    date: 'Seleccione fecha',
    boolean: 'Seleccione opción'
  }

  return placeholders[field.type] || 'Valor'
}

const getAggregationOptions = (fieldKey: string) => {
  const field = aggregatableFields.value.find(f => f.key === fieldKey)
  if (!field) return []

  const options = [
    { label: 'Contar', value: 'count' },
    { label: 'Suma', value: 'sum' },
    { label: 'Promedio', value: 'avg' },
    { label: 'Mínimo', value: 'min' },
    { label: 'Máximo', value: 'max' }
  ]

  return options.filter(opt => field.aggregations?.includes(opt.value as any))
}

// ── Gestión de Reportes Guardados ──────────────────────────────────────────

const loadSavedReports = async () => {
  try {
    loadingSavedReports.value = true
    const { data } = await DynamicReportsApi.getSavedReports()
    savedReports.value = data || []
  } catch (error) {
    console.error('Error loading saved reports:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error al cargar los reportes guardados',
      life: 3000
    })
  } finally {
    loadingSavedReports.value = false
  }
}

const openSaveDialog = () => {
  resetSaveForm()
  editingReport.value = null
  showSaveDialog.value = true
}

const closeSaveDialog = () => {
  showSaveDialog.value = false
  resetSaveForm()
  editingReport.value = null
}

const resetSaveForm = () => {
  saveForm.name = ''
  saveForm.description = ''
  saveForm.is_public = false
  saveFormErrors.name = ''
}

const validateSaveForm = (): boolean => {
  saveFormErrors.name = ''

  if (!saveForm.name.trim()) {
    saveFormErrors.name = 'El nombre es requerido'
    return false
  }

  if (saveForm.name.length > 100) {
    saveFormErrors.name = 'El nombre no puede exceder 100 caracteres'
    return false
  }

  return true
}

const getCurrentQuery = (): DynamicQuery => {
  return {
    dataset: 'alistamientos',
    fields: selectedFields.value.map(f => f.key),
    filters: filters.value.filter(f => f.field && f.operator),
    groupBy: mode.value === 'grouped' ? groupBy.value : undefined,
    aggregations: mode.value === 'grouped' ? aggregations.value.filter(a => a.field && a.type) : undefined,
    mode: mode.value,
    limit: limit.value
  }
}

const saveCurrentReport = async () => {
  if (!validateSaveForm()) return

  try {
    savingReport.value = true
    const query = getCurrentQuery()

    if (editingReport.value) {
      // Actualizar reporte existente
      const updateDto: UpdateReportDto = {
        name: saveForm.name,
        description: saveForm.description || undefined,
        fields: query.fields,
        filters: query.filters,
        groupBy: query.groupBy,
        aggregations: query.aggregations,
        mode: query.mode,
        limit: query.limit,
        is_public: saveForm.is_public
      }

      await DynamicReportsApi.updateSavedReport(editingReport.value._id!, updateDto)

      toast.add({
        severity: 'success',
        summary: 'Reporte actualizado',
        detail: `El reporte "${saveForm.name}" ha sido actualizado exitosamente`,
        life: 3000
      })
    } else {
      // Crear nuevo reporte
      const createDto: CreateReportDto = DynamicReportsApi.queryToReportDto(
        query,
        saveForm.name,
        saveForm.description || undefined,
        saveForm.is_public
      )

      await DynamicReportsApi.saveReport(createDto)

      toast.add({
        severity: 'success',
        summary: 'Reporte guardado',
        detail: `El reporte "${saveForm.name}" ha sido guardado exitosamente`,
        life: 3000
      })
    }

    closeSaveDialog()
    loadSavedReports()
  } catch (error: any) {
    console.error('Error saving report:', error)
    toast.add({
      severity: 'error',
      summary: 'Error al guardar',
      detail: error.response?.data?.message || 'Error al guardar el reporte',
      life: 3000
    })
  } finally {
    savingReport.value = false
  }
}

const loadReport = async (report: SavedReport) => {
  try {
    // Cargar los campos del dataset si no están cargados
    if (!dataset.value) {
      await loadDataset()
    }

    // Convertir el reporte a query y cargar en el builder
    const query = DynamicReportsApi.reportToQuery(report)

    // Limpiar estado actual
    selectedFields.value = []
    filters.value = []
    groupBy.value = []
    aggregations.value = []

    // Cargar campos seleccionados
    if (dataset.value) {
      selectedFields.value = query.fields
        .map(fieldKey => dataset.value!.fields.find(f => f.key === fieldKey))
        .filter(field => field !== undefined) as DatasetField[]
    }

    // Cargar filtros
    if (query.filters) {
      filters.value = [...query.filters]
    }

    // Cargar agrupación y agregaciones
    if (query.groupBy) {
      groupBy.value = [...query.groupBy]
    }
    if (query.aggregations) {
      aggregations.value = [...query.aggregations]
    }

    // Cargar configuraciones
    mode.value = query.mode || 'detail'
    limit.value = query.limit || 1000

    toast.add({
      severity: 'success',
      summary: 'Reporte cargado',
      detail: `El reporte "${report.name}" ha sido cargado`,
      life: 3000
    })
  } catch (error) {
    console.error('Error loading report:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error al cargar el reporte',
      life: 3000
    })
  }
}

const editReport = (report: SavedReport) => {
  editingReport.value = report
  saveForm.name = report.name
  saveForm.description = report.description || ''
  saveForm.is_public = report.is_public || false
  showSaveDialog.value = true
}

const duplicateReport = async (report: SavedReport) => {
  try {
    const newName = `${report.name} (Copia)`
    await DynamicReportsApi.duplicateReport(report._id!, newName)

    toast.add({
      severity: 'success',
      summary: 'Reporte duplicado',
      detail: `El reporte ha sido duplicado como "${newName}"`,
      life: 3000
    })

    loadSavedReports()
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

const deleteReport = (report: SavedReport) => {
  reportToDelete.value = report
  showDeleteDialog.value = true
}

const confirmDeleteReport = async () => {
  if (!reportToDelete.value) return

  try {
    deletingReport.value = true
    await DynamicReportsApi.deleteSavedReport(reportToDelete.value._id!)

    toast.add({
      severity: 'success',
      summary: 'Reporte eliminado',
      detail: `El reporte "${reportToDelete.value.name}" ha sido eliminado`,
      life: 3000
    })

    showDeleteDialog.value = false
    reportToDelete.value = null
    loadSavedReports()
  } catch (error: any) {
    console.error('Error deleting report:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Error al eliminar el reporte',
      life: 3000
    })
  } finally {
    deletingReport.value = false
  }
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Inicialización
onMounted(() => {
  loadDataset()
  loadSavedReports()
})
</script>

<style scoped>
.dynamic-query-builder {
  max-width: 100%;
}

.field-item {
  transition: all 0.2s ease;
}

.field-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.selected-field-item {
  background: #f8f9fa;
  border-left: 4px solid #2563eb;
}

.filter-row {
  background: #fafafa;
  border: 1px solid #e5e7eb;
}

.aggregation-row {
  padding: 0.5rem;
  background: #f3f4f6;
  border-radius: 0.375rem;
}

.fields-list::-webkit-scrollbar {
  width: 6px;
}

.fields-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.fields-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.fields-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Estilos para reportes guardados */
.saved-reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.saved-report-card {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.saved-report-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

.save-form .space-y-4 > * + * {
  margin-top: 1rem;
}

/* Estados de botones en cards */
.saved-report-card .p-button-text {
  padding: 0.25rem;
  width: 2rem;
  height: 2rem;
}

.saved-report-card .p-button-text:hover {
  background: rgba(59, 130, 246, 0.1);
}

.saved-report-card .p-button-text.p-button-danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* Responsive para reportes guardados */
@media (max-width: 768px) {
  .saved-reports-grid {
    grid-template-columns: 1fr;
  }
}
</style>