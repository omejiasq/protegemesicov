<template>
  <Button
    :label="label"
    :icon="icon"
    :class="classes"
    :type="type"
    :disabled="disabled"
    @click="$emit('click', $event)"
  />
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import { computed } from 'vue';
import type { PropType } from 'vue';

const props = defineProps({
  label: { type: String, default: '' },
  icon: { type: String, default: '' },
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  flat: { type: Boolean, default: false },
  // aca definimos la union que PrimeVue espera
  type: { type: String as PropType<'button' | 'submit' | 'reset'>, default: 'button' },
  disabled: { type: Boolean, default: false },
  extraClass: { type: String, default: '' },
});

const emits = defineEmits(['click']);

const classes = computed(() => {
  const base = ['app-btn', props.flat ? 'p-button-text' : 'p-button'];
  const variantMap: any = {
    primary: 'btn-dark-green',
    danger: 'btn-danger',
    neutral: 'btn-neutral',
  };
  const v = variantMap[props.variant] ?? props.variant;
  return [...base, v, props.extraClass].join(' ');
});
</script>

<style scoped>
.app-btn { border-radius: 6px; padding: 0.5rem 0.75rem; }
.btn-dark-green { background: #0f5132; border: none; color: white; }
.btn-danger { background: #c92a2a; color: white; }
.btn-neutral { background: #6b7280; color: white; }
</style>