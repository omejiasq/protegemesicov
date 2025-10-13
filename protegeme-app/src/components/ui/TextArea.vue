<template>
  <div :style="{ width }" class="white-input-wrapper">
    <label v-if="label" class="label">{{ label }}</label>
    <Textarea
      v-model="localValue"
      :placeholder="placeholder"
      :rows="rows"
      :cols="cols"
      :disabled="disabled"
      :autoResize="autoResize"
      :class="computedClass"
      @input="onInput"
      @change="onChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Textarea } from "primevue";

const props = defineProps({
  modelValue: { type: [String, null], default: "" },
  placeholder: { type: String, default: "" },
  rows: { type: [Number, String], default: 4 },
  cols: { type: [Number, String], default: 30 },
  width: { type: String, default: "100%" },
  disabled: { type: Boolean, default: false },
  autoResize: { type: Boolean, default: true },
  label: { type: String, default: "" },
  extraClass: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue", "input", "change"]);

const localValue = computed({
  get: () => props.modelValue ?? "",
  set: (v: any) => {
    emit("update:modelValue", v);
    emit("input", v);
  },
});

const computedClass = computed(() => {
  return ["white-textarea", props.extraClass].filter(Boolean).join(" ");
});

function onInput(e: any) {
  // PrimeVue already updates v-model; re-emit for consistency
  emit("input", e);
}

function onChange(e: any) {
  emit("change", e);
}
</script>

<style scoped>
.white-input-wrapper { display:block; }
.label { display:block; margin-bottom: 0.35rem; color: #111827; font-weight: 500; }

/* Forzar fondo blanco al textarea de PrimeVue */
.white-textarea :deep(.p-inputtextarea) {
  background-color: #ffffff !important;
  color: #111111 !important;
  border-radius: 0.375rem;
  border: 1px solid #e6e6e6;
  padding: 0.5rem 0.75rem;
  box-shadow: none !important;
  resize: vertical; /* allow vertical resize if needed */
}

/* focus */
.white-textarea :deep(.p-inputtextarea:focus) {
  outline: none;
  border-color: #7dd3fc;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.08);
}

/* Ensure autoResize doesn't overflow container */
.white-textarea :deep(.p-inputtextarea) {
  max-height: 40vh;
}

.textarea-white{
  color: black !important;
}

.textarea-white ::v-deep(textarea),
.textarea-white ::v-deep(.p-inputtextarea),
.textarea-white ::v-deep(.ui-textarea) {
  background: #ffffff !important;
  color: #000000 !important;
  caret-color: #000000 !important;
  box-sizing: border-box;
  width: 100% !important;
  border: 1px solid #dcdcdc !important; /* opcional: borde claro para contraste */
}

/* placeholder más suave pero legible */
.textarea-white ::v-deep(textarea)::placeholder,
.textarea-white ::v-deep(.p-inputtextarea)::placeholder,
.textarea-white ::v-deep(.ui-textarea)::placeholder {
  color: #6b6b6b !important;
}

/* Ajuste de padding/margen para que visualmente queden alineados */
.field { margin-bottom: 1rem; }
.card { padding: 1rem; }
</style>
