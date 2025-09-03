<script setup lang="ts">
import { reactive, ref, onMounted, watch } from "vue";
import { useToast } from "primevue/usetoast";
import InputText from "primevue/inputtext";
import Calendar from "primevue/calendar";
import Checkbox from "primevue/checkbox";
import Textarea from "primevue/textarea";
import Button from "primevue/button";
import Divider from "primevue/divider";
import { useDriversStore } from "../stores/driversStore";
import UiDropdownBasic from "../components/ui/Dropdown.vue";

const props = defineProps<{ id: string | null }>();
const emit = defineEmits<{ (e: "saved"): void; (e: "cancel"): void }>();
const toast = useToast();
const store = useDriversStore();
console.log(store.items)
const loading = ref(false);
const form = reactive<any>({
  documento: "",
  nombres: "",
  apellidos: "",
  telefono: "",
  correo: "",
  estado: true,
  licencia: { numero: "", categoria: "", fechaVencimiento: "" },
  alcoholimetria: { fecha: "", resultado: "" },
  examenMedico: { fecha: "", apto: true },
  observaciones: "",
  idDespacho: "",
  tipoIdentificacionPrincipal: "CC",
});

const categorias = [
  { label: "A1", value: "A1" },
  { label: "A2", value: "A2" },
  { label: "B1", value: "B1" },
];

// normaliza Date | string -> 'YYYY-MM-DD' | ''
function normDate(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  try {
    const yyyy = v.getFullYear(),
      mm = String(v.getMonth() + 1).padStart(2, "0"),
      dd = String(v.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
}

async function load() {
  if (!props.id) return;
  loading.value = true;
  try {
    const d = await store.get(props.id);
    Object.assign(form, {
      // mapeo desde los nombres que devuelve tu backend
      documento: d.numeroIdentificacion ?? "",
      nombres: d.primerNombrePrincipal ?? "",
      apellidos: d.primerApellidoPrincipal ?? "",
      telefono: d.telefono ?? "",
      correo: d.correo ?? "",
      estado: d.estado ?? true,
      licencia: {
        // backend guarda número como "licenciaConduccion"
        numero: d.licenciaConduccion || "",
        categoria: d.licencia?.categoria || "",
        // backend guarda fecha como "licenciaVencimiento"
        fechaVencimiento: d.licenciaVencimiento
          ? String(d.licenciaVencimiento).slice(0, 10)
          : "",
      },
      alcoholimetria: {
        fecha: d.alcoholimetria?.fecha || "",
        resultado: d.alcoholimetria?.resultado || "",
      },
      examenMedico: {
        fecha: d.examenMedico?.fecha || "",
        apto: d.examenMedico?.apto ?? true,
      },
      observaciones: d.observaciones || "",
      idDespacho: d.idDespacho ?? "",
      tipoIdentificacionPrincipal:
        d.tipoIdentificacionPrincipal ?? form.tipoIdentificacionPrincipal,
    });
  } finally {
    loading.value = false;
  }
}

async function save() {
  loading.value = true;
  try {
    // construimos payload con las claves que valida el backend
    const payload = {
      // identificación principal (contrato backend)
      tipoIdentificacionPrincipal: form.tipoIdentificacionPrincipal ?? "CC",
      numeroIdentificacion: form.documento?.trim(),
      primerNombrePrincipal: form.nombres?.trim(),
      primerApellidoPrincipal: form.apellidos?.trim(),

      telefono: form.telefono || null,
      correo: form.correo || null,
      estado: !!form.estado,

      // licencia: plano, no anidado (backend: licenciaConduccion + licenciaVencimiento)
      licenciaConduccion: form.licencia?.numero?.trim() || null,
      licenciaVencimiento: normDate(form.licencia?.fechaVencimiento),

      // resto igual a tu código
      alcoholimetria: {
        fecha: normDate(form.alcoholimetria?.fecha),
        resultado: form.alcoholimetria?.resultado || null,
      },
      examenMedico: {
        fecha: normDate(form.examenMedico?.fecha),
        apto: !!form.examenMedico?.apto,
      },
      observaciones: form.observaciones || "",
    };

    if (props.id) {
      await store.update(props.id, payload);
      toast.add({
        severity: "success",
        summary: "Guardado",
        detail: "Conductor actualizado",
        life: 2500,
      });
    } else {
      await store.create(payload);
      toast.add({
        severity: "success",
        summary: "Creado",
        detail: "Conductor creado",
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
  <div class="form-light">
    <div class="grid">
      <div class="col-12 md:col-4">
        <label class="block mb-2">Documento</label>
        <InputText v-model="form.documento" class="w-full" />
      </div>
      <div class="col-12 md:col-4">
        <label class="block mb-2">Nombres</label>
        <InputText v-model="form.nombres" class="w-full" />
      </div>
      <div class="col-12 md:col-4">
        <label class="block mb-2">Apellidos</label>
        <InputText v-model="form.apellidos" class="w-full" />
      </div>

      <div class="col-12 md:col-4">
        <label class="block mb-2">Teléfono</label>
        <InputText v-model="form.telefono" class="w-full" />
      </div>
      <div class="col-12 md:col-4">
        <label class="block mb-2">Correo</label>
        <InputText v-model="form.correo" class="w-full" />
      </div>
      <div class="col-12 md:col-4 flex align-items-center gap-2">
        <Checkbox v-model="form.estado" :binary="true" inputId="chkEstado" />
        <label for="chkEstado">Activo</label>
      </div>

      <Divider class="col-12">Licencia</Divider>

      <div class="col-12 md:col-4">
        <label class="block mb-2">Número</label>
        <InputText v-model="form.licencia.numero" class="w-full" />
      </div>
      <div class="col-12 md:col-4">
        <label class="block mb-2">Categoría</label>
        <UiDropdownBasic
          v-model="form.licencia.categoria"
          :options="categorias"
          placeholder="Seleccione"
        />
      </div>
      <div class="col-12 md:col-4">
        <label class="block mb-2">Vencimiento</label>
        <Calendar
          v-model="form.licencia.fechaVencimiento"
          dateFormat="yy-mm-dd"
          showIcon
          class="w-full pv-light"
          appendTo="self"
        />
      </div>

      <Divider class="col-12">Alcoholimetría</Divider>

      <div class="col-12 md:col-6">
        <label class="block mb-2">Fecha</label>
        <Calendar
          v-model="form.alcoholimetria.fecha"
          dateFormat="yy-mm-dd"
          showIcon
          class="w-full pv-light"
          appendTo="self"
        />
      </div>
      <div class="col-12 md:col-6">
        <label class="block mb-2">Resultado</label>
        <InputText
          v-model="form.alcoholimetria.resultado"
          class="w-full"
          placeholder="NEGATIVO / POSITIVO"
        />
      </div>

      <Divider class="col-12">Examen Médico</Divider>

      <div class="col-12 md:col-6">
        <label class="block mb-2">Fecha</label>
        <Calendar
          v-model="form.examenMedico.fecha"
          dateFormat="yy-mm-dd"
          showIcon
          class="w-full pv-light"
          appendTo="self"
        />
      </div>
      <div class="col-12 md:col-6 flex align-items-center gap-2">
        <Checkbox
          v-model="form.examenMedico.apto"
          :binary="true"
          inputId="chkApto"
        />
        <label for="chkApto">Apto</label>
      </div>

      <div class="col-12">
        <label class="block mb-2">Observaciones</label>
        <Textarea v-model="form.observaciones" class="w-full" rows="3" />
      </div>

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
  </div>
</template>
<style scoped>
.form-light :deep(.pv-light.p-dropdown),
.form-light :deep(.pv-light .p-dropdown-label),
.form-light :deep(.pv-light .p-dropdown-trigger) {
  background: floralwhite !important;
  color: var(--text-color) !important;
  border: 1px solid var(--surface-border) !important;
}
.form-light :deep(.pv-light .p-dropdown-trigger) {
  color: var(--text-color-secondary) !important;
  border-left: 1px solid var(--surface-border) !important;
}

.form-light :deep(.pv-light.p-calendar .p-inputtext),
.form-light :deep(.pv-light .p-inputtext),
.form-light :deep(.pv-light .p-datepicker-trigger),
.form-light :deep(.pv-light .p-button.p-button-icon-only),
.form-light :deep(.pv-light .p-inputgroup-addon) {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
  border: 1px solid var(--surface-border) !important;
}

.form-light :deep(.pv-light .p-datepicker) {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
  border: 1px solid var(--surface-border) !important;
}

.form-light .checkbox-row {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.form-light :deep(.p-checkbox .p-checkbox-box) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.form-light :deep(.p-dropdown),
.form-light :deep(.p-dropdown .p-dropdown-label),
.form-light :deep(.p-dropdown .p-inputtext),
.form-light :deep(.p-dropdown .p-dropdown-trigger) {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
  border: 1px solid var(--surface-border) !important;
}
.form-light :deep(.p-dropdown .p-dropdown-trigger) {
  color: var(--text-color-secondary) !important;
  border-left: 1px solid var(--surface-border) !important;
}
/* Panel del dropdown (por si aparecía oscuro) */
.form-light :deep(.p-dropdown-panel),
.form-light :deep(.p-dropdown-items),
.form-light :deep(.p-dropdown-item) {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
}

/* Calendars (Licencia, Alcoholimetría, Examen Médico) */
.form-light :deep(.p-calendar),
.form-light :deep(.p-calendar .p-inputtext),
.form-light :deep(.p-calendar .p-button.p-button-icon-only),
.form-light :deep(.p-calendar .p-datepicker-trigger),
.form-light :deep(.p-inputgroup-addon),
.form-light :deep(.p-calendar .p-inputgroup-addon) {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
  border: 1px solid var(--surface-border) !important;
}
/* Panel emergente del datepicker */
.form-light :deep(.p-datepicker) {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
  border: 1px solid var(--surface-border) !important;
}

/* “Modo filled” de PrimeVue (si estuviera activo en el body) — neutralizado aquí */
.form-light :deep(.p-input-filled .p-dropdown),
.form-light :deep(.p-input-filled .p-dropdown .p-dropdown-label),
.form-light :deep(.p-input-filled .p-dropdown .p-inputtext),
.form-light :deep(.p-input-filled .p-dropdown .p-dropdown-trigger),
.form-light :deep(.p-input-filled .p-calendar .p-inputtext),
.form-light :deep(.p-input-filled .p-calendar .p-datepicker-trigger),
.form-light :deep(.p-input-filled .p-inputgroup-addon),
.form-light :deep(.p-input-filled .p-calendar .p-inputgroup-addon) {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
  border: 1px solid var(--surface-border) !important;
}

/* Focus consistente */
.form-light :deep(.p-dropdown:focus-within),
.form-light :deep(.p-calendar .p-inputtext:enabled:focus) {
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 1px var(--primary-color) !important;
}

/* Centrado vertical del checkbox + mantiene el verde cuando está marcado */
.form-light :deep(.p-checkbox) {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}
.form-light :deep(.p-checkbox .p-checkbox-box) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.form-light :deep(.pv-light *),
.form-light :deep(.pv-light) {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
}

.form-light :deep(.p-inputtext),
.form-light :deep(textarea),
.form-light :deep(.p-dropdown),
.form-light :deep(.p-calendar .p-inputtext),
.form-light :deep(.p-inputgroup > .p-inputgroup-addon),
.form-light :deep(.p-calendar .p-inputgroup-addon),
.form-light :deep(.p-dropdown .p-dropdown-trigger) {
  border: 1px solid var(--surface-border) !important;
}

/* 2) Panel del DROPDOWN (lista) claro */
.form-light :deep(.p-dropdown-panel) {
  background: var(--surface-card) !important;
  border: 1px solid var(--surface-border) !important;
}
.form-light :deep(.p-dropdown-items) {
  background: var(--surface-card) !important;
}
.form-light :deep(.p-dropdown-item) {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
}
.form-light :deep(.p-dropdown-item:not(.p-highlight):not(.p-disabled):hover) {
  background: var(--surface-100) !important;
  color: var(--text-color) !important;
}
.form-light :deep(.p-dropdown-item.p-highlight) {
  background: var(--primary-color) !important;
  color: #fff !important;
}

/* 3) Panel del CALENDAR (datepicker) claro */
.form-light :deep(.p-datepicker) {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
  border: 1px solid var(--surface-border) !important;
}
.form-light :deep(.p-datepicker-header) {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
  border-bottom: 1px solid var(--surface-border) !important;
}
.form-light :deep(.p-datepicker-calendar td > span) {
  background: var(--surface-card) !important;
  color: var(--text-color) !important;
}
.form-light :deep(.p-datepicker-calendar td > span:hover) {
  background: var(--surface-100) !important;
}
.form-light :deep(.p-datepicker-calendar td > span.p-highlight) {
  background: var(--primary-color) !important;
  color: #fff !important;
}
</style>
