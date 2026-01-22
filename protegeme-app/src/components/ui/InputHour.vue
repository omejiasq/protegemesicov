<template>
  <div class="field">
    <label v-if="label" class="block mb-1">{{ label }}</label>

    <input
      type="time"
      class="p-inputtext w-full input-hour"
      :disabled="disabled"
      v-model="timeValue"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  modelValue: Date | null;
  label?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: Date | null): void;
}>();

/**
 * Convierte Date <-> HH:mm
 */
const timeValue = computed({
  get() {
    if (!(props.modelValue instanceof Date)) return "";
    const hh = String(props.modelValue.getHours()).padStart(2, "0");
    const mm = String(props.modelValue.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  },
  set(val: string) {
    if (!val) {
      emit("update:modelValue", null);
      return;
    }
    const [h, m] = val.split(":").map(Number);
    const d = props.modelValue instanceof Date
      ? new Date(props.modelValue)
      : new Date();
    d.setHours(h, m, 0, 0);
    emit("update:modelValue", d);
  },
});
</script>

<style scoped>
.input-hour {
  height: 44px;
  font-size: 1rem;
}
</style>
