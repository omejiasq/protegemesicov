<template>
  <div class="p-inputgroup" :style="{ width: width || '100%' }">
    <span class="p-input-icon-left w-full" style="flex: 1 1 520px">
        <i class="pi pi-search" />
        <InputText
          v-model="internalValue"
          :placeholder="placeholder"
          @keyup.enter="onSearch"
          :aria-label="ariaLabel"
          class="w-full"
        />
    </span>
  </div>
</template>

        
<script setup lang="ts">
import { ref, watch } from 'vue';
import InputText from 'primevue/inputtext';

defineOptions({ name: 'SearchBar' });

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  width: { type: String, default: '100%' },
  placeholder: { type: String, default: 'Buscar...' },
  icon: { type: String, default: 'pi pi-search' },
  hideButton: { type: Boolean, default: false },
  tooltip: { type: String, default: '' },
  ariaLabel: { type: String, default: 'search' },
});

const emits = defineEmits(['update:modelValue', 'search']);

const internalValue = ref(String(props.modelValue ?? ''));

watch(
  () => props.modelValue,
  (v) => {
    internalValue.value = String(v ?? '');
  }
);

watch(internalValue, (v) => {
  emits('update:modelValue', v);
});

function onSearch() {
  emits('search', internalValue.value);
}
</script>

<style scoped>
/* Mantener look similar al resto del proyecto */
.p-inputgroup {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
</style>