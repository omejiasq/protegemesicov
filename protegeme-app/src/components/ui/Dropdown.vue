<script setup lang="ts">
import { ref, computed } from 'vue'

type Option = { label: string; value?: string | number | null } // value omitido/null = “Todos”

const props = defineProps<{
  modelValue: string | number | null | undefined
  options: readonly Option[]                // acepta readonly sin problemas
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string | number | null): void
}>()

/** Normaliza cualquier valor al formato que ProgramView espera:
 * - '' | undefined -> null (equivale a “Todos”)
 * - '1'/'2'/'3' -> 1/2/3 (numérico)
 * - string no numérica -> string tal cual
 * - number -> number
 * - null -> null
 */
function normalize(v: unknown): string | number | null {
  if (v === '' || v === undefined || v === null) return null
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const t = v.trim()
    if (t === '') return null
    const n = Number(t)
    return Number.isFinite(n) && String(n) === t ? n : t
  }
  return null
}

function same(a: unknown, b: unknown): boolean {
  return normalize(a) === normalize(b)
}

// Clon local si el template necesita iterables mutables
const opts = computed<Option[]>(() => [...props.options])

// Valor actual normalizado (para comparar y mostrar)
const current = computed<string | number | null>(() => normalize(props.modelValue))

// Label seleccionado o placeholder
const selectedLabel = computed<string>(() => {
  const found = opts.value.find(o => same(o.value ?? null, current.value))
  return found?.label ?? props.placeholder ?? 'Seleccione'
})

// Apertura/cierre
const isOpen = ref(false)
function toggle() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}
function close() {
  isOpen.value = false
}

// Selección de opción
function select(opt: Option) {
  const v = normalize(opt.value ?? null)
  emit('update:modelValue', v)  // siempre emite string | number | null
  close()
}
</script>

<template>
  <div class="ui-dropdown" :class="{ disabled }">
    <div class="ui-dropdown-display" @click="toggle">
      <span>{{ selectedLabel }}</span>
      <span class="arrow">▼</span>
    </div>

    <ul v-if="isOpen" class="ui-dropdown-panel">
      <li
        v-for="opt in opts"
        :key="String(opt.value ?? 'all') + ':' + opt.label"
        @click="select(opt)"
        :class="{ selected: same(opt.value ?? null, current) }"
      >
        {{ opt.label }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ui-dropdown {
  position: relative;
  width: 100%;
  cursor: pointer;
  font-size: 0.9rem;
}
.ui-dropdown.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ui-dropdown-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem;
  border: 1px solid var(--surface-border, #ccc);
  border-radius: 6px;
  background: var(--surface-card, #fff);
  color: var(--text-color, #333);
}
.ui-dropdown-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  border: 1px solid var(--surface-border, #ccc);
  background: var(--surface-card, #fff);
  border-radius: 6px;
  margin-top: 2px;
  list-style: none;
  padding: 0;
  z-index: 100;
}
.ui-dropdown-panel li {
  padding: 0.6rem;
}
.ui-dropdown-panel li:hover {
  background: var(--surface-100, #f0f0f0);
}
.ui-dropdown-panel li.selected {
  background: var(--primary-color, #007ad9);
  color: #fff;
}
.arrow {
  margin-left: 0.5rem;
}
</style>
