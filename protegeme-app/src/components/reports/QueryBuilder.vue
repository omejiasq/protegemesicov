<template>
  <div class="query-builder">
    <!-- Selección de Colecciones -->
    <div class="builder-section">
      <h4 class="section-title">
        <i class="pi pi-database mr-2"></i>
        Fuentes de Datos
      </h4>
      <div class="collections-grid">
        <div
          v-for="collection in availableCollections"
          :key="collection.name"
          :class="[
            'collection-card',
            { 'selected': selectedCollections.includes(collection.name) }
          ]"
          @click="toggleCollection(collection.name)"
        >
          <div class="collection-header">
            <Checkbox
              :value="collection.name"
              v-model="selectedCollections"
              :binary="false"
            />
            <span class="collection-name">{{ collection.displayName }}</span>
          </div>
          <div class="collection-info">
            <small>{{ collection.fields.length }} campos disponibles</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Selección de Campos -->
    <div class="builder-section" v-if="selectedCollections.length > 0">
      <h4 class="section-title">
        <i class="pi pi-list mr-2"></i>
        Campos del Reporte
      </h4>

      <div class="fields-container">
        <div class="available-fields">
          <h5>Campos Disponibles</h5>
          <div class="fields-search">
            <InputText
              v-model="fieldSearch"
              placeholder="Buscar campos..."
              class="w-full"
            >
              <template #prefix>
                <i class="pi pi-search"></i>
              </template>
            </InputText>
          </div>

          <div class="fields-tree">
            <div
              v-for="collection in filteredCollectionFields"
              :key="collection.name"
              class="collection-fields"
            >
              <h6 class="collection-title">{{ collection.displayName }}</h6>
              <div
                v-for="field in collection.fields"
                :key="`${collection.name}.${field.path}`"
                :class="[
                  'field-item',
                  { 'selected': isFieldSelected(collection.name, field.path) }
                ]"
                @click="toggleField(collection.name, field)"
                draggable="true"
                @dragstart="handleDragStart($event, collection.name, field)"
              >
                <div class="field-info">
                  <i :class="getFieldIcon(field.type)" class="mr-2"></i>
                  <span class="field-label">{{ field.label }}</span>
                  <Badge :value="field.type" class="ml-auto" />
                </div>
                <div class="field-meta" v-if="field.enumValues">
                  <small>Opciones: {{ field.enumValues.join(', ') }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="selected-fields">
          <h5>Campos Seleccionados</h5>
          <div
            class="fields-drop-zone"
            @drop="handleDrop"
            @dragover.prevent
            @dragenter.prevent
          >
            <div
              v-for="(campo, index) in selectedFields"
              :key="`selected-${index}`"
              class="selected-field-item"
            >
              <div class="field-controls">
                <Button
                  icon="pi pi-angle-up"
                  text
                  size="small"
                  @click="moveField(index, -1)"
                  :disabled="index === 0"
                />
                <Button
                  icon="pi pi-angle-down"
                  text
                  size="small"
                  @click="moveField(index, 1)"
                  :disabled="index === selectedFields.length - 1"
                />
              </div>

              <div class="field-config">
                <div class="field-basic-info">
                  <i :class="getFieldIcon(campo.type)" class="mr-2"></i>
                  <InputText
                    v-model="campo.label"
                    placeholder="Etiqueta del campo"
                    class="field-label-input"
                  />
                  <Badge :value="campo.type" />
                </div>

                <div class="field-options">
                  <div class="field-option">
                    <Checkbox v-model="campo.visible" binary />
                    <label class="ml-2">Visible</label>
                  </div>

                  <div class="field-option" v-if="campo.type === 'number'">
                    <Dropdown
                      v-model="campo.aggregation"
                      :options="aggregationOptions"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Agregación"
                      class="w-full"
                    />
                  </div>

                  <div class="field-option" v-if="needsFormat(campo.type)">
                    <Dropdown
                      v-model="campo.format"
                      :options="getFormatOptions(campo.type)"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Formato"
                      class="w-full"
                    />
                  </div>
                </div>
              </div>

              <Button
                icon="pi pi-times"
                severity="danger"
                text
                size="small"
                @click="removeField(index)"
                class="remove-field"
              />
            </div>

            <div v-if="selectedFields.length === 0" class="empty-fields">
              <i class="pi pi-inbox text-4xl text-gray-400"></i>
              <p>Arrastra campos aquí o haz clic en los campos disponibles</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Constructor de Filtros -->
    <div class="builder-section" v-if="selectedFields.length > 0">
      <h4 class="section-title">
        <i class="pi pi-filter mr-2"></i>
        Filtros
      </h4>

      <div class="filters-container">
        <div
          v-for="(filter, index) in filters"
          :key="`filter-${index}`"
          class="filter-row"
        >
          <Dropdown
            v-model="filter.field"
            :options="filterableFields"
            optionLabel="label"
            optionValue="path"
            placeholder="Campo"
            class="filter-field"
          />

          <Dropdown
            v-model="filter.operator"
            :options="getOperatorOptions(filter.field)"
            optionLabel="label"
            optionValue="value"
            placeholder="Operador"
            class="filter-operator"
          />

          <component
            :is="getValueComponent(filter.field, filter.operator)"
            v-model="filter.value"
            :options="getValueOptions(filter.field)"
            :placeholder="getValuePlaceholder(filter.field)"
            class="filter-value"
          />

          <Dropdown
            v-model="filter.logic"
            :options="logicOptions"
            optionLabel="label"
            optionValue="value"
            class="filter-logic"
            v-if="index < filters.length - 1"
          />

          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            @click="removeFilter(index)"
            class="remove-filter"
          />
        </div>

        <Button
          label="Agregar Filtro"
          icon="pi pi-plus"
          outlined
          @click="addFilter"
          class="add-filter-btn"
        />
      </div>
    </div>

    <!-- Opciones de Ordenamiento y Agrupación -->
    <div class="builder-section" v-if="selectedFields.length > 0">
      <h4 class="section-title">
        <i class="pi pi-sort mr-2"></i>
        Ordenamiento y Agrupación
      </h4>

      <div class="sort-group-container">
        <div class="sort-section">
          <h5>Ordenamiento</h5>
          <div
            v-for="(sort, index) in sorting"
            :key="`sort-${index}`"
            class="sort-row"
          >
            <Dropdown
              v-model="sort.campo"
              :options="sortableFields"
              optionLabel="label"
              optionValue="path"
              placeholder="Campo"
              class="sort-field"
            />
            <Dropdown
              v-model="sort.direccion"
              :options="sortDirections"
              optionLabel="label"
              optionValue="value"
              placeholder="Dirección"
              class="sort-direction"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              @click="removeSortField(index)"
            />
          </div>
          <Button
            label="Agregar Ordenamiento"
            icon="pi pi-plus"
            outlined
            size="small"
            @click="addSortField"
          />
        </div>

        <div class="group-section">
          <h5>Agrupación</h5>
          <MultiSelect
            v-model="groupBy"
            :options="groupableFields"
            optionLabel="label"
            optionValue="path"
            placeholder="Seleccionar campos de agrupación"
            class="w-full"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import Checkbox from 'primevue/checkbox'
import Badge from 'primevue/badge'
import { ReportsApi } from '../../api/reports.service'

interface FieldInfo {
  path: string
  label: string
  type: string
  isRequired?: boolean
  isArray?: boolean
  enumValues?: string[]
  ref?: string
  nested?: FieldInfo[]
}

interface CollectionInfo {
  name: string
  displayName: string
  fields: FieldInfo[]
}

interface FieldConfig {
  path: string
  label: string
  type: string
  visible: boolean
  format?: string
  aggregation?: string
}

interface FilterCondition {
  field: string
  operator: string
  value: any
  logic: 'and' | 'or'
}

const props = defineProps<{
  modelValue: {
    collections: string[]
    campos: FieldConfig[]
    filtros: FilterCondition[]
    ordenamiento?: { campo: string; direccion: 'asc' | 'desc' }[]
    agrupacion?: string[]
    limite?: number
  }
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

// Estado del componente
const availableCollections = ref<CollectionInfo[]>([])
const selectedCollections = ref<string[]>(props.modelValue.collections || [])
const selectedFields = ref<FieldConfig[]>(props.modelValue.campos || [])
const filters = ref<FilterCondition[]>(props.modelValue.filtros || [])
const sorting = ref(props.modelValue.ordenamiento || [])
const groupBy = ref<string[]>(props.modelValue.agrupacion || [])
const fieldSearch = ref('')

// Opciones para dropdowns
const aggregationOptions = [
  { label: 'Ninguna', value: '' },
  { label: 'Suma', value: 'sum' },
  { label: 'Promedio', value: 'avg' },
  { label: 'Contar', value: 'count' },
  { label: 'Mínimo', value: 'min' },
  { label: 'Máximo', value: 'max' }
]

const logicOptions = [
  { label: 'Y', value: 'and' },
  { label: 'O', value: 'or' }
]

const sortDirections = [
  { label: 'Ascendente', value: 'asc' },
  { label: 'Descendente', value: 'desc' }
]

// Computed properties optimizados
const filteredCollectionFields = computed(() => {
  const selectedCols = selectedCollections.value
  const searchTerm = fieldSearch.value?.toLowerCase() || ''

  if (!searchTerm || searchTerm.length < 2) {
    return availableCollections.value.filter(col =>
      selectedCols.includes(col.name)
    )
  }

  return availableCollections.value
    .filter(col => selectedCols.includes(col.name))
    .map(col => {
      const filteredFields = col.fields.filter(field => {
        const labelMatch = field.label.toLowerCase().includes(searchTerm)
        const pathMatch = field.path.toLowerCase().includes(searchTerm)
        return labelMatch || pathMatch
      })

      return { ...col, fields: filteredFields }
    })
    .filter(col => col.fields.length > 0)
})

const filterableFields = computed(() => {
  return selectedFields.value.map(field => ({
    label: field.label,
    path: field.path,
    type: field.type
  }))
})

const sortableFields = computed(() => filterableFields.value)
const groupableFields = computed(() => filterableFields.value)

// Métodos optimizados
const loadAvailableCollections = async () => {
  try {
    const { data } = await ReportsApi.getAvailableCollections()
    // Cargar solo las colecciones básicas inicialmente
    availableCollections.value = data || []
  } catch (error) {
    console.error('Error loading collections:', error)
    // Fallback con colecciones básicas
    availableCollections.value = [
      { name: 'terminal_salidas', displayName: 'Despachos de Salida', fields: [] },
      { name: 'terminal_llegadas', displayName: 'Llegadas de Terminal', fields: [] },
      { name: 'users', displayName: 'Usuarios', fields: [] },
      { name: 'vehicles', displayName: 'Vehículos', fields: [] }
    ]
  }
}

const toggleCollection = (collectionName: string) => {
  const index = selectedCollections.value.indexOf(collectionName)
  if (index === -1) {
    selectedCollections.value.push(collectionName)
  } else {
    selectedCollections.value.splice(index, 1)
    // Remover campos de la colección deseleccionada
    selectedFields.value = selectedFields.value.filter(field =>
      !field.path.startsWith(collectionName + '.')
    )
  }
}

const isFieldSelected = (collectionName: string, fieldPath: string): boolean => {
  const fullPath = collectionName === selectedCollections.value[0]
    ? fieldPath
    : `${collectionName}.${fieldPath}`
  return selectedFields.value.some(field => field.path === fullPath)
}

const toggleField = (collectionName: string, field: FieldInfo) => {
  const fullPath = collectionName === selectedCollections.value[0]
    ? field.path
    : `${collectionName}.${field.path}`

  const existingIndex = selectedFields.value.findIndex(f => f.path === fullPath)

  if (existingIndex === -1) {
    // Agregar campo
    selectedFields.value.push({
      path: fullPath,
      label: field.label,
      type: field.type,
      visible: true,
      format: getDefaultFormat(field.type),
      aggregation: field.type === 'number' ? '' : undefined
    })
  } else {
    // Remover campo
    selectedFields.value.splice(existingIndex, 1)
  }
}

const moveField = (index: number, direction: number) => {
  const newIndex = index + direction
  if (newIndex >= 0 && newIndex < selectedFields.value.length) {
    const field = selectedFields.value.splice(index, 1)[0]
    selectedFields.value.splice(newIndex, 0, field)
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

const addSortField = () => {
  sorting.value.push({
    campo: '',
    direccion: 'asc'
  })
}

const removeSortField = (index: number) => {
  sorting.value.splice(index, 1)
}

// Drag and drop handlers
const handleDragStart = (event: DragEvent, collectionName: string, field: FieldInfo) => {
  event.dataTransfer?.setData('application/json', JSON.stringify({
    collectionName,
    field
  }))
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  const data = event.dataTransfer?.getData('application/json')
  if (data) {
    const { collectionName, field } = JSON.parse(data)
    toggleField(collectionName, field)
  }
}

// Helper functions
const getFieldIcon = (type: string): string => {
  const icons: Record<string, string> = {
    string: 'pi pi-align-left',
    number: 'pi pi-hashtag',
    date: 'pi pi-calendar',
    boolean: 'pi pi-check-square',
    array: 'pi pi-list',
    objectid: 'pi pi-key',
    enum: 'pi pi-list',
    mixed: 'pi pi-question'
  }
  return icons[type] || 'pi pi-question'
}

const getDefaultFormat = (type: string): string | undefined => {
  if (type === 'number') return 'number'
  if (type === 'date') return 'date'
  return undefined
}

const needsFormat = (type: string): boolean => {
  return ['number', 'date'].includes(type)
}

const getFormatOptions = (type: string) => {
  const formats: Record<string, any[]> = {
    number: [
      { label: 'Número', value: 'number' },
      { label: 'Moneda', value: 'currency' },
      { label: 'Porcentaje', value: 'percentage' }
    ],
    date: [
      { label: 'Fecha', value: 'date' },
      { label: 'Fecha y hora', value: 'datetime' },
      { label: 'Solo hora', value: 'time' }
    ]
  }
  return formats[type] || []
}

const getOperatorOptions = (fieldPath: string) => {
  const field = selectedFields.value.find(f => f.path === fieldPath)
  if (!field) return []

  const baseOperators = [
    { label: 'Igual a', value: 'eq' },
    { label: 'Diferente de', value: 'ne' }
  ]

  if (field.type === 'string') {
    return [
      ...baseOperators,
      { label: 'Contiene', value: 'like' },
      { label: 'En lista', value: 'in' },
      { label: 'No en lista', value: 'nin' }
    ]
  }

  if (field.type === 'number' || field.type === 'date') {
    return [
      ...baseOperators,
      { label: 'Mayor que', value: 'gt' },
      { label: 'Mayor o igual', value: 'gte' },
      { label: 'Menor que', value: 'lt' },
      { label: 'Menor o igual', value: 'lte' },
      { label: 'En lista', value: 'in' }
    ]
  }

  return baseOperators
}

const getValueComponent = (fieldPath: string, operator: string) => {
  const field = selectedFields.value.find(f => f.path === fieldPath)
  if (!field) return 'InputText'

  if (['in', 'nin'].includes(operator)) {
    return 'MultiSelect'
  }

  if (field.type === 'date') return 'Calendar'
  if (field.type === 'number') return 'InputNumber'
  if (field.type === 'boolean') return 'Dropdown'

  return 'InputText'
}

const getValueOptions = (fieldPath: string) => {
  const field = selectedFields.value.find(f => f.path === fieldPath)
  if (!field) return []

  if (field.type === 'boolean') {
    return [
      { label: 'Verdadero', value: true },
      { label: 'Falso', value: false }
    ]
  }

  if (field.enumValues) {
    return field.enumValues.map(val => ({ label: val, value: val }))
  }

  return []
}

const getValuePlaceholder = (fieldPath: string) => {
  const field = selectedFields.value.find(f => f.path === fieldPath)
  if (!field) return 'Valor'

  const placeholders: Record<string, string> = {
    string: 'Ingrese texto',
    number: 'Ingrese número',
    date: 'Seleccione fecha',
    boolean: 'Seleccione opción'
  }

  return placeholders[field.type] || 'Valor'
}

// Watchers para sincronización con el modelo
watch([selectedCollections, selectedFields, filters, sorting, groupBy], () => {
  emit('update:modelValue', {
    tipo: 'personalizado',
    collections: selectedCollections.value,
    campos: selectedFields.value,
    filtros: filters.value,
    ordenamiento: sorting.value,
    agrupacion: groupBy.value
  })
}, { deep: true })

// Inicialización
loadAvailableCollections()
</script>

<style scoped>
.query-builder {
  max-width: 100%;
}

.builder-section {
  @apply mb-8 p-4 border border-gray-200 rounded-lg bg-white;
}

.section-title {
  @apply text-lg font-semibold text-gray-800 mb-4 flex items-center;
}

.collections-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}

.collection-card {
  @apply p-4 border border-gray-200 rounded-lg cursor-pointer transition-all hover:bg-blue-50;
}

.collection-card.selected {
  @apply border-blue-500 bg-blue-50;
}

.collection-header {
  @apply flex items-center gap-2 mb-2;
}

.collection-name {
  @apply font-medium text-gray-800;
}

.collection-info {
  @apply text-gray-600;
}

.fields-container {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
}

.available-fields, .selected-fields {
  @apply border border-gray-200 rounded-lg p-4;
}

.fields-search {
  @apply mb-4;
}

.collection-fields {
  @apply mb-4;
}

.collection-title {
  @apply text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide;
}

.field-item {
  @apply p-3 border border-gray-200 rounded mb-2 cursor-pointer transition-all hover:bg-gray-50;
}

.field-item.selected {
  @apply border-blue-500 bg-blue-50;
}

.field-info {
  @apply flex items-center;
}

.field-label {
  @apply font-medium;
}

.field-meta {
  @apply mt-1 text-gray-600;
}

.fields-drop-zone {
  @apply min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg p-4;
}

.selected-field-item {
  @apply flex items-center gap-3 p-3 border border-gray-200 rounded-lg mb-3 bg-gray-50;
}

.field-controls {
  @apply flex flex-col gap-1;
}

.field-config {
  @apply flex-1;
}

.field-basic-info {
  @apply flex items-center gap-2 mb-2;
}

.field-label-input {
  @apply flex-1;
}

.field-options {
  @apply flex flex-wrap gap-4;
}

.field-option {
  @apply flex items-center gap-2;
}

.empty-fields {
  @apply text-center py-8 text-gray-500;
}

.filters-container {
  @apply space-y-4;
}

.filter-row {
  @apply flex items-center gap-3 p-3 border border-gray-200 rounded-lg;
}

.filter-field {
  @apply flex-1;
}

.filter-operator {
  @apply w-32;
}

.filter-value {
  @apply flex-1;
}

.filter-logic {
  @apply w-20;
}

.sort-group-container {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
}

.sort-section, .group-section {
  @apply border border-gray-200 rounded-lg p-4;
}

.sort-row {
  @apply flex items-center gap-3 mb-3;
}

.sort-field {
  @apply flex-1;
}

.sort-direction {
  @apply w-32;
}
</style>