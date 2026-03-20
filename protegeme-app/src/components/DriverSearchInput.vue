<template>
  <div class="driver-search" ref="container">

    <!-- Conductor seleccionado → chip -->
    <div v-if="selected" class="driver-chip">
      <div class="chip-info">
        <span class="chip-name">{{ selected.nombre }}</span>
        <span class="chip-doc">Doc: {{ selected.documentNumber }}</span>
      </div>
      <button type="button" class="chip-clear" @click="clearSelection" title="Quitar conductor">✕</button>
    </div>

    <!-- Campo de búsqueda (visible cuando no hay selección) -->
    <div v-else class="search-box">
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        :placeholder="placeholder"
        autocomplete="off"
        @input="onQueryInput"
        @focus="openDropdown"
        @keydown.escape="closeDropdown"
        @keydown.down.prevent="moveCursor(1)"
        @keydown.up.prevent="moveCursor(-1)"
        @keydown.enter.prevent="confirmCursor"
      />
      <span v-if="query" class="search-icon-clear" @click="query = ''; filtered = []">✕</span>
    </div>

    <!-- Dropdown de resultados -->
    <ul
      v-if="open && filtered.length > 0"
      class="driver-dropdown"
      @mousedown.prevent
    >
      <li
        v-for="(d, i) in filtered"
        :key="d._id"
        :class="['driver-option', { active: i === cursor }]"
        @click="selectDriver(d)"
        @mouseover="cursor = i"
      >
        <span class="opt-name">{{ d.nombre }}</span>
        <span class="opt-doc">{{ d.documentNumber }}</span>
      </li>
    </ul>

    <div v-else-if="open && query.length >= 1 && filtered.length === 0" class="no-results">
      Sin resultados para "{{ query }}"
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

interface DriverOption {
  _id: string
  nombre: string
  documentNumber: string
}

const props = defineProps<{
  modelValue: string | null
  drivers: DriverOption[]
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string | null): void
}>()

const query    = ref('')
const open     = ref(false)
const cursor   = ref(-1)
const filtered = ref<DriverOption[]>([])
const selected = ref<DriverOption | null>(null)
const container = ref<HTMLElement | null>(null)
const inputRef  = ref<HTMLInputElement | null>(null)

// Cuando cambia el modelValue desde afuera (p.ej. al cargar el vehículo en edición)
watch(
  () => props.modelValue,
  (id) => {
    if (!id) { selected.value = null; return }
    const found = props.drivers.find(d => d._id === id)
    if (found) selected.value = found
  },
  { immediate: true }
)

// También buscar cuando la lista de drivers se cargue por primera vez
watch(
  () => props.drivers,
  (list) => {
    if (props.modelValue && !selected.value) {
      const found = list.find(d => d._id === props.modelValue)
      if (found) selected.value = found
    }
  }
)

function onQueryInput() {
  cursor.value = -1
  const q = query.value.trim().toLowerCase()
  if (!q) { filtered.value = []; open.value = false; return }
  filtered.value = props.drivers.filter(d =>
    d.documentNumber.toLowerCase().includes(q) ||
    d.nombre.toLowerCase().includes(q)
  ).slice(0, 20)
  open.value = true
}

function openDropdown() {
  if (query.value.trim()) onQueryInput()
}

function closeDropdown() {
  open.value = false
  cursor.value = -1
}

function moveCursor(dir: number) {
  if (!open.value || filtered.value.length === 0) return
  cursor.value = (cursor.value + dir + filtered.value.length) % filtered.value.length
}

function confirmCursor() {
  if (cursor.value >= 0 && filtered.value[cursor.value]) {
    selectDriver(filtered.value[cursor.value])
  }
}

function selectDriver(d: DriverOption) {
  selected.value = d
  emit('update:modelValue', d._id)
  query.value = ''
  filtered.value = []
  open.value = false
  cursor.value = -1
}

function clearSelection() {
  selected.value = null
  emit('update:modelValue', null)
  query.value = ''
  filtered.value = []
  open.value = false
}

// Cerrar dropdown al hacer clic fuera
function onClickOutside(e: MouseEvent) {
  if (container.value && !container.value.contains(e.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.driver-search {
  position: relative;
  width: 100%;
}

/* ── Chip de conductor seleccionado ── */
.driver-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #eff6ff;
  border: 1px solid #93c5fd;
  border-radius: 10px;
  padding: 8px 12px;
  min-height: 42px;
}

.chip-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.chip-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e40af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-doc {
  font-size: 11px;
  color: #3b82f6;
}

.chip-clear {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
  margin-left: 8px;
  border-radius: 4px;
  flex-shrink: 0;
}
.chip-clear:hover { background: #fee2e2; color: #dc2626; }

/* ── Caja de búsqueda ── */
.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box input {
  width: 100%;
  height: 42px;
  padding: 8px 32px 8px 12px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-box input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.search-icon-clear {
  position: absolute;
  right: 10px;
  color: #9ca3af;
  cursor: pointer;
  font-size: 12px;
  user-select: none;
}
.search-icon-clear:hover { color: #374151; }

/* ── Dropdown ── */
.driver-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  list-style: none;
  margin: 0;
  padding: 4px 0;
  z-index: 100;
  max-height: 220px;
  overflow-y: auto;
}

.driver-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 14px;
  cursor: pointer;
  gap: 8px;
  font-size: 13px;
}

.driver-option:hover,
.driver-option.active {
  background: #eff6ff;
}

.opt-name {
  font-weight: 500;
  color: #1f2937;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.opt-doc {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  flex-shrink: 0;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

/* ── Sin resultados ── */
.no-results {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: #6b7280;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  z-index: 100;
}
</style>
