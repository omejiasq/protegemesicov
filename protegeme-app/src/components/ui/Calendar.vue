<script setup lang="ts">
const props = defineProps<{
  modelValue: string | null
  disabled?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [string | null]
}>()

const update = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value || null)
}
</script>

<template>
  <input
    type="date"
    class="ui-calendar"
    :value="modelValue || ''"
    :disabled="disabled"
    :placeholder="placeholder"
    @input="update"
  />
</template>

<style scoped>
.ui-calendar {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid var(--surface-border, #ccc);
  border-radius: 6px;
  background: var(--surface-card, #fff);
  color: var(--text-color, #333);
  font-size: 0.9rem;
}
.ui-calendar:focus {
  border-color: var(--primary-color, #007ad9);
  box-shadow: 0 0 0 1px var(--primary-color, #007ad9);
  outline: none;
}
</style>
