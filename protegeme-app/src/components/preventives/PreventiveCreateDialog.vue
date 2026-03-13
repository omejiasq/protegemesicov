<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    header="Nuevo preventivo"
    class="w-11 md:w-8 lg:w-7"
    :closable="!saving"
  >
    <div class="formgrid grid">

      <!-- SELECTOR DE PROVEEDOR -->
      <div class="field col-12" v-if="proveedores.length">
        <label>Proveedor (opcional — autocompletar datos del centro)</label>
        <select class="w-full p-inputtext" v-model="selectedProveedorId" @change="onProveedorChange">
          <option value="">— Seleccionar proveedor —</option>
          <option v-for="p in proveedores" :key="p._id" :value="p._id">
            {{ p.razon_social }} (NIT: {{ p.nit }})
          </option>
        </select>
      </div>

      <!-- FILA 1 -->
      <div class="field col-12 sm:col-4">
        <label>Placa</label>
        <InputText
          v-model="form.placa"
          class="w-full"
          maxlength="6"
          placeholder="ABC123"
          :disabled="saving"
          @keyup.enter="buscarVehiculoPorPlaca"
        />
      </div>

      <div class="field col-12 sm:col-4">
        <InputDate
          v-model="form.fecha"
          :disabled="saving"
        />
      </div>

      <div class="field col-12 sm:col-4">
        <InputHour
          v-model="form.hora"
          label="Hora"
          :disabled="saving"
        />
      </div>

      <!-- FILA 2 -->
      <div class="field col-12 sm:col-4">
        <label>NIT - Centro especializado</label>
        <InputText
          v-model="form.nit"
          class="w-full"
          :disabled="saving"
          inputmode="numeric"
          maxlength="15"
          placeholder="Ej: 900416316"
          @input="form.nit = form.nit.replace(/\D/g, '')"
        />
      </div>

      <div class="field col-12 sm:col-8">
        <label>Razón Social - Centro especializado</label>
        <InputText v-model="form.razonSocial" class="w-full" :disabled="saving" />
      </div>

      <!-- FILA 3 -->
      <div class="field col-12 md:col-4">
        <label>Tipo identificación – Ingeniero mecánico</label>
        <UiDropdownBasic
          v-model="form.tipoIdentificacion"
          :options="documentTypeOptions"
          class="w-full"
          :disabled="saving"
        />
      </div>

      <div class="field col-12 md:col-4">
        <label>Número identificación – Ingeniero mecánico</label>
        <InputText v-model="form.numeroIdentificacion" class="w-full" :disabled="saving" />
      </div>

      <div class="field col-12 md:col-4">
        <label>Nombres y apellidos – Ingeniero mecánico</label>
        <InputText v-model="form.nombresResponsable" class="w-full" :disabled="saving" />
      </div>

      <!-- FILA FINAL -->
      <div class="field col-12">
        <label>Detalle de actividades</label>
        <Textarea
          v-model="form.detalleActividades"
          rows="4"
          class="w-full"
          :disabled="saving"
        />
      </div>
    </div>

    <template #footer>
      <Button
        label="Cancelar"
        class="p-button-text"
        :disabled="saving"
        @click="closeDialog"
      />
      <Button
        label="Crear"
        icon="pi pi-save"
        class="btn-dark-green"
        :loading="saving"
        :disabled="saving"
        @click="onSave"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { reactive, computed, watch, ref, onMounted } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import UiDropdownBasic from "../ui/Dropdown.vue";
import InputDate from "../../components/ui/InputDate.vue";
import InputHour from "../../components/ui/InputHour.vue";
import { useMaintenanceStore } from "../../stores/maintenanceStore";

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits(["update:visible", "save"]);

const saving = ref(false);
const store = useMaintenanceStore();
const proveedores = ref<any[]>([]);
const selectedProveedorId = ref("");

const dialogVisible = computed({
  get: () => props.visible,
  set: (val: boolean) => emit("update:visible", val),
});

function onProveedorChange() {
  if (!selectedProveedorId.value) return;
  const p = proveedores.value.find((x) => x._id === selectedProveedorId.value);
  if (!p) return;
  form.nit = p.nit ?? "";
  form.razonSocial = p.razon_social ?? "";
  if (p.tipo_id_mecanico) form.tipoIdentificacion = Number(p.tipo_id_mecanico);
  form.numeroIdentificacion = p.num_id_mecanico ?? "";
  form.nombresResponsable = p.nombre_mecanico ?? "";
}

function validateForm(): boolean {
  const required: { field: keyof typeof form; label: string }[] = [
    { field: 'placa', label: 'Placa' },
    { field: 'fecha', label: 'Fecha' },
    { field: 'hora', label: 'Hora' },
    { field: 'nit', label: 'NIT' },
    { field: 'razonSocial', label: 'Razón Social' },
    { field: 'tipoIdentificacion', label: 'Tipo de identificación' },
    { field: 'numeroIdentificacion', label: 'Número de identificación' },
    { field: 'nombresResponsable', label: 'Nombres y apellidos' },
    { field: 'detalleActividades', label: 'Detalle de actividades' },
  ]

  for (const { field, label } of required) {
    const val = form[field]
    if (val === null || val === undefined || String(val).trim() === '') {
      alert(`El campo "${label}" es obligatorio`)
      return false
    }
  }
  return true
}

async function buscarVehiculoPorPlaca() {
  if (!form.placa) return;

  const placa = form.placa.trim().toUpperCase();
  form.placa = placa;

  try {
    const token = localStorage.getItem("token2");

    const response = await fetch(
      `https://sicov.protegeme.com.co/api/vehicles/vehicles/plate/${placa}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) throw new Error("Vehículo no encontrado");

    const vehiculo = await response.json();

    // Solo auto-completar si no se seleccionó un proveedor
    if (!selectedProveedorId.value) {
      form.nit =
        vehiculo?.enterprise?.specialized_center_document_number || "";

      form.razonSocial =
        vehiculo?.enterprise?.specialized_center_name || "";

      const docType = vehiculo?.enterprise?.mechanic_document_type;
      form.tipoIdentificacion =
        docType !== undefined && docType !== null
          ? Number(docType)
          : null;

      form.numeroIdentificacion =
        vehiculo?.enterprise?.mechanic_document_number || "";

      form.nombresResponsable =
        vehiculo?.enterprise?.mechanic_name || "";
    }

  } catch (error) {
    console.error(error);

    if (!selectedProveedorId.value) {
      form.nit = "";
      form.razonSocial = "";
      form.tipoIdentificacion = null;
      form.numeroIdentificacion = "";
      form.nombresResponsable = "";
    }
  }
}

const documentTypeOptions = [
  { label: "Cédula de ciudadanía", value: 1 },
  { label: "Cédula de ciudadanía digital", value: 2 },
  { label: "Tarjeta de identidad", value: 3 },
  { label: "Registro civil", value: 4 },
  { label: "Cédula de extranjería", value: 5 },
  { label: "Pasaporte", value: 6 },
  { label: "Permiso Especial de Permanencia (PEP)", value: 7 },
  { label: "Documento de Identificación Extranjero (DIE)", value: 8 },
  { label: "Permiso por Protección Temporal (PPT)", value: 9 },
];

const emptyForm = () => ({
  placa: "",
  fecha: null as Date | null,
  hora: "",
  nit: "",
  razonSocial: "",
  tipoIdentificacion: null as number | null,
  numeroIdentificacion: "",
  nombresResponsable: "",
  detalleActividades: "",
});

const form = reactive(emptyForm());

function resetForm() {
  Object.assign(form, emptyForm());
  selectedProveedorId.value = "";
}

function closeDialog() {
  dialogVisible.value = false;
  resetForm();
}

async function onSave() {
  if (!validateForm()) return

  saving.value = true;

  await emit("save", { ...form });

  saving.value = false;
}

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      try {
        proveedores.value = await store.proveedoresFetch();
      } catch {
        proveedores.value = [];
      }
    } else {
      resetForm();
    }
  }
);

onMounted(async () => {
  try {
    proveedores.value = await store.proveedoresFetch();
  } catch {
    proveedores.value = [];
  }
});
</script>
