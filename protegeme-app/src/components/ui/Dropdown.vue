<script setup lang="ts">
import { ref } from 'vue'

type Option = { label: string; value: string | number }

const props = defineProps<{
  modelValue: string | number | null
  options: Option[]
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [string | number | null]
}>()

const isOpen = ref(false)

const toggle = () => { if (!props.disabled) isOpen.value = !isOpen.value }
const select = (opt: Option) => {
  emit('update:modelValue', opt.value)
  isOpen.value = false
}
</script>

<template>
  <div class="ui-dropdown" :class="{ disabled }">
    <div class="ui-dropdown-display" @click="toggle">
      <span>{{ options.find(o => o.value === modelValue)?.label || placeholder || 'Seleccione' }}</span>
      <span class="arrow">▼</span>
    </div>
    <ul v-if="isOpen" class="ui-dropdown-panel">
      <li
        v-for="opt in options"
        :key="opt.value"
        @click="select(opt)"
        :class="{ selected: opt.value === modelValue }"
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
