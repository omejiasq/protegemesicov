<script setup lang="ts">
import { reactive, ref, onMounted, watch } from "vue";
import { useToast } from "primevue/usetoast";
import InputText from "primevue/inputtext";
import Calendar from "primevue/calendar";
import Button from "primevue/button";
import UiDropdownBasic from "../components/ui/Dropdown.vue"; // dropdown claro
import { useVehiclesStore } from "../stores/vehiclesStore";

const props = defineProps<{ id: string | null }>();
const emit = defineEmits<{ (e: "saved"): void; (e: "cancel"): void }>();

const toast = useToast();
const store = useVehiclesStore();
const loading = ref(false);

const form = reactive<any>({
  placa: "",
  clase: null as number | null,
  nivelServicio: null as number | null,
  soat: "", // <-- string (NO objeto)
  fechaVencimientoSoat: "", // <-- string "YYYY-MM-DD" o Date
});

// Opciones: valores NUMÉRICOS (el backend espera number)
const claseOptions = [
  { label: "1", value: 1 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
];
const nivelServicioOptions = [
  { label: "1", value: 1 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
];

// -------- Helpers --------
function toIntOrUndef(v: any): number | undefined {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function normDate(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  try {
    const d = v as Date;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
}

// -------- Carga en edición --------
async function load() {
  if (!props.id) return;
  loading.value = true;
  try {
    const v = await store.get(props.id);
    Object.assign(form, {
      placa: v?.placa ?? "",
      clase: toIntOrUndef(v?.clase) ?? null,
      nivelServicio: toIntOrUndef(v?.nivelServicio) ?? null,
      // si viene objeto viejo en soat, se ignora para el input
      soat: typeof v?.soat === "string" ? v.soat : "",
      // soporta nuevo y viejo
      fechaVencimientoSoat: v?.fechaVencimientoSoat
        ? String(v.fechaVencimientoSoat).slice(0, 10)
        : typeof v?.soat === "object" && v?.soat?.fechaVencimiento
        ? String(v.soat.fechaVencimiento).slice(0, 10)
        : "",
    });
  } finally {
    loading.value = false;
  }
}

// -------- Guardar (payload = Postman) --------
async function save() {
  loading.value = true;
  try {
    const payload: any = {
      placa: form.placa?.trim(),
      clase: toIntOrUndef(form.clase),
      nivelServicio: toIntOrUndef(form.nivelServicio),
      soat: form.soat?.trim() || undefined, // string o se omite
      fechaVencimientoSoat: normDate(form.fechaVencimientoSoat), // "YYYY-MM-DD" o ""
    };

    // limpiamos indefinidos/vacíos para no mandar basura
    Object.keys(payload).forEach((k) => {
      if (payload[k] === "" || payload[k] === undefined) delete payload[k];
    });

    if (props.id) {
      await store.update(props.id, payload);
      toast.add({
        severity: "success",
        summary: "Guardado",
        detail: "Vehículo actualizado",
        life: 2500,
      });
    } else {
      await store.create(payload);
      toast.add({
        severity: "success",
        summary: "Creado",
        detail: "Vehículo creado",
        life: 2500,
      });
    }
    emit("saved");
  } catch (e: any) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: e?.response?.data?.message || "Revisá los datos",
      life: 4000,
    });
  } finally {
    loading.value = false;
  }
}

function cancel() {
  emit("cancel");
}

onMounted(load);
watch(() => props.id, load);
</script>

<template>
  <div class="col-12 md:col-4">
    <label class="block mb-2">Placa</label>
    <InputText
      v-model="form.placa"
      class="w-full pv-light"
      placeholder="ABC123"
    />
  </div>

  <!-- Clase (numérico) -->
  <div class="col-12 md:col-4">
    <label class="block mb-2">Clase</label>
    <UiDropdownBasic
      v-model="form.clase"
      :options="claseOptions"
      placeholder="Seleccioná clase"
      class="w-full pv-light"
    />
  </div>

  <!-- Nivel de servicio (numérico) -->
  <div class="col-12 md:col-4">
    <label class="block mb-2">Nivel de servicio</label>
    <UiDropdownBasic
      v-model="form.nivelServicio"
      :options="nivelServicioOptions"
      placeholder="Seleccioná nivel"
      class="w-full pv-light"
    />
  </div>

  <!-- SOAT -->
  <div class="col-12 md:col-4">
    <label class="block mb-2">SOAT</label>
    <InputText
      v-model="form.soat"
      class="w-full pv-light"
      placeholder="SOAT-123"
    />
  </div>

  <!-- Vencimiento SOAT -->
  <div class="col-12 md:col-4">
    <label class="block mb-2">Vencimiento SOAT</label>
    <Calendar
      v-model="form.fechaVencimientoSoat"
      dateFormat="yy-mm-dd"
      showIcon
      class="w-full pv-light"
      appendTo="self"
    />
  </div>
  <div>
    <div class="col-12 mt-3 flex justify-content-end gap-2">
      <Button
        label="Cancelar"
        class="p-button-text"
        @click="cancel"
        :disabled="loading"
      />
      <Button
        :label="props.id ? 'Guardar' : 'Crear'"
        icon="pi pi-save"
        @click="save"
        :loading="loading"
      />
    </div>
  </div>
</template>
