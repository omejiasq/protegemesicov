<template>
  <div :style="{ width }">
    <label class="block mb-2" for="input-hour">Hora</label>
    <Calendar
      v-model="calendarValue"
      timeOnly
      hourFormat="24"
      :stepHour="step"
      :stepMinute="step"
      :readonlyInput="readonlyInput"
      :placeholder="placeholder"
      :disabled="disabled"
      :showIcon="showIcon"
      :panelStyleClass="'ih-panel'"
      @show="bindCenterClick"
      @hide="unbindCenterClick"
      @change="onChange"
      class="w-full"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import Calendar from "primevue/calendar";
import type { PropType } from "vue";

const props = defineProps({
  modelValue: {
    type: [String, Date] as PropType<string | Date | null>,
    default: null,
  },
  width: { type: String, default: "100%" },
  placeholder: { type: String, default: "Seleccionar hora" },
  disabled: { type: Boolean, default: false },
  readonlyInput: { type: Boolean, default: true },
  showIcon: { type: Boolean, default: true },
  step: { type: Number, default: 1 },
  // 'date' -> emite Date; 'hh:mm' -> emite string "HH:mm"
  emitAs: { type: String as PropType<"date" | "hh:mm">, default: "date" },
});

const emit = defineEmits<{
  (e: "update:modelValue", value: Date | string | null): void;
  (e: "change", ev: any): void;
}>();

const calRef = ref<any>(null);
let centerClickHandler: ((e: MouseEvent) => void) | null = null;

function bindCenterClick() {
  const panel = document.querySelector<HTMLElement>(".ih-panel");
  if (!panel) return;

  centerClickHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".p-timepicker")) {
      // intenta primero la API pública; si no, busca el input
      const input =
        (calRef.value?.input as HTMLInputElement | undefined) ??
        (calRef.value?.$el?.querySelector("input") as HTMLInputElement | null);

      if (input) {
        input.focus();
        if (typeof input.select === "function") input.select();
      }
    }
  };

  panel.addEventListener("click", centerClickHandler); // ahora compila
}

function unbindCenterClick() {
  const panel = document.querySelector<HTMLElement>(".ih-panel");
  if (panel && centerClickHandler) {
    panel.removeEventListener("click", centerClickHandler);
  }
  centerClickHandler = null;
}

onBeforeUnmount(unbindCenterClick);

const calendarValue = ref<Date | null>(null);

// Normaliza modelValue (Date | "HH:mm" | ISO | null) a Date | null
function parseToDate(v: any): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const m = v.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (m) {
      const d = new Date();
      d.setHours(Number(m[1]), Number(m[2]), 0, 0);
      return d;
    }
    const d2 = new Date(v);
    return isNaN(d2.getTime()) ? null : d2;
  }
  const d3 = new Date(v);
  return isNaN(d3.getTime()) ? null : d3;
}

watch(
  () => props.modelValue,
  (v) => {
    calendarValue.value = parseToDate(v);
  },
  { immediate: true }
);

watch(calendarValue, (d) => {
  if (!d) {
    emit("update:modelValue", null);
    return;
  }
  if (props.emitAs === "hh:mm") {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    emit("update:modelValue", `${hh}:${mm}`);
  } else {
    emit("update:modelValue", d);
  }
});

function onChange(e: any) {
  emit("change", e);
}
</script>

<style scoped>
.w-full {
  width: 100%;
}
</style>
