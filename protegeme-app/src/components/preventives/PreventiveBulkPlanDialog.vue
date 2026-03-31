<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    header="Planificación masiva de mantenimientos preventivos"
    style="width: min(95vw, 820px)"
    :closable="!saving"
  >
    <div class="bulk-body">

      <!-- PASO 1: Selección de vehículos -->
      <section class="step-card">
        <h3 class="step-title"><span class="step-num">1</span> Seleccionar vehículos</h3>

        <!-- Filtros rápidos -->
        <div class="filter-row">
          <input
            v-model="searchPlaca"
            class="p-inputtext filter-input"
            placeholder="Buscar placa..."
            @input="filterVehicles"
          />
          <select v-model="filterTipo" class="p-inputtext filter-input" @change="filterVehicles">
            <option value="">Todos los tipos</option>
            <option v-for="t in tiposDisponibles" :key="t" :value="t">{{ t }}</option>
          </select>
          <button class="btn-selall" type="button" @click="toggleSelectAll">
            {{ allSelected ? 'Deseleccionar todos' : 'Seleccionar todos' }}
          </button>
        </div>

        <!-- Lista de vehículos -->
        <div class="vehicles-list" v-if="!loadingVehicles">
          <div v-if="!filteredVehicles.length" class="empty-msg">
            No hay vehículos disponibles.
          </div>
          <label
            v-for="v in filteredVehicles"
            :key="v.placa"
            class="vehicle-item"
            :class="{ selected: selectedPlacas.includes(v.placa) }"
          >
            <input type="checkbox" :value="v.placa" v-model="selectedPlacas" />
            <span class="placa-badge">{{ v.placa }}</span>
            <span class="vehicle-info">{{ v.tipo || 'Sin tipo' }} {{ v.modelo ? '· ' + v.modelo : '' }}</span>
          </label>
        </div>
        <div v-else class="loading-vehicles">
          <i class="pi pi-spin pi-spinner" /> Cargando vehículos...
        </div>

        <div class="selected-count">
          {{ selectedPlacas.length }} vehículo(s) seleccionado(s)
        </div>
      </section>

      <!-- PASO 2: Datos del mantenimiento -->
      <section class="step-card">
        <h3 class="step-title"><span class="step-num">2</span> Datos del mantenimiento planeado</h3>

        <div class="info-banner-blue mb-3">
          <i class="pi pi-info-circle" />
          Estos mantenimientos se crearán como <b>planeados</b>. Solo se enviarán a
          Supertransporte cuando sean marcados como ejecutados.
        </div>

        <div class="formgrid grid">
          <!-- Proveedor -->
          <div class="field col-12" v-if="proveedores.length">
            <label>Proveedor (opcional)</label>
            <select class="w-full p-inputtext" v-model="selectedProveedorId" @change="onProveedorChange">
              <option value="">— Seleccionar proveedor —</option>
              <option v-for="p in proveedores" :key="p._id" :value="p._id">
                {{ p.razon_social }} (NIT: {{ p.nit }})
              </option>
            </select>
          </div>

          <div class="field col-12 sm:col-6">
  
            <InputDate v-model="form.fecha" :disabled="saving" />
          </div>

          <div class="field col-12 sm:col-6">
            <InputHour v-model="form.hora" label="Hora planeada" :disabled="saving" />
          </div>

          <div class="field col-12 sm:col-4">
            <label>NIT - Centro especializado <span class="required">*</span></label>
            <InputText
              v-model="form.nit"
              class="w-full"
              inputmode="numeric"
              maxlength="15"
              placeholder="Ej: 900416316"
              @input="form.nit = form.nit.replace(/\D/g, '')"
            />
          </div>

          <div class="field col-12 sm:col-8">
            <label>Razón Social <span class="required">*</span></label>
            <InputText v-model="form.razonSocial" class="w-full" />
          </div>

          <div class="field col-12 sm:col-4">
            <label>Tipo ID – Mecánico <span class="required">*</span></label>
            <UiDropdownBasic v-model="form.tipoIdentificacion" :options="documentTypeOptions" class="w-full" />
          </div>

          <div class="field col-12 sm:col-4">
            <label>Número ID – Mecánico <span class="required">*</span></label>
            <InputText v-model="form.numeroIdentificacion" class="w-full" />
          </div>

          <div class="field col-12 sm:col-4">
            <label>Nombres del mecánico <span class="required">*</span></label>
            <InputText v-model="form.nombresResponsable" class="w-full" />
          </div>

          <div class="field col-12">
            <label>Detalle de actividades <span class="required">*</span></label>
            <Textarea v-model="form.detalleActividades" rows="3" class="w-full" />
          </div>
        </div>
      </section>

      <!-- Progreso -->
      <div v-if="saving" class="progress-bar-wrap">
        <div class="progress-info">
          Creando {{ progress.done }} / {{ progress.total }}...
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressPct + '%' }" />
        </div>
        <div v-if="progress.errors.length" class="progress-errors">
          <b>{{ progress.errors.length }} error(es):</b>
          <span v-for="e in progress.errors" :key="e">{{ e }}</span>
        </div>
      </div>

    </div>

    <template #footer>
      <Button label="Cancelar" class="p-button-text" :disabled="saving" @click="closeDialog" />
      <Button
        :label="`Planear ${selectedPlacas.length} mantenimiento(s)`"
        icon="pi pi-calendar-plus"
        class="btn-dark-green"
        :loading="saving"
        :disabled="saving || !selectedPlacas.length"
        @click="onSave"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch, onMounted } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import UiDropdownBasic from "../ui/Dropdown.vue";
import InputDate from "../ui/InputDate.vue";
import InputHour from "../ui/InputHour.vue";
import { useMaintenanceStore } from "../../stores/maintenanceStore";
import { useVehiclesStore } from "../../stores/vehiclesStore";

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits(["update:visible", "done"]);

const store = useMaintenanceStore();
const vehiclesStore = useVehiclesStore();

const saving = ref(false);
const loadingVehicles = ref(false);
const allVehicles = ref<any[]>([]);
const filteredVehicles = ref<any[]>([]);
const selectedPlacas = ref<string[]>([]);
const proveedores = ref<any[]>([]);
const selectedProveedorId = ref("");

const searchPlaca = ref("");
const filterTipo = ref("");

const progress = reactive({ done: 0, total: 0, errors: [] as string[] });
const progressPct = computed(() =>
  progress.total ? Math.round((progress.done / progress.total) * 100) : 0
);

const tiposDisponibles = computed(() => {
  const set = new Set(allVehicles.value.map((v: any) => v.tipo).filter(Boolean));
  return [...set].sort();
});
const allSelected = computed(
  () => filteredVehicles.value.length > 0 &&
    filteredVehicles.value.every((v: any) => selectedPlacas.value.includes(v.placa))
);

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit("update:visible", val),
});

function filterVehicles() {
  filteredVehicles.value = allVehicles.value.filter((v: any) => {
    const matchPlaca = !searchPlaca.value || v.placa.toLowerCase().includes(searchPlaca.value.toLowerCase());
    const matchTipo = !filterTipo.value || v.tipo === filterTipo.value;
    return matchPlaca && matchTipo;
  });
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedPlacas.value = selectedPlacas.value.filter(
      (p) => !filteredVehicles.value.find((v) => v.placa === p)
    );
  } else {
    const nuevas = filteredVehicles.value.map((v) => v.placa);
    selectedPlacas.value = [...new Set([...selectedPlacas.value, ...nuevas])];
  }
}

function onProveedorChange() {
  const p = proveedores.value.find((x) => x._id === selectedProveedorId.value);
  if (!p) return;
  form.nit = p.nit ?? "";
  form.razonSocial = p.razon_social ?? "";
  if (p.tipo_id_mecanico) form.tipoIdentificacion = Number(p.tipo_id_mecanico);
  form.numeroIdentificacion = p.num_id_mecanico ?? "";
  form.nombresResponsable = p.nombre_mecanico ?? "";
}

const documentTypeOptions = [
  { label: "Cédula de ciudadanía", value: 1 },
  { label: "Cédula de ciudadanía digital", value: 2 },
  { label: "Tarjeta de identidad", value: 3 },
  { label: "Registro civil", value: 4 },
  { label: "Cédula de extranjería", value: 5 },
  { label: "Pasaporte", value: 6 },
  { label: "PEP", value: 7 },
  { label: "DIE", value: 8 },
  { label: "PPT", value: 9 },
];

const emptyForm = () => ({
  fecha: null as Date | null,
  hora: "08:00",
  nit: "",
  razonSocial: "",
  tipoIdentificacion: null as number | null,
  numeroIdentificacion: "",
  nombresResponsable: "",
  detalleActividades: "",
});
const form = reactive(emptyForm());

function validateForm(): boolean {
  if (!selectedPlacas.value.length) { alert("Seleccione al menos un vehículo"); return false; }
  if (!form.fecha) { alert("La fecha planeada es obligatoria"); return false; }
  if (!form.hora) { alert("La hora es obligatoria"); return false; }
  if (!form.nit) { alert("El NIT es obligatorio"); return false; }
  if (!form.razonSocial) { alert("La Razón Social es obligatoria"); return false; }
  if (!form.tipoIdentificacion) { alert("El tipo de identificación es obligatorio"); return false; }
  if (!form.numeroIdentificacion) { alert("El número de identificación es obligatorio"); return false; }
  if (!form.nombresResponsable) { alert("El nombre del mecánico es obligatorio"); return false; }
  if (!form.detalleActividades) { alert("El detalle de actividades es obligatorio"); return false; }
  return true;
}

async function onSave() {
  if (!validateForm()) return;
  saving.value = true;
  progress.done = 0;
  progress.total = selectedPlacas.value.length;
  progress.errors = [];

  for (const placa of selectedPlacas.value) {
    try {
      await store.preventiveCreateDetail({ ...form, placa, isPlanned: true });
    } catch {
      progress.errors.push(placa);
    }
    progress.done++;
  }

  saving.value = false;
  emit("done");
  closeDialog();
}

function resetForm() {
  Object.assign(form, emptyForm());
  selectedProveedorId.value = "";
  selectedPlacas.value = [];
  searchPlaca.value = "";
  filterTipo.value = "";
  progress.done = 0;
  progress.total = 0;
  progress.errors = [];
}

function closeDialog() {
  dialogVisible.value = false;
  resetForm();
}

async function loadData() {
  loadingVehicles.value = true;
  try {
    await vehiclesStore.fetch({ numero_items: 500, page: 1, estado: true });
    allVehicles.value = (vehiclesStore.items ?? []).map((v: any) => ({
      placa: v.placa,
      tipo: v.tipo_vehiculo ?? v.modalidad ?? "",
      modelo: v.modelo ? String(v.modelo) : "",
    })).filter((v: any) => v.placa);
    filteredVehicles.value = [...allVehicles.value];
  } catch {
    allVehicles.value = [];
    filteredVehicles.value = [];
  } finally {
    loadingVehicles.value = false;
  }
  try { proveedores.value = await store.proveedoresFetch(); } catch { proveedores.value = []; }
}

watch(() => props.visible, (val) => { if (val) loadData(); else resetForm(); });
onMounted(() => { if (props.visible) loadData(); });
</script>

<style scoped>
.bulk-body { display: flex; flex-direction: column; gap: 1.25rem; }

.step-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
  background: #fff;
}
.step-title {
  font-size: 1rem;
  font-weight: 700;
  color: #111;
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.step-num {
  background: #2563eb;
  color: #fff;
  border-radius: 50%;
  width: 22px; height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  align-items: center;
}
.filter-input { flex: 1; min-width: 130px; font-size: 0.88rem; }
.btn-selall {
  padding: 0.4rem 0.8rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.83rem;
  white-space: nowrap;
}
.btn-selall:hover { background: #e5e7eb; }

.vehicles-list {
  max-height: 220px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding-right: 0.25rem;
}
.vehicle-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.12s;
  font-size: 0.88rem;
}
.vehicle-item:hover { background: #f0f9ff; }
.vehicle-item.selected { background: #eff6ff; border-color: #93c5fd; }
.placa-badge {
  font-weight: 700;
  background: #1e40af;
  color: #fff;
  border-radius: 5px;
  padding: 0.1rem 0.45rem;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
}
.vehicle-info { color: #6b7280; font-size: 0.83rem; }
.empty-msg { color: #9ca3af; font-size: 0.9rem; padding: 1rem; text-align: center; }
.loading-vehicles { color: #6b7280; padding: 1rem; text-align: center; }
.selected-count {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #2563eb;
  font-weight: 600;
}

.info-banner-blue {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 0.6rem 1rem;
  color: #1e40af;
  font-size: 0.88rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.required { color: #ef4444; }

.progress-bar-wrap {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}
.progress-info { font-size: 0.88rem; margin-bottom: 0.4rem; color: #374151; }
.progress-track { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: #16a34a; transition: width 0.3s; }
.progress-errors { margin-top: 0.5rem; font-size: 0.82rem; color: #dc2626; display: flex; flex-wrap: wrap; gap: 0.3rem; }

:deep(.p-button.btn-dark-green) { background: #16a34a; border-color: #16a34a; color: #fff; }
</style>
