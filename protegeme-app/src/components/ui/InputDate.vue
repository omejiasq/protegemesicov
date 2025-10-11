<template>
  <div :style="{ width }">
    <label class="block mb-2" for="input-date">Fecha</label>
    <Calendar
      v-model="calendarValue"
      dateFormat="dd/mm/yy"
      :readonlyInput="readonlyInput"
      :placeholder="placeholder"
      :disabled="disabled"
      :showIcon="showIcon"
      :monthNavigator="monthNavigator"
      :yearNavigator="yearNavigator"
      :yearRange="yearRange"
      @change="onChange"
      class="w-full"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Calendar from 'primevue/calendar';
import type { PropType } from 'vue';

/**
 * InputDate:
 * - calendarValue: Date | null -> cumple con el tipo que espera PrimeVue Calendar
 * - props.modelValue puede ser Date | string | null (se acepta string por compat)
 * - emitAs: 'date' | 'string' -> controla cómo se emite update:modelValue
 */

const props = defineProps({
  modelValue: { type: [Object, String, Date] as PropType<Date | string | null>, default: null },
  width: { type: String, default: '100%' },
  placeholder: { type: String, default: 'Seleccionar fecha' },
  disabled: { type: Boolean, default: false },
  readonlyInput: { type: Boolean, default: true },
  showIcon: { type: Boolean, default: true },
  monthNavigator: { type: Boolean, default: false },
  yearNavigator: { type: Boolean, default: false },
  yearRange: { type: String, default: '2000:2030' },
  emitAs: { type: String as PropType<'date' | 'string'>, default: 'date' }, // por defecto emitimos Date
});

const emit = defineEmits(['update:modelValue', 'change']);

// Valor que realmente le pasamos al Calendar (Date | null)
const calendarValue = ref<Date | null>(null);

// util: parsear strings comunes a Date
function parseToDate(v: any): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    // ISO-like
    const iso = /^\d{4}-\d{2}-\d{2}/;
    const ddmmy = /^\d{2}\/\d{2}\/\d{4}$/;
    if (iso.test(v)) return new Date(v);
    if (ddmmy.test(v)) {
      const parts = v.split('/');
      const day = Number(parts[0]), month = Number(parts[1]) - 1, year = Number(parts[2]);
      return new Date(year, month, day);
    }
    // fallback
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

watch(
  () => props.modelValue,
  (v) => {
    calendarValue.value = parseToDate(v);
  },
  { immediate: true }
);

// cuando cambia el calendarValue emitimos según emitAs
watch(calendarValue, (v) => {
  if (props.emitAs === 'string') {
    emit('update:modelValue', v ? v.toISOString() : null);
  } else {
    emit('update:modelValue', v);
  }
});

function onChange(e: any) {
  emit('change', e);
}
</script>

<style scoped>
.w-full { width: 100%; }
.text-900 {
  color: #111827;
}

</style>