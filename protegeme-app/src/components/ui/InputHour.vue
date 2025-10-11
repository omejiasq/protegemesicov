<template>
  <div :style="{ width }">
    <label class="block mb-2" for="input-hour">Hora</label>
    <Calendar
      v-model="calendarValue"
      timeOnly
      hourFormat="24"
      :stepMinute="step"
      :readonlyInput="readonlyInput"
      :placeholder="placeholder"
      :disabled="disabled"
      :showIcon="showIcon"
      @change="onChange"
      class="w-full"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Calendar from 'primevue/calendar';
import type { PropType } from 'vue';

const props = defineProps({
  modelValue: { type: [String, Object, Date] as PropType<string | Date | null>, default: null },
  width: { type: String, default: '100%' },
  placeholder: { type: String, default: 'Seleccionar hora' },
  disabled: { type: Boolean, default: false },
  readonlyInput: { type: Boolean, default: true },
  showIcon: { type: Boolean, default: true },
  step: { type: Number, default: 15 },
  emitAs: { type: String as PropType<'date' | 'hh:mm'>, default: 'date' }, // por defecto Date
});

const emit = defineEmits(['update:modelValue', 'change']);

const calendarValue = ref<Date | null>(null);

// parsea HH:mm o Date o null a Date
function parseToDate(v: any): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    // si es "HH:mm" creamos una Date con hoy + esa hora
    const hhmm = /^(\d{1,2}):(\d{2})$/;
    if (hhmm.test(v)) {
      const parts = v.split(':').map(Number);
      const d = new Date();
      d.setHours(parts[0], parts[1], 0, 0);
      return d;
    }
    // si es ISO, intentar parsear
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

// cuando cambia calendarValue emitimos Date o 'HH:mm' string según emitAs
watch(calendarValue, (d) => {
  if (!d) {
    emit('update:modelValue', null);
    return;
  }
  if (props.emitAs === 'hh:mm') {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    emit('update:modelValue', `${hh}:${mm}`);
  } else {
    emit('update:modelValue', d);
  }
});

function onChange(e: any) { emit('change', e); }
</script>

<style scoped>
.w-full { width: 100%; }
</style>