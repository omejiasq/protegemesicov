<template>
  <div class="edit-report">
    <!-- Header con información del reporte -->
    <div class="page-header">
      <div class="header-navigation">
        <Button
          icon="pi pi-arrow-left"
          @click="goBack"
          text
          class="back-btn"
        />
        <div class="header-content">
          <h1 class="page-title">
            <i class="pi pi-pencil mr-3"></i>
            Editar Reporte
          </h1>
          <p v-if="originalReport" class="page-description">
            Modificando: {{ originalReport.name }}
          </p>
        </div>
      </div>
      <div class="header-actions">
        <Button
          label="Guardar Cambios"
          icon="pi pi-check"
          @click="saveChanges"
          :disabled="!hasChanges || !canSave"
          :loading="saving"
          class="btn-primary"
        />
        <Button
          label="Vista Previa"
          icon="pi pi-eye"
          @click="previewReport"
          :disabled="!canSave"
          outlined
        />
      </div>
    </div>

    <!-- Alerta de cambios -->
    <div v-if="hasChanges" class="changes-alert">
      <Message severity="info" :closable="false">
        <template #icon>
          <i class="pi pi-info-circle"></i>
        </template>
        Tienes cambios sin guardar en este reporte.
      </Message>
    </div>

    <!-- Formulario de edición -->
    <div v-if="originalReport" class="edit-form">
      <div class="form-sections">
        <!-- Fuente de Datos (Solo Lectura) -->
        <Card class="section-card dataset-readonly">
          <template #title>
            <div class="section-header">
              <i class="pi pi-database mr-2"></i>
              Fuente de Datos
              <Tag
                value="No modificable"
                severity="secondary"
                class="ml-2"
              />
            </div>
          </template>
          <template #content>
            <div class="dataset-info-readonly">
              <div class="dataset-display">
                <div class="dataset-icon">
                  <i :class="getDatasetIcon(originalReport.dataset)"></i>
                </div>
                <div class="dataset-details">
                  <h3>{{ getDatasetName(originalReport.dataset) }}</h3>
                  <p>{{ getDatasetDescription(originalReport.dataset) }}</p>
                </div>
              </div>
              <small class="dataset-note">
                La fuente de datos no se puede modificar durante la edición para mantener la consistencia del reporte.
              </small>
            </div>
          </template>
        </Card>

        <!-- Información Básica -->
        <Card class="section-card">
          <template #title>
            <div class="section-header">
              <i class="pi pi-info-circle mr-2"></i>
              Información del Reporte
              <Button
                v-if="!sections.info.expanded"
                icon="pi pi-chevron-down"
                @click="toggleSection('info')"
                text
                size="small"
              />
              <Button
                v-else
                icon="pi pi-chevron-up"
                @click="toggleSection('info')"
                text
                size="small"
              />
            </div>
          </template>
          <template #content>
            <div v-show="sections.info.expanded" class="section-content">
              <div class="form-grid">
                <div class="form-field span-2">
                  <label for="reportName">Nombre del Reporte *</label>
                  <InputText
                    id="reportName"
                    v-model="reportForm.name"
                    placeholder="Nombre del reporte"
                    :class="{ 'p-invalid': errors.name }"
                    @input="validateField('name')"
                  />
                  <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
                </div>

                <div class="form-field span-2">
                  <label for="reportDescription">Descripción</label>
                  <Textarea
                    id="reportDescription"
                    v-model="reportForm.description"
                    placeholder="Descripción del reporte"
                    rows="3"
                    :maxlength="500"
                  />
                  <small class="field-hint">{{ reportForm.description?.length || 0 }}/500 caracteres</small>
                </div>

                <div class="form-field">
                  <label for="reportType">Tipo de Reporte</label>
                  <SelectButton
                    id="reportType"
                    v-model="reportForm.mode"
                    :options="reportModes"
                    optionLabel="label"
                    optionValue="value"
                  />
                </div>

                <div class="form-field">
                  <label for="reportPrivacy">Privacidad</label>
                  <SelectButton
                    id="reportPrivacy"
                    v-model="reportForm.is_public"
                    :options="privacyOptions"
                    optionLabel="label"
                    optionValue="value"
                  />
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Campos del Reporte -->
        <Card class="section-card">
          <template #title>
            <div class="section-header">
              <i class="pi pi-table mr-2"></i>
              Campos del Reporte ({{ reportForm.fields.length }} seleccionados)
              <Button
                v-if="!sections.fields.expanded"
                icon="pi pi-chevron-down"
                @click="toggleSection('fields')"
                text
                size="small"
              />
              <Button
                v-else
                icon="pi pi-chevron-up"
                @click="toggleSection('fields')"
                text
                size="small"
              />
            </div>
          </template>
          <template #content>
            <div v-show="sections.fields.expanded" class="section-content">
              <div class="fields-editor">
                <div class="fields-search">
                  <span class="p-input-icon-left">
                    <i class="pi pi-search"></i>
                    <InputText
                      v-model="fieldSearch"
                      placeholder="Buscar campos..."
                      class="search-input"
                    />
                  </span>
                  <div class="selection-actions">
                    <Button
                      label="Seleccionar Básicos"
                      @click="selectBasicFields"
                      outlined
                      size="small"
                    />
                  </div>
                </div>

                <div class="fields-container">
                  <!-- Campos disponibles -->
                  <div class="available-fields">
                    <h4 class="subsection-title">Campos Disponibles</h4>
                    <div class="fields-list">
                      <div
                        v-for="field in filteredAvailableFields"
                        :key="field.key"
                        class="field-item"
                        :class="{ 'field-selected': isFieldSelected(field.key) }"
                      >
                        <div class="field-content" @click="toggleField(field)">
                          <div class="field-info">
                            <h5 class="field-name">{{ field.label }}</h5>
                            <Tag :value="field.type" :severity="getFieldTypeSeverity(field.type)" />
                          </div>
                          <Checkbox
                            :modelValue="isFieldSelected(field.key)"
                            @click.stop
                            @change="toggleField(field)"
                            binary
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Campos seleccionados -->
                  <div class="selected-fields">
                    <h4 class="subsection-title">Campos Seleccionados</h4>
                    <div class="selected-fields-list">
                      <div
                        v-for="(fieldKey, index) in reportForm.fields"
                        :key="`selected-${fieldKey}`"
                        class="selected-field-item"
                      >
                        <div class="field-info">
                          <h5 class="field-name">{{ getFieldLabel(fieldKey) }}</h5>
                          <Tag :value="getFieldType(fieldKey)" :severity="getFieldTypeSeverity(getFieldType(fieldKey))" />
                        </div>
                        <div class="field-actions">
                          <Button
                            icon="pi pi-angle-up"
                            @click="moveFieldUp(index)"
                            :disabled="index === 0"
                            text
                            size="small"
                          />
                          <Button
                            icon="pi pi-angle-down"
                            @click="moveFieldDown(index)"
                            :disabled="index === reportForm.fields.length - 1"
                            text
                            size="small"
                          />
                          <Button
                            icon="pi pi-times"
                            @click="removeField(index)"
                            text
                            size="small"
                            severity="danger"
                          />
                        </div>
                      </div>

                      <div v-if="reportForm.fields.length === 0" class="empty-selection">
                        <i class="pi pi-inbox"></i>
                        <p>No hay campos seleccionados</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Filtros -->
        <Card class="section-card">
          <template #title>
            <div class="section-header">
              <i class="pi pi-filter mr-2"></i>
              Filtros ({{ reportForm.filters.length }} configurados)
              <Button
                v-if="!sections.filters.expanded"
                icon="pi pi-chevron-down"
                @click="toggleSection('filters')"
                text
                size="small"
              />
              <Button
                v-else
                icon="pi pi-chevron-up"
                @click="toggleSection('filters')"
                text
                size="small"
              />
            </div>
          </template>
          <template #content>
            <div v-show="sections.filters.expanded" class="section-content">
              <div class="filters-editor">
                <div class="filters-header">
                  <p class="section-description">
                    Configura filtros para limitar los datos del reporte
                  </p>
                  <Button
                    label="Agregar Filtro"
                    icon="pi pi-plus"
                    @click="addFilter"
                    :disabled="!hasSelectedFields"
                    outlined
                    size="small"
                  />
                </div>

                <div v-if="reportForm.filters.length > 0" class="filters-list">
                  <div
                    v-for="(filter, index) in reportForm.filters"
                    :key="`filter-${index}`"
                    class="filter-item"
                  >
                    <div class="filter-config">
                      <div class="filter-row">
                        <div class="filter-field">
                          <label>Campo</label>
                          <Dropdown
                            v-model="filter.field"
                            :options="selectedFieldsOptions"
                            optionLabel="label"
                            optionValue="key"
                            placeholder="Seleccionar campo"
                            @change="onFilterFieldChange(index)"
                          />
                        </div>

                        <div class="filter-operator">
                          <label>Operador</label>
                          <Dropdown
                            v-model="filter.operator"
                            :options="getOperatorOptions(filter.field)"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Operador"
                            :disabled="!filter.field"
                          />
                        </div>

                        <div class="filter-value">
                          <label>Valor</label>
                          <InputText
                            v-if="getFilterComponent(filter.field) === 'InputText'"
                            v-model="filter.value"
                            :placeholder="getValuePlaceholder(filter.field)"
                            :disabled="!filter.operator"
                          />
                          <InputNumber
                            v-else-if="getFilterComponent(filter.field) === 'InputNumber'"
                            v-model="filter.value"
                            :placeholder="getValuePlaceholder(filter.field)"
                            :disabled="!filter.operator"
                          />
                          <Calendar
                            v-else-if="getFilterComponent(filter.field) === 'Calendar'"
                            v-model="filter.value"
                            :placeholder="getValuePlaceholder(filter.field)"
                            :disabled="!filter.operator"
                            showIcon
                            dateFormat="yy-mm-dd"
                          />
                          <Dropdown
                            v-else-if="getFilterComponent(filter.field) === 'Dropdown'"
                            v-model="filter.value"
                            :options="[{label: 'Sí', value: true}, {label: 'No', value: false}]"
                            optionLabel="label"
                            optionValue="value"
                            :placeholder="getValuePlaceholder(filter.field)"
                            :disabled="!filter.operator"
                          />
                        </div>

                        <div class="filter-actions">
                          <Button
                            icon="pi pi-trash"
                            @click="removeFilter(index)"
                            text
                            severity="danger"
                          />
                        </div>
                      </div>

                      <div v-if="index < reportForm.filters.length - 1" class="filter-logic">
                        <Dropdown
                          v-model="filter.logic"
                          :options="logicOptions"
                          optionLabel="label"
                          optionValue="value"
                          placeholder="Y"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else class="empty-filters">
                  <i class="pi pi-filter-slash"></i>
                  <p>No hay filtros configurados</p>
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Configuración Avanzada -->
        <Card v-if="reportForm.mode === 'grouped'" class="section-card">
          <template #title>
            <div class="section-header">
              <i class="pi pi-cog mr-2"></i>
              Configuración de Agrupación
              <Button
                v-if="!sections.advanced.expanded"
                icon="pi pi-chevron-down"
                @click="toggleSection('advanced')"
                text
                size="small"
              />
              <Button
                v-else
                icon="pi pi-chevron-up"
                @click="toggleSection('advanced')"
                text
                size="small"
              />
            </div>
          </template>
          <template #content>
            <div v-show="sections.advanced.expanded" class="section-content">
              <div class="advanced-config">
                <div class="form-grid">
                  <div class="form-field span-2">
                    <label>Agrupar por</label>
                    <MultiSelect
                      v-model="reportForm.groupBy"
                      :options="groupableFields"
                      optionLabel="label"
                      optionValue="key"
                      placeholder="Seleccionar campos para agrupar"
                      :maxSelectedLabels="3"
                    />
                  </div>
                </div>

                <div class="aggregations-section">
                  <div class="section-header">
                    <h5>Agregaciones</h5>
                    <Button
                      label="Agregar"
                      icon="pi pi-plus"
                      @click="addAggregation"
                      outlined
                      size="small"
                    />
                  </div>

                  <div v-if="reportForm.aggregations.length > 0" class="aggregations-list">
                    <div
                      v-for="(agg, index) in reportForm.aggregations"
                      :key="`agg-${index}`"
                      class="aggregation-item"
                    >
                      <Dropdown
                        v-model="agg.field"
                        :options="aggregatableFields"
                        optionLabel="label"
                        optionValue="key"
                        placeholder="Campo"
                      />
                      <Dropdown
                        v-model="agg.type"
                        :options="getAggregationOptions(agg.field)"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Tipo"
                      />
                      <Button
                        icon="pi pi-trash"
                        @click="removeAggregation(index)"
                        text
                        severity="danger"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Configuración General -->
        <Card class="section-card">
          <template #title>
            <div class="section-header">
              <i class="pi pi-sliders-h mr-2"></i>
              Configuración General
              <Button
                v-if="!sections.settings.expanded"
                icon="pi pi-chevron-down"
                @click="toggleSection('settings')"
                text
                size="small"
              />
              <Button
                v-else
                icon="pi pi-chevron-up"
                @click="toggleSection('settings')"
                text
                size="small"
              />
            </div>
          </template>
          <template #content>
            <div v-show="sections.settings.expanded" class="section-content">
              <div class="form-grid">
                <div class="form-field">
                  <label>Límite de Registros</label>
                  <InputNumber
                    v-model="reportForm.limit"
                    :min="1"
                    :max="10000"
                    :step="100"
                    showButtons
                    placeholder="1000"
                  />
                  <small class="field-hint">Máximo 10,000 registros</small>
                </div>

                <div class="form-field">
                  <label>Estado</label>
                  <SelectButton
                    v-model="reportForm.is_active"
                    :options="[
                      { label: 'Activo', value: true },
                      { label: 'Inactivo', value: false }
                    ]"
                    optionLabel="label"
                    optionValue="value"
                  />
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Estado de carga -->
    <div v-else class="loading-state">
      <Card>
        <template #content>
          <div class="loading-content">
            <ProgressSpinner />
            <p>Cargando información del reporte...</p>
          </div>
        </template>
      </Card>
    </div>

    <!-- Toast para notificaciones -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'

// Componentes PrimeVue
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import SelectButton from 'primevue/selectbutton'
import InputNumber from 'primevue/inputnumber'
import Checkbox from 'primevue/checkbox'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Toast from 'primevue/toast'

// Services y tipos
import {
  DynamicReportsApi,
  type Dataset,
  type DatasetField,
  type FilterCondition,
  type Aggregation,
  type SavedReport,
  type UpdateReportDto
} from '../../api/dynamic-reports.service'

// Composables
const route = useRoute()
const router = useRouter()
const toast = useToast()

// Estado principal
const loading = ref(false)
const saving = ref(false)
const originalReport = ref<SavedReport | null>(null)
const dataset = ref<Dataset | null>(null)
const fieldSearch = ref('')

// Secciones colapsables
const sections = reactive({
  info: { expanded: true },
  fields: { expanded: true },
  filters: { expanded: false },
  advanced: { expanded: false },
  settings: { expanded: false }
})

// Formulario del reporte
const reportForm = reactive({
  name: '',
  description: '',
  dataset: 'alistamientos',
  fields: [] as string[],
  filters: [] as FilterCondition[],
  groupBy: [] as string[],
  aggregations: [] as Aggregation[],
  mode: 'detail' as 'detail' | 'grouped',
  limit: 1000,
  is_public: false,
  is_active: true
})

// Estado original para comparación
const originalFormState = ref<string>('')

// Validaciones
const errors = reactive({
  name: ''
})

// Opciones de configuración
const reportModes = [
  { label: 'Detalle', value: 'detail' },
  { label: 'Agrupado', value: 'grouped' }
]

const privacyOptions = [
  { label: 'Privado', value: false },
  { label: 'Público', value: true }
]

const logicOptions = [
  { label: 'Y (AND)', value: 'and' },
  { label: 'O (OR)', value: 'or' }
]

// Computed properties
const filteredAvailableFields = computed(() => {
  if (!dataset.value) return []

  const search = fieldSearch.value.toLowerCase()
  return dataset.value.fields.filter(field =>
    field.label.toLowerCase().includes(search) ||
    field.key.toLowerCase().includes(search)
  )
})

const selectedFieldsOptions = computed(() => {
  if (!dataset.value) return []

  return reportForm.fields.map(fieldKey => {
    const field = dataset.value!.fields.find(f => f.key === fieldKey)
    return {
      key: fieldKey,
      label: field?.label || fieldKey,
      type: field?.type || 'string'
    }
  })
})

const groupableFields = computed(() => {
  if (!dataset.value) return []

  return dataset.value.fields
    .filter(field => field.groupable && reportForm.fields.includes(field.key))
    .map(field => ({
      key: field.key,
      label: field.label
    }))
})

const aggregatableFields = computed(() => {
  if (!dataset.value) return []

  return dataset.value.fields
    .filter(field =>
      field.aggregations &&
      field.aggregations.length > 0 &&
      reportForm.fields.includes(field.key)
    )
    .map(field => ({
      key: field.key,
      label: field.label,
      aggregations: field.aggregations
    }))
})

const hasSelectedFields = computed(() => reportForm.fields.length > 0)

const canSave = computed(() => {
  return reportForm.name.trim() !== '' && reportForm.fields.length > 0
})

const hasChanges = computed(() => {
  const currentState = JSON.stringify(reportForm)
  return currentState !== originalFormState.value
})

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
    originalReport.value = data

    // Poblar el formulario con los datos existentes
    Object.assign(reportForm, {
      name: data.name,
      description: data.description || '',
      dataset: data.dataset,
      fields: [...(data.fields || [])],
      filters: [...(data.filters || [])],
      groupBy: [...(data.groupBy || [])],
      aggregations: [...(data.aggregations || [])],
      mode: data.mode || 'detail',
      limit: data.limit || 1000,
      is_public: data.is_public || false,
      is_active: data.is_active !== false
    })

    // Convertir valores de fecha de string a Date objects para los filtros
    if (reportForm.filters && dataset.value?.fields) {
      reportForm.filters.forEach(filter => {
        const fieldConfig = dataset.value.fields.find(f => f.key === filter.field)
        if (fieldConfig?.type === 'date' && filter.value && typeof filter.value === 'string') {
          try {
            filter.value = new Date(filter.value)
          } catch (error) {
            console.warn('Error converting date filter value:', error)
          }
        }
      })
    }

    // Guardar estado original para detectar cambios
    originalFormState.value = JSON.stringify(reportForm)

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

const saveChanges = async () => {
  if (!canSave.value || !originalReport.value?._id) return

  try {
    saving.value = true

    const updateDto: UpdateReportDto = {
      name: reportForm.name,
      description: reportForm.description || undefined,
      fields: reportForm.fields,
      filters: reportForm.filters.filter(f => f.field && f.operator),
      groupBy: reportForm.mode === 'grouped' ? reportForm.groupBy : undefined,
      aggregations: reportForm.mode === 'grouped'
        ? reportForm.aggregations.filter(a => a.field && a.type)
        : undefined,
      mode: reportForm.mode,
      limit: reportForm.limit,
      is_public: reportForm.is_public,
      is_active: reportForm.is_active
    }

    await DynamicReportsApi.updateSavedReport(originalReport.value._id, updateDto)

    // Actualizar estado original
    originalFormState.value = JSON.stringify(reportForm)

    toast.add({
      severity: 'success',
      summary: 'Cambios guardados',
      detail: `El reporte "${reportForm.name}" ha sido actualizado`,
      life: 3000
    })

    // Regresar a la vista del reporte
    router.push(`/pesv/reports/view/${originalReport.value._id}`)
  } catch (error: any) {
    console.error('Error saving changes:', error)
    toast.add({
      severity: 'error',
      summary: 'Error al guardar',
      detail: error.response?.data?.message || 'Error al guardar los cambios',
      life: 3000
    })
  } finally {
    saving.value = false
  }
}

const previewReport = () => {
  if (originalReport.value?._id) {
    router.push(`/pesv/reports/view/${originalReport.value._id}`)
  }
}

const goBack = () => {
  if (hasChanges.value) {
    // Aquí podrías mostrar un diálogo de confirmación
    if (confirm('¿Descartar los cambios sin guardar?')) {
      router.push('/pesv/reports')
    }
  } else {
    router.push('/pesv/reports')
  }
}

// Métodos de secciones
const toggleSection = (section: keyof typeof sections) => {
  sections[section].expanded = !sections[section].expanded
}

// Métodos de campos (reutilizar de CreateReport.vue)
const isFieldSelected = (fieldKey: string): boolean => {
  return reportForm.fields.includes(fieldKey)
}

const toggleField = (field: DatasetField) => {
  const index = reportForm.fields.indexOf(field.key)
  if (index >= 0) {
    reportForm.fields.splice(index, 1)
  } else {
    reportForm.fields.push(field.key)
  }
}

const selectBasicFields = () => {
  if (!dataset.value) return

  const basicFields = ['placa', 'nombresResponsable', 'nombresConductor', 'estado', 'createdAt']
  basicFields.forEach(fieldKey => {
    if (dataset.value!.fields.find(f => f.key === fieldKey) && !reportForm.fields.includes(fieldKey)) {
      reportForm.fields.push(fieldKey)
    }
  })
}

const removeField = (index: number) => {
  const removedField = reportForm.fields[index]
  reportForm.fields.splice(index, 1)

  // Limpiar filtros, agrupaciones y agregaciones que usen este campo
  reportForm.filters = reportForm.filters.filter(filter => filter.field !== removedField)
  reportForm.groupBy = reportForm.groupBy.filter(field => field !== removedField)
  reportForm.aggregations = reportForm.aggregations.filter(agg => agg.field !== removedField)
}

const moveFieldUp = (index: number) => {
  if (index > 0) {
    const field = reportForm.fields.splice(index, 1)[0]
    reportForm.fields.splice(index - 1, 0, field)
  }
}

const moveFieldDown = (index: number) => {
  if (index < reportForm.fields.length - 1) {
    const field = reportForm.fields.splice(index, 1)[0]
    reportForm.fields.splice(index + 1, 0, field)
  }
}

// Métodos de filtros
const addFilter = () => {
  reportForm.filters.push({
    field: '',
    operator: 'eq',
    value: '',
    logic: 'and'
  })
}

const removeFilter = (index: number) => {
  reportForm.filters.splice(index, 1)
}

const onFilterFieldChange = (index: number) => {
  reportForm.filters[index].operator = 'eq'
  reportForm.filters[index].value = ''
}

// Métodos de agregaciones
const addAggregation = () => {
  reportForm.aggregations.push({
    field: '',
    type: 'count'
  })
}

const removeAggregation = (index: number) => {
  reportForm.aggregations.splice(index, 1)
}

// Helpers (reutilizar de otros componentes)
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

const getOperatorOptions = (fieldKey: string) => {
  const field = dataset.value?.fields.find(f => f.key === fieldKey)
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

const getFilterComponent = (fieldKey: string) => {
  const field = dataset.value?.fields.find(f => f.key === fieldKey)
  if (!field) return 'InputText'

  switch (field.type) {
    case 'date': return 'Calendar'
    case 'number': return 'InputNumber'
    case 'boolean': return 'Dropdown'
    default: return 'InputText'
  }
}

const getValuePlaceholder = (fieldKey: string) => {
  const field = dataset.value?.fields.find(f => f.key === fieldKey)
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

// Validaciones
const validateField = (fieldName: string) => {
  switch (fieldName) {
    case 'name':
      errors.name = reportForm.name.trim() ? '' : 'El nombre es requerido'
      break
  }
}

// Watchers
watch(() => reportForm.mode, (newMode) => {
  if (newMode === 'detail') {
    reportForm.groupBy = []
    reportForm.aggregations = []
    sections.advanced.expanded = false
  } else {
    sections.advanced.expanded = true
  }
})

// Funciones helper para dataset
const getDatasetIcon = (datasetId: string): string => {
  switch (datasetId) {
    case 'alistamientos':
      return 'pi pi-car'
    case 'preventive_details':
      return 'pi pi-wrench'
    default:
      return 'pi pi-database'
  }
}

const getDatasetName = (datasetId: string): string => {
  switch (datasetId) {
    case 'alistamientos':
      return 'Alistamientos'
    case 'preventive_details':
      return 'Mantenimientos Preventivos'
    default:
      return 'Dataset Personalizado'
  }
}

const getDatasetDescription = (datasetId: string): string => {
  switch (datasetId) {
    case 'alistamientos':
      return 'Reportes de alistamientos de vehículos con inspecciones y dispositivos'
    case 'preventive_details':
      return 'Reportes de mantenimientos preventivos con detalles de actividades'
    default:
      return 'Origen de datos personalizado'
  }
}

// Inicialización
onMounted(() => {
  loadDataset()
  loadReport()
})
</script>

<style scoped>
.edit-report {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  background: #fafbfc;
  min-height: calc(100vh - 80px);
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.header-navigation {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.back-btn {
  margin-top: 0.25rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
  margin: 0;
}

.page-description {
  color: #6b7280;
  margin-top: 0.5rem;
  font-size: 1.1rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border: none;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  border-radius: 8px;
}

/* Alerta de cambios */
.changes-alert {
  margin-bottom: 1.5rem;
}

/* Secciones del formulario */
.form-sections {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  color: #1f2937;
  width: 100%;
}

.section-content {
  padding-top: 1rem;
}

.subsection-title {
  font-weight: 600;
  color: #374151;
  margin: 0 0 1rem 0;
  font-size: 1rem;
}

/* Formularios */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field.span-2 {
  grid-column: span 2;
}

.form-field label {
  font-weight: 600;
  color: #374151;
}

.field-hint {
  color: #6b7280;
  font-size: 0.75rem;
}

.section-description {
  color: #6b7280;
  margin: 0;
  flex: 1;
}

/* Editor de campos */
.fields-editor {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.fields-search {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.search-input {
  width: 300px;
}

.selection-actions {
  display: flex;
  gap: 0.5rem;
}

.fields-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.fields-list,
.selected-fields-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.5rem;
}

.field-item {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.field-item:hover,
.field-item.field-selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.selected-field-item {
  padding: 1rem;
  border: 1px solid #10b981;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  background: #ecfdf5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.field-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.field-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-name {
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.field-actions {
  display: flex;
  gap: 0.25rem;
}

.empty-selection {
  text-align: center;
  padding: 3rem 1rem;
  color: #9ca3af;
}

.empty-selection i {
  font-size: 3rem;
  margin-bottom: 1rem;
  display: block;
}

/* Editor de filtros */
.filters-editor {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.filter-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  background: #fafbfc;
}

.filter-config {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 1rem;
  align-items: end;
}

.filter-field,
.filter-operator,
.filter-value {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-logic {
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-filters {
  text-align: center;
  padding: 3rem;
  color: #9ca3af;
}

.empty-filters i {
  font-size: 3rem;
  margin-bottom: 1rem;
}

/* Configuración avanzada */
.advanced-config {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.aggregations-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.aggregations-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.aggregation-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* Estado de carga */
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

/* Responsive */
@media (max-width: 1024px) {
  .fields-container {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .filter-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .edit-report {
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

  .fields-search {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-field.span-2 {
    grid-column: span 1;
  }
}

/* Scroll personalizado */
.fields-list::-webkit-scrollbar,
.selected-fields-list::-webkit-scrollbar {
  width: 6px;
}

.fields-list::-webkit-scrollbar-track,
.selected-fields-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.fields-list::-webkit-scrollbar-thumb,
.selected-fields-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.fields-list::-webkit-scrollbar-thumb:hover,
.selected-fields-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Dataset de solo lectura */
.dataset-readonly {
  background: #f8fafc !important;
  border-left: 4px solid #6366f1;
}

.dataset-info-readonly {
  padding: 0.5rem 0;
}

.dataset-display {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.dataset-readonly .dataset-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: #6366f1;
  color: white;
  font-size: 1.25rem;
}

.dataset-details h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.dataset-details p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.4;
}

.dataset-note {
  display: block;
  color: #6b7280;
  font-style: italic;
  line-height: 1.4;
}
</style>