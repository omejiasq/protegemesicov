<template>
  <div :style="{ width }" class="white-input-wrapper">
    <label v-if="label" class="label">{{ label }}</label>
    <InputText
      v-bind="inputAttrs"
      v-model="localValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="computedClass"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { InputText } from "primevue";

const props = defineProps({
  modelValue: { type: [String, null], default: "" },
  placeholder: { type: String, default: "" },
  width: { type: String, default: "100%" },
  disabled: { type: Boolean, default: false },
  label: { type: String, default: "" },
  extraClass: { type: String, default: "" },
  type: { type: String, default: "text" }, // passthrough if needed
});

const emit = defineEmits(["update:modelValue", "input", "change"]);

const localValue = computed({
  get: () => props.modelValue ?? "",
  set: (v: any) => {
    emit("update:modelValue", v);
    emit("input", v);
  },
});

const inputAttrs = computed(() => ({
  // primevue InputText will receive these
  type: props.type,
}));

const computedClass = computed(() => {
  return ["white-input", props.extraClass].filter(Boolean).join(" ");
});

watch(
  () => props.modelValue,
  (v) => {
    // keep in sync if external changes
  }
);
</script>

<style scoped>
.white-input-wrapper { display: block; }
.label { display:block; margin-bottom: 0.35rem; color: #111827; font-weight: 500; }

.white-input{
  background-color: #ffffff !important;
  color: #111111 !important;
  border-radius: 0.375rem;
  border: 1px solid #e6e6e6;
  padding: 0.7rem 0.75rem;
  box-shadow: none !important;
}

.white-input :deep(.p-inputtext) {
  background-color: #ffffff !important;
  color: #111111 !important;
  border-radius: 0.375rem;
  border: 1px solid #e6e6e6;
  padding: 0.5rem 0.75rem;
  box-shadow: none !important;
}

/* focus state */
.white-input :deep(.p-inputtext:focus) {
  outline: none;
  border-color: #7dd3fc;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.08);
}



/* allow passing extraClass to modify width/appearance externally */
</style>