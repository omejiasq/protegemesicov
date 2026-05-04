<template>
  <div class="create-report">
    <!-- Header con navegación -->
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
            <i class="pi pi-plus mr-3"></i>
            Crear Nuevo Reporte
          </h1>
          <p class="page-description">
            Configura un reporte personalizado de alistamientos
          </p>
        </div>
      </div>
      <div class="header-actions">
        <Button
          label="Guardar y Probar"
          icon="pi pi-check"
          @click="saveAndTest"
          :disabled="!canSave"
          :loading="saving"
          class="btn-primary"
        />
        <Button
          label="Guardar"
          icon="pi pi-save"
          @click="saveReport"
          :disabled="!canSave"
          :loading="saving"
          outlined
        />
      </div>
    </div>

    <!-- Progreso del asistente -->
    <Card class="progress-card">
      <template #content>
        <div class="progress-container">
          <div class="progress-steps">
            <div
              v-for="(step, index) in steps"
              :key="step.key"
              class="step-item"
              :class="{
                'step-active': currentStep === index,
                'step-completed': index < currentStep,
                'step-disabled': index > currentStep
              }"
              @click="goToStep(index)"
            >
              <div class="step-indicator">
                <i v-if="index < currentStep" class="pi pi-check"></i>
                <span v-else>{{ index + 1 }}</span>
              </div>
              <div class="step-info">
                <h4 class="step-title">{{ step.title }}</h4>
                <p class="step-description">{{ step.description }}</p>
              </div>
            </div>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${(currentStep / (steps.length - 1)) * 100}%` }"
            ></div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Contenido principal del asistente -->
    <div class="wizard-content">
      <!-- Paso 1: Selección de Fuente de Datos -->
      <Card v-show="currentStep === 0" class="step-card">
        <template #title>
          <i class="pi pi-database mr-2"></i>
          Seleccionar Fuente de Datos
        </template>
        <template #content>
          <div class="dataset-selection">
            <p class="selection-description">
              Selecciona el origen de los datos para tu reporte. Cada fuente contiene diferentes tipos de información.
            </p>

            <div class="dataset-options">
              <div
                v-for="datasetOption in availableDatasets"
                :key="datasetOption.id"
                class="dataset-option"
                :class="{ 'selected': reportForm.dataset === datasetOption.id }"
                @click="selectDataset(datasetOption.id)"
              >
                <div class="dataset-icon">
                  <i :class="getDatasetIcon(datasetOption.id)"></i>
                </div>
                <div class="dataset-info">
                  <h3>{{ datasetOption.name }}</h3>
                  <p>{{ getDatasetDescription(datasetOption.id) }}</p>
                  <div class="dataset-fields-count">
                    {{ datasetOption.fields?.length || 0 }} campos disponibles
                  </div>
                </div>
                <div class="dataset-selection-indicator">
                  <i class="pi pi-check" v-if="reportForm.dataset === datasetOption.id"></i>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Paso 2: Información Básica -->
      <Card v-show="currentStep === 1" class="step-card">
        <template #title>
          <i class="pi pi-info-circle mr-2"></i>
          Información del Reporte
        </template>
        <template #content>
          <div class="form-grid">
            <div class="form-field span-2">
              <label for="reportName">Nombre del Reporte *</label>
              <InputText
                id="reportName"
                v-model="reportForm.name"
                placeholder="Ej: Reporte de Alistamientos por Estado"
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
                placeholder="Descripción opcional del reporte..."
                rows="3"
                :maxlength="500"
              />
              <small class="field-hint">{{ reportForm.description?.length || 0 }}/500 caracteres</small>
            </div>

            <div class="form-field">
              <label for="reportType">Tipo de Reporte</label>
              <Dropdown
                id="reportType"
                v-model="reportForm.mode"
                :options="reportModes"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar tipo"
              />
            </div>

            <div class="form-field">
              <label for="reportPrivacy">Privacidad</label>
              <Dropdown
                id="reportPrivacy"
                v-model="reportForm.is_public"
                :options="privacyOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar privacidad"
              />
            </div>
          </div>
        </template>
      </Card>

      <!-- Paso 3: Selección de Campos -->
      <Card v-show="currentStep === 2" class="step-card">
        <template #title>
          <i class="pi pi-table mr-2"></i>
          Campos del Reporte
        </template>
        <template #content>
          <div class="fields-section">
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
                <Button
                  label="Limpiar Todo"
                  @click="clearAllFields"
                  outlined
                  size="small"
                  severity="secondary"
                />
              </div>
            </div>

            <div class="fields-container">
              <!-- Campos disponibles -->
              <div class="available-fields">
                <h4 class="section-title">
                  Campos Disponibles
                  <Badge :value="filteredAvailableFields.length" />
                </h4>
                <div class="fields-list">
                  <div
                    v-for="field in filteredAvailableFields"
                    :key="field.key"
                    class="field-item"
                    :class="{ 'field-selected': isFieldSelected(field.key) }"
                  >
                    <div class="field-content" @click="toggleField(field)">
                      <div class="field-header">
                        <h5 class="field-name">{{ field.label }}</h5>
                        <Checkbox
                          :modelValue="isFieldSelected(field.key)"
                          @click.stop
                          @change="toggleField(field)"
                          binary
                        />
                      </div>
                      <div class="field-meta">
                        <Tag :value="field.type" :severity="getFieldTypeSeverity(field.type)" />
                        <span v-if="field.groupable" class="field-feature">
                          <i class="pi pi-sitemap"></i>Agrupable
                        </span>
                        <span v-if="field.aggregations?.length" class="field-feature">
                          <i class="pi pi-calculator"></i>Agregable
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Campos seleccionados -->
              <div class="selected-fields">
                <h4 class="section-title">
                  Campos Seleccionados
                  <Badge :value="reportForm.fields.length" severity="success" />
                </h4>
                <div class="fields-list">
                  <div
                    v-for="(fieldKey, index) in reportForm.fields"
                    :key="`selected-${fieldKey}`"
                    class="selected-field-item"
                  >
                    <div class="field-content">
                      <div class="field-header">
                        <h5 class="field-name">{{ getFieldLabel(fieldKey) }}</h5>
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
                      <div class="field-meta">
                        <Tag :value="getFieldType(fieldKey)" :severity="getFieldTypeSeverity(getFieldType(fieldKey))" />
                      </div>
                    </div>
                  </div>

                  <div v-if="reportForm.fields.length === 0" class="empty-selection">
                    <i class="pi pi-inbox"></i>
                    <p>No hay campos seleccionados</p>
                    <small>Selecciona campos del panel izquierdo</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Paso 4: Filtros -->
      <Card v-show="currentStep === 3" class="step-card">
        <template #title>
          <i class="pi pi-filter mr-2"></i>
          Filtros del Reporte
        </template>
        <template #content>
          <div class="filters-section">
            <div class="filters-header">
              <p class="section-description">
                Agrega filtros para limitar los datos que aparecerán en tu reporte
              </p>
              <Button
                label="Agregar Filtro"
                icon="pi pi-plus"
                @click="addFilter"
                :disabled="!hasSelectedFields"
                outlined
              />
            </div>

            <div v-if="reportForm.filters.length > 0" class="filters-list">
              <div
                v-for="(filter, index) in reportForm.filters"
                :key="`filter-${index}`"
                class="filter-item"
              >
                <div class="filter-content">
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
              <small>Los filtros son opcionales y permiten refinar los resultados</small>
            </div>
          </div>
        </template>
      </Card>

      <!-- Paso 5: Configuración Avanzada -->
      <Card v-show="currentStep === 4" class="step-card">
        <template #title>
          <i class="pi pi-cog mr-2"></i>
          Configuración Avanzada
        </template>
        <template #content>
          <div class="advanced-config">
            <div class="config-section">
              <h4 class="config-title">Opciones de Consulta</h4>
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
                  <label>Modo de Reporte</label>
                  <SelectButton
                    v-model="reportForm.mode"
                    :options="reportModes"
                    optionLabel="label"
                    optionValue="value"
                  />
                </div>
              </div>
            </div>

            <!-- Configuración de agrupación (solo para modo agrupado) -->
            <div v-if="reportForm.mode === 'grouped'" class="config-section">
              <h4 class="config-title">Agrupación</h4>
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
                    class="multiselect-responsive"
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

            <!-- Vista previa de la configuración -->
            <div class="config-section">
              <h4 class="config-title">Vista Previa</h4>
              <div class="config-preview">
                <div class="preview-item">
                  <strong>Tipo:</strong>
                  {{ reportModes.find(m => m.value === reportForm.mode)?.label }}
                </div>
                <div class="preview-item">
                  <strong>Campos:</strong>
                  {{ reportForm.fields.length }} seleccionados
                </div>
                <div class="preview-item">
                  <strong>Filtros:</strong>
                  {{ reportForm.filters.length }} configurados
                </div>
                <div class="preview-item">
                  <strong>Privacidad:</strong>
                  {{ reportForm.is_public ? 'Público' : 'Privado' }}
                </div>
                <div class="preview-item">
                  <strong>Límite:</strong>
                  {{ reportForm.limit || 1000 }} registros
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Navegación del asistente -->
    <Card class="navigation-card">
      <template #content>
        <div class="wizard-navigation">
          <div class="nav-left">
            <Button
              v-if="currentStep > 0"
              label="Anterior"
              icon="pi pi-chevron-left"
              @click="previousStep"
              outlined
            />
          </div>

          <div class="nav-center">
            <span class="step-counter">
              Paso {{ currentStep + 1 }} de {{ steps.length }}
            </span>
          </div>

          <div class="nav-right">
            <Button
              v-if="currentStep < steps.length - 1"
              label="Siguiente"
              icon="pi pi-chevron-right"
              iconPos="right"
              @click="nextStep"
              :disabled="!canProceed"
            />
            <Button
              v-else
              label="Finalizar"
              icon="pi pi-check"
              @click="saveReport"
              :disabled="!canSave"
              :loading="saving"
              class="btn-primary"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Toast para notificaciones -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
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
import Badge from 'primevue/badge'
import Tag from 'primevue/tag'
import Calendar from 'primevue/calendar'
import Toast from 'primevue/toast'

// Services y tipos
import {
  DynamicReportsApi,
  type Dataset,
  type DatasetField,
  type FilterCondition,
  type Aggregation,
  type CreateReportDto
} from '../../api/dynamic-reports.service'

// Composables
const router = useRouter()
const toast = useToast()

// Estado del asistente
const currentStep = ref(0)
const saving = ref(false)
const dataset = ref<Dataset | null>(null)
const fieldSearch = ref('')
const availableDatasets = ref<Dataset[]>([])

// Pasos del asistente
const steps = [
  {
    key: 'dataset',
    title: 'Fuente de Datos',
    description: 'Seleccionar el origen de información'
  },
  {
    key: 'info',
    title: 'Información',
    description: 'Datos básicos del reporte'
  },
  {
    key: 'fields',
    title: 'Campos',
    description: 'Seleccionar información a mostrar'
  },
  {
    key: 'filters',
    title: 'Filtros',
    description: 'Criterios de filtrado'
  },
  {
    key: 'config',
    title: 'Configuración',
    description: 'Opciones avanzadas'
  }
]

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
  is_public: false
})

// Validaciones
const errors = reactive({
  name: ''
})

// Opciones de configuración
const reportModes = [
  { label: 'Detalle', value: 'detail', icon: 'pi-list' },
  { label: 'Agrupado', value: 'grouped', icon: 'pi-chart-bar' }
]

const privacyOptions = [
  { label: 'Privado (Solo yo)', value: false },
  { label: 'Público (Toda la empresa)', value: true }
]

const logicOptions = [
  { label: 'Y (AND)', value: 'and' },
  { label: 'O (OR)', value: 'or' }
]

// Computed properties
const filteredAvailableFields = computed(() => {
  if (!dataset.value || !dataset.value.fields) return []

  const search = fieldSearch.value.toLowerCase()
  return dataset.value.fields.filter(field =>
    field.label.toLowerCase().includes(search) ||
    field.key.toLowerCase().includes(search)
  )
})

const selectedFieldsOptions = computed(() => {
  if (!dataset.value || !dataset.value.fields) return []

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
  if (!dataset.value || !dataset.value.fields) return []

  return dataset.value.fields
    .filter(field => field.groupable && reportForm.fields.includes(field.key))
    .map(field => ({
      key: field.key,
      label: field.label
    }))
})

const aggregatableFields = computed(() => {
  if (!dataset.value || !dataset.value.fields) return []

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

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 0:
      // Paso de selección de dataset - requiere que haya un dataset seleccionado
      return reportForm.dataset !== ''
    case 1:
      // Paso de información - requiere nombre del reporte
      return reportForm.name.trim() !== ''
    case 2:
      // Paso de campos - requiere al menos un campo seleccionado
      return reportForm.fields.length > 0
    case 3:
      // Paso de filtros - es opcional
      return true
    case 4:
      // Paso de configuración - es opcional
      return true
    default:
      return false
  }
})

const canSave = computed(() => {
  return reportForm.name.trim() !== '' && reportForm.fields.length > 0
})

// Métodos del asistente
const goToStep = (step: number) => {
  if (step <= currentStep.value || canProceed.value) {
    currentStep.value = step
  }
}

const nextStep = () => {
  if (canProceed.value && currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// Métodos de campos
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
  if (!dataset.value || !dataset.value.fields) return

  const basicFields = ['placa', 'nombresResponsable', 'nombresConductor', 'estado', 'createdAt']
  basicFields.forEach(fieldKey => {
    if (dataset.value!.fields.find(f => f.key === fieldKey) && !reportForm.fields.includes(fieldKey)) {
      reportForm.fields.push(fieldKey)
    }
  })
}

const clearAllFields = () => {
  reportForm.fields = []
  reportForm.groupBy = []
  reportForm.aggregations = []
  reportForm.filters = []
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
  // Reset operator and value when field changes
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

// Métodos principales
const loadDataset = async () => {
  try {
    // Cargar todos los datasets disponibles
    const { data: datasets } = await DynamicReportsApi.getAvailableDatasets()
    availableDatasets.value = datasets

    // Cargar el dataset por defecto (alistamientos)
    const defaultDataset = datasets.find(d => d.id === reportForm.dataset)
    if (defaultDataset) {
      dataset.value = defaultDataset
    }
  } catch (error) {
    console.error('Error loading dataset:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error al cargar los datasets disponibles',
      life: 3000
    })
  }
}

const selectDataset = async (datasetId: string) => {
  reportForm.dataset = datasetId

  // Limpiar campos y filtros cuando se cambia el dataset
  reportForm.fields = []
  reportForm.filters = []
  reportForm.groupBy = []
  reportForm.aggregations = []

  // Cargar el dataset seleccionado
  try {
    const selectedDataset = availableDatasets.value.find(d => d.id === datasetId)
    if (selectedDataset) {
      dataset.value = selectedDataset
    }
  } catch (error) {
    console.error('Error selecting dataset:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error al seleccionar el dataset',
      life: 3000
    })
  }
}

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

const saveReport = async () => {
  if (!canSave.value) return

  try {
    saving.value = true

    const createDto: CreateReportDto = {
      name: reportForm.name,
      description: reportForm.description || undefined,
      dataset: reportForm.dataset,
      fields: reportForm.fields,
      filters: reportForm.filters.filter(f => f.field && f.operator),
      groupBy: reportForm.mode === 'grouped' ? reportForm.groupBy : undefined,
      aggregations: reportForm.mode === 'grouped'
        ? reportForm.aggregations.filter(a => a.field && a.type)
        : undefined,
      mode: reportForm.mode,
      limit: reportForm.limit,
      is_public: reportForm.is_public
    }

    await DynamicReportsApi.saveReport(createDto)

    toast.add({
      severity: 'success',
      summary: 'Reporte guardado',
      detail: `El reporte "${reportForm.name}" ha sido guardado exitosamente`,
      life: 3000
    })

    // Regresar a la lista de reportes
    router.push('/pesv/reports')
  } catch (error: any) {
    console.error('Error saving report:', error)
    toast.add({
      severity: 'error',
      summary: 'Error al guardar',
      detail: error.response?.data?.message || 'Error al guardar el reporte',
      life: 3000
    })
  } finally {
    saving.value = false
  }
}

const saveAndTest = async () => {
  await saveReport()
  // Aquí podrías navegar directamente a ejecutar el reporte recién creado
}

const goBack = () => {
  router.push('/pesv/reports')
}

// Watchers
watch(() => reportForm.mode, (newMode) => {
  if (newMode === 'detail') {
    reportForm.groupBy = []
    reportForm.aggregations = []
  }
})

// Inicialización
onMounted(() => {
  loadDataset()
})
</script>

<style scoped>
.create-report {
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

/* Progreso */
.progress-card {
  margin-bottom: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.progress-container {
  position: relative;
}

.progress-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
}

.step-item:not(.step-disabled):hover {
  transform: translateY(-1px);
}

.step-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.step-item.step-completed .step-indicator {
  background: #10b981;
  color: white;
}

.step-item.step-active .step-indicator {
  background: #3b82f6;
  color: white;
}

.step-item.step-disabled .step-indicator {
  background: #e5e7eb;
  color: #9ca3af;
}

.step-info {
  flex: 1;
}

.step-title {
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.step-description {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
}

.progress-bar {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #10b981);
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Contenido del asistente */
.wizard-content {
  margin-bottom: 2rem;
}

.step-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
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

/* Selección de campos */
.fields-section {
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

.section-title {
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.fields-list {
  max-height: 500px;
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
}

.field-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.field-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.field-feature {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
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

/* Filtros */
.filters-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.section-description {
  color: #6b7280;
  margin: 0;
  flex: 1;
}

.filter-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  background: #fafbfc;
}

.filter-content {
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

.config-section {
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafbfc;
}

.config-title {
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1rem 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
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

.config-preview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 6px;
}

.preview-item {
  display: flex;
  gap: 0.5rem;
  color: #374151;
}

/* Navegación */
.navigation-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.wizard-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
}

.nav-left,
.nav-right {
  flex: 1;
}

.nav-right {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.nav-center {
  text-align: center;
}

.step-counter {
  font-weight: 600;
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

  .config-preview {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .create-report {
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

  .progress-steps {
    flex-direction: column;
    gap: 1rem;
  }

  .step-item {
    justify-content: flex-start;
  }
}

/* Selección de Dataset */
.dataset-selection {
  padding: 1rem 0;
}

.selection-description {
  font-size: 1rem;
  color: #6b7280;
  margin-bottom: 2rem;
  text-align: center;
  line-height: 1.6;
}

.dataset-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.dataset-option {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.dataset-option:hover {
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.dataset-option.selected {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.dataset-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 1.5rem;
  margin-right: 1.25rem;
  flex-shrink: 0;
}

.dataset-option.selected .dataset-icon {
  background: #3b82f6;
  color: white;
}

.dataset-info {
  flex: 1;
}

.dataset-info h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.dataset-option.selected .dataset-info h3 {
  color: #1e40af;
}

.dataset-info p {
  margin: 0 0 0.75rem 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
}

.dataset-fields-count {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #f3f4f6;
  color: #4b5563;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.dataset-option.selected .dataset-fields-count {
  background: #dbeafe;
  color: #1e40af;
}

.dataset-selection-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  font-size: 0.875rem;
  margin-left: 1rem;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s ease;
}

.dataset-option.selected .dataset-selection-indicator {
  opacity: 1;
  transform: scale(1);
}

/* Scroll personalizado */
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
</style>