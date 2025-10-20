<template>
  <div class="bolt-wrap">
    <!-- Encabezado -->
    <div class="bolt-toolbar bolt-card">
      <div class="left">
        <h2 class="title">Mantenimientos — Preventivos</h2>
        <p class="subtitle">Listado y alta de preventivos</p>
      </div>
      <div class="right">
        <Button
          label="Nuevo Preventivo"
          icon="pi pi-plus"
          class="btn-dark-green"
          @click="openCreate"
        />
      </div>
    </div>

    <!-- Filtros -->
    <div class="bolt-card p-3">
      <div class="formgrid grid align-items-end">
        <!-- Input búsqueda -->
        <div class="col-10 flex align-items-center gap-3">
          <SearchBar
            v-model="filters.placa"
            :width="'700px'"
            @search="refresh"
          />
          <div class="filters-actions">
            <Button
              label="Buscar"
              icon="pi pi-search"
              class="btn-filter"
              :loading="loading"
              @click="refresh"
            />
            <Button
              label="Limpiar"
              icon="pi pi-times"
              class="btn-clear"
              @click="clearFilters"
            />
          </div>
        </div>

        <!-- Botones alineados a la misma altura -->
        <div class="field col-12 md:col-2 flex align-items-end"></div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="bolt-card p-3">
      <DataTable
        :value="tableRows"
        :loading="loading"
        dataKey="_id"
        responsive-layout="scroll"
        :paginator="true"
        :rows="limit"
        :totalRecords="total"
        :first="(page - 1) * limit"
        @page="onPage"
        class="p-datatable-sm"
      >
        <Column
          field="detalleActividades"
          header="Descripcion"
          style="min-width: 240px"
        />
        <Column field="placa" header="Placa" />
        <Column header="Fecha">
          <template #body="{ data }">{{
            fmtDate(data.fecha || data.createdAt)
          }}</template>
        </Column>
        <Column field="nombresResponsable" header="Responsable" />
        <Column header="Estado" style="width: 140px">
          <template #body="{ data }">
            <Tag
              :value="data.estado === false ? 'INACTIVO' : 'ACTIVO'"
              :severity="data.estado === false ? 'danger' : 'success'"
            />
          </template>
        </Column>
        <Column header="Acciones" style="width: 160px">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button
                icon="pi pi-eye"
                class="btn-icon-white statebutton"
                :disabled="saving || loading"
                @click="openViewEnlistment(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="dlg.visible"
      :modal="true"
      header="Nuevo preventivo"
      class="w-11 md:w-7 lg:w-6"
      @hide="resetForm"
    >
      <div
        class="formgrid grid dialog-body"
        :class="{ 'is-view-mode': viewMode }"
      >
        <div class="field col-6 md:col-3">
          <label class="block mb-2 text-900">Placa</label>
          <InputText v-model="form.placa" class="w-full" :disabled="viewMode" />
        </div>
        <div class="field col-6 md:col-3">
          <InputDate
            v-model="form.fecha"
            :width="'100%'"
            :disabled="viewMode"
          />
        </div>

        <div class="field col-6 md:col-3">
          <InputHour v-model="form.hora" :width="'100%'" :disabled="viewMode" />
        </div>
        <div class="field col-6 md:col-3">
          <label class="block mb-2 text-900" :disabled="viewMode">NIT</label>
          <InputText
            v-model="form.nit"
            class="w-full"
            placeholder="7007007007"
            :disabled="viewMode"
          />
        </div>
        <div class="field col-12 md:col-6">
          <label class="block mb-2 text-900">Razón Social</label>
          <InputText
            v-model="form.razonSocial"
            class="w-full"
            :disabled="viewMode"
          />
        </div>

        <div class="field col-6 md:col-3">
          <label class="block mb-2 text-900">Tipo identificación</label>
          <UiDropdownBasic
            v-model="form.tipoIdentificacion"
            :options="documentTypeOptions"
            placeholder="Seleccione"
            class="w-full"
            :disabled="viewMode"
          />
        </div>
        <div class="field col-6 md:col-3">
          <label class="block mb-2 text-900">Número Identificación</label>
          <InputText
            v-model="form.numeroIdentificacion"
            class="w-full"
            placeholder="12345678"
            :disabled="viewMode"
          />
        </div>
        <div class="field col-12 md:col-6">
          <label class="block mb-2 text-900">Nombres Responsable</label>
          <InputText
            v-model="form.nombresResponsable"
            class="w-full"
            placeholder="Juan Pérez"
            :disabled="viewMode"
          />
        </div>

        <div class="field col-12">
          <label class="block mb-2 text-900">Detalle Actividades</label>
          <Textarea
            v-model="form.detalleActividades"
            rows="3"
            autoResize
            class="w-full"
            :disabled="viewMode"
          />
        </div>
        <div class="field col-12 md:col-6">
          <label class="block mb-2 text-900">Programa (adjuntar archivo)</label>
          <input
            type="file"
            accept=".pdf,.xlsx,.png,.jpg,.jpeg"
            @change="onFileChange"
          />
          <small class="text-600"
            >Máx 5MB. Se crea “programa” automáticamente.</small
          >
        </div>
      </div>
      <template #footer>
        <div class="flex justify-content-end gap-2">
          <Button
            label="Cerrar"
            class="p-button-text"
            @click="dlg.visible = false"
          />
          <Button
            v-if="!viewMode"
            label="Crear"
            icon="pi pi-save"
            class="btn-dark-green"
            :loading="saving"
            type="button"
            @click="save"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch } from "vue";
import { useMaintenanceStore } from "../../stores/maintenanceStore";

import InputText from "primevue/inputtext";
import Calendar from "primevue/calendar";
import Textarea from "primevue/textarea";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Dialog from "primevue/dialog";
import { useToast } from "primevue/usetoast";

import UiDropdownBasic from "../../components/ui/Dropdown.vue";
import InputDate from "../../components/ui/InputDate.vue";
import InputHour from "../../components/ui/InputHour.vue";
import Button from "../../components/ui/Button.vue";
import SearchBar from "../../components/ui/SearchBar.vue";

const toast = useToast();

const store = useMaintenanceStore();

const selectedFile = ref<File | null>(null);

function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] || null;
  selectedFile.value = f;
}

const isEditing = ref(false); // true cuando abrís "Editar"
const suppressDuplicateCheck = ref(false);
const editingId = ref<string | null>(null);
/** Estado */
const page = ref(1);
const limit = ref(10);
const filters = reactive({
  mantenimientoId: "",
  placa: "",
});

const documentTypeOptions = [
  { label: "Cédula de ciudadanía", value: 1 },
  { label: "Cédula de ciudadanía digital", value: 2 },
  { label: "Tarjeta de identidad", value: 3 },
  { label: "Registro civil", value: 4 },
  { label: "Cédula de extranjería", value: 5 },
  { label: "Pasaporte", value: 6 },
  { label: "Permiso Especial de Permanencia (PEP)", value: 7 },
  { label: "Documento de Identificación Extranjero (DIE)", value: 8 },
];

/** Store computeds (preventivo) */
const items = computed(() => store.preventiveList.items);

const total = computed(() => store.preventiveList.total);
const loading = computed(() => store.preventiveList.loading);

const tableRows = computed(() => {
  const src = items.value || [];
  console.log(src);
  return src.map((r: any) => {
    const m = r.mantenimiento || r.maintenance || {};
    const estadoBool =
      typeof r.estado === "boolean"
        ? r.estado
        : r.estado === "ACTIVO" || r.estado === 1 || r.estado === "1";
    return {
      _id: r._id,
      placa: r.placa ?? m.placa ?? "",
      fecha: r.fecha ?? r.createdAt ?? null,
      createdAt: r.createdAt ?? null,
      nombresResponsable: r.nombresResponsable ?? r.responsable ?? "",
      estado: estadoBool,
      ...r, // mantengo el resto por si lo necesitás en Acciones/Detalle
    };
  });
});

/** Utils */
function normDate(v: any): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v.slice(0, 10);
  try {
    const d = new Date(v);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return undefined;
  }
}

function normTime(v: any): string | undefined {
  console.log('%cprotegeme-app\src\views\maintenance\Preventive.vue:311 v', 'color: #007acc;', v);
  if (!v) return undefined;
  try {
    if (v instanceof Date) {
      const hh = String(v.getHours()).padStart(2, "0");
      const mm = String(v.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
    // acepta HH:mm o HH:mm:ss
    const m = String(v).match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (m) {
      const hh = String(m[1]).padStart(2, "0");
      return `${hh}:${m[2]}`;
    }
    return undefined;
  } catch {
    return undefined;
  }
}


function toIntOrUndef(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function clean<T extends Record<string, any>>(obj: T) {
  const out: any = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === "" || v === null || v === undefined) return;
    out[k] = v;
  });
  return out;
}
function fmtDate(s?: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return s;
  }
}

/** Fetch */
async function refresh() {
  const params: any = { page: page.value, limit: limit.value };
  if (
    filters.placa &&
    typeof filters.placa === "string" &&
    filters.placa.trim()
  ) {
    params.plate = filters.placa.trim(); // el store lo mapea a 'placa'
  }
  await store.preventiveFetchList(params);
}

const viewMode = ref(false);
const dialogTitle = computed(() =>
  viewMode.value ? "Detalle de alistamiento" : "Nuevo alistamiento"
);

function clearFilters() {
  filters.mantenimientoId = "";
  page.value = 1;
  refresh();
}
function onPage(e: any) {
  page.value = Math.floor(e.first / e.rows) + 1;
  limit.value = e.rows;
  refresh();
}
async function onFilterPick(val: any) {
  filters.mantenimientoId =
    typeof val === "object"
      ? val?._id || val?.value || val?.id || ""
      : val || "";
  console.log("onFilterPick", val, filters.mantenimientoId);
  await onSearch();
}

function formatMaintLabel(m: any) {
  const placa = (m?.placa || "").toString().toUpperCase();
  const tipo = m?.tipoId ?? "-";
  // podés enriquecer el label si querés (ej. empresa, estado, etc.)
  return `${placa || "(sin placa)"} — Tipo ${tipo}`;
}

const maintenanceOpts = computed(() =>
  (store.maintenanceList.items || [])
    .filter((m: any) => Number(m?.tipoId) === 1) // ← SOLO preventivos
    .map((m: any) => ({
      label: formatMaintLabel(m),
      value: m?._id, // importante: enviar el _id como mantenimientoId
    }))
);

async function ensureMaintenances() {
  await store.maintenanceFetchList({ page: 1, limit: 100, tipoId: 1 });
}

function onPickMaintenance(id: string | number | null) {
  if (!id) return;
  const m = store.maintenanceList.items.find((x: any) => x._id === id);
  if (m) {
    // autocompletá lo que te sirva para el preventivo
    form.placa = m.placa || "";
    // si tu esquema lo permite:
    form.nit = m.vigiladoId ? String(m.vigiladoId) : "";
    // podés setear otros campos si aplica…
  }
}

function openEdit(row: any) {
  isEditing.value = true;
  editingId.value = row?._id || null;
  form.placa = row?.placa ?? form.placa;
  form.fecha = row?.fecha ? new Date(row.fecha) : form.fecha; // si ya usás Date
  form.hora = row?.hora ?? form.hora;
  form.nit = row?.nit ?? form.nit;
  form.razonSocial = row?.razonSocial ?? form.razonSocial;
  form.tipoIdentificacion = row?.tipoIdentificacion ?? form.tipoIdentificacion;
  form.numeroIdentificacion =
    row?.numeroIdentificacion ?? form.numeroIdentificacion;
  form.nombresResponsable = row?.nombresResponsable ?? form.nombresResponsable;
  form.detalleActividades = row?.detalleActividades ?? form.detalleActividades;

  dlg.visible = true; // reutilizo TU mismo Dialog
}

// Guardar cambios en modo edición (NO reemplaza tu save() de crear)
async function saveEdit() {
  if (!editingId.value) return;
  const payload = clean({
    placa: form.placa?.trim(),
    fecha: normDate(form.fecha),
    hora: normTime(form.hora),
    nit: toIntOrUndef(form.nit),
    razonSocial: form.razonSocial?.trim(),
    tipoIdentificacion: toIntOrUndef(form.tipoIdentificacion),
    numeroIdentificacion: form.numeroIdentificacion?.trim(),
    nombresResponsable: form.nombresResponsable?.trim(),
    detalleActividades: form.detalleActividades?.trim(),
  });

  saving.value = true;
  suppressDuplicateCheck.value = true;
  try {
    // (opcional) limpia error viejo por las dudas
    store.preventive.error = "";
    await store.preventiveUpdateDetail(editingId.value, payload);
    // ...tu lógica actual (toast/refresh/cerrar)
  } finally {
    suppressDuplicateCheck.value = false;
  }
}

// Activar/Desactivar
async function toggle(id: string) {
  suppressDuplicateCheck.value = true;
  try {
    store.preventive.error = "";
    await store.preventiveToggle(id);
    // ...tu lógica actual (toast/refresh)
  } finally {
    suppressDuplicateCheck.value = false;
  }
}

/** Crear */
const dlg = reactive({ visible: false });
watch(
  () => dlg.visible,
  (v) => {
    if (v) ensureMaintenances();
    if (!v) viewMode.value = false;
  }
);
const form = reactive({
  placa: "",
  fecha: null as any,
  hora: null as any, // ← antes era ""
  nit: "",
  razonSocial: "",
  tipoIdentificacion: "",
  numeroIdentificacion: "",
  nombresResponsable: "",
  detalleActividades: "",
});

const fileInputRef = ref<HTMLInputElement | null>(null);

function resetForm() {
  Object.assign(form, {
    placa: "",
    fecha: null as any,
    hora: null as any,
    nit: "",
    razonSocial: "",
    tipoIdentificacion: "",
    numeroIdentificacion: "",
    nombresResponsable: "",
    detalleActividades: "",
  });
  selectedFile.value = null;
  if (fileInputRef.value) fileInputRef.value.value = "";
}


const saving = ref(false);

function openCreate() {
  Object.assign(form, {
    placa: "",
    fecha: null,
    hora: "",
    nit: "",
    razonSocial: "",
    tipoIdentificacion: "",
    numeroIdentificacion: "",
    nombresResponsable: "",
    detalleActividades: "",
  });
  dlg.visible = true;
  ensureMaintenances();
}

const preventiveOptsLoading = ref(false);
// Add this computed property for the dropdown options
const preventiveFilterOpts = computed(() => {
  // Use all maintenance options for filtering
  return maintenanceOpts.value;
});

async function ensurePreventiveOpts() {
  if (!store.preventiveList?.items?.length) {
    preventiveOptsLoading.value = true;
    try {
      await store.preventiveFetchList({ page: 1, limit: 500 });
    } finally {
      preventiveOptsLoading.value = false;
    }
  }
}

async function fetchEnlistmentById(id: string) {
  if (typeof (store as any).enlistmentGetDetail === "function") {
    return await (store as any).enlistmentGetDetail(id);
  }
  const local = (store.enlistmentList.items || []).find(
    (x: any) => x?._id === id
  );
  if (local) return local;
  await store.enlistmentFetchList({ id });
  return (
    (store.enlistmentList.items || []).find((x: any) => x?._id === id) || null
  );
}

function fillFormFromRow(row: any) {
  form.placa = row?.placa ?? "";
  form.fecha = row?.fecha ?? null;
  form.hora = row?.hora ?? null;
  form.tipoIdentificacion = row?.tipoIdentificacion ?? "";
  form.numeroIdentificacion = row?.numeroIdentificacion ?? "";
  form.nombresResponsable = row?.nombresResponsable ?? "";
  form.detalleActividades = row?.detalleActividades ?? "";
}

async function openViewEnlistment(row: any) {
  viewMode.value = true;
  const id = row?._id;
  const full = id ? await fetchEnlistmentById(id) : row;
  fillFormFromRow(full || row);
  dlg.visible = true;
}

console.log('%cprotegeme-app\src\views\maintenance\Preventive.vue:566 form.hora', 'color: #007acc;', form);

async function save() {
  const payload = clean({
    placa: form.placa?.trim(),
    fecha: normDate(form.fecha),
    hora: normTime(form.hora), // <- si ya aplicaste el time picker
    nit: toIntOrUndef(form.nit),
    razonSocial: form.razonSocial?.trim(),
    tipoIdentificacion: toIntOrUndef(form.tipoIdentificacion),
    numeroIdentificacion: form.numeroIdentificacion?.trim(),
    nombresResponsable: form.nombresResponsable?.trim(),
    detalleActividades: form.detalleActividades?.trim(),
  });
  console.log('%cprotegeme-app\src\views\maintenance\Preventive.vue:575 payload', 'color: #007acc;', payload);



  saving.value = true;
  try {
  if (selectedFile.value) {
    await store.createPreventiveWithProgram({
      maintenancePayload: payload,
      file: selectedFile.value,
    });
  } else {
    await store.preventiveCreateDetail(payload);
  }
    await ensureMaintenances(); // 🔁 repuebla el dropdown
    await refresh();
    dlg.visible = false;
    await refresh();

    // Feedback OK
    toast?.add?.({
      severity: "success",
      summary: "Preventivo creado",
      detail: "Se guardó correctamente.",
      life: 2500,
    });
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "No se pudo crear el preventivo";

    // Caso duplicado / ya existe
    if (status === 409 || /existe/i.test(msg) || /duplic/i.test(msg)) {
      toast?.add?.({
        severity: "warn",
        summary: "Preventivo ya existente",
        detail: "Ya existe un preventivo para esta transacción.",
        life: 4000,
      });
    } else {
      // Otros errores
      toast?.add?.({
        severity: "error",
        summary: "Error al crear",
        detail: msg,
        life: 4000,
      });
    }

    // No cierres el modal en error
    return;
  } finally {
    saving.value = false;
  }
}

/** Init */
onMounted(() => {
  ensurePreventiveOpts();
  refresh();
  ensureMaintenances();
});
function onSearch() {
  page.value = 1;
  refresh();
}
</script>

<style scoped>
.bolt-wrap {
  display: grid;
  gap: 1rem;
}

/* Cards claras con sombra suave */
.bolt-card {
  background: #ffffff !important;
  color: #111111 !important;
  border: 1px solid rgba(17, 17, 17, 0.06);
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(17, 17, 17, 0.05);
}

/* Toolbar */
.bolt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
}
.bolt-toolbar .title {
  margin: 0;
  font-weight: 700;
}
.bolt-toolbar .subtitle {
  margin: 0.125rem 0 0;
  color: #6b7280;
  font-size: 0.9rem;
}

/* Input con ícono dentro */
:deep(.p-input-icon-left) {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 100%;
}
:deep(.p-input-icon-left > i) {
  position: absolute;
  left: 0.75rem;
}
:deep(.p-input-icon-left .p-inputtext) {
  padding-left: 2.5rem;
  background: #fff !important;
  color: #111 !important;
}

/* DataTable en blanco: cabecera, filas y paginador */
.bolt-card :deep(.p-datatable),
.bolt-card :deep(.p-datatable-wrapper),
.bolt-card :deep(.p-datatable-header),
.bolt-card :deep(.p-datatable-thead > tr > th),
.bolt-card :deep(.p-datatable-tbody > tr),
.bolt-card :deep(.p-datatable-tbody > tr > td),
.bolt-card :deep(.p-paginator),
.bolt-card :deep(.p-paginator .p-paginator-pages .p-paginator-page),
.bolt-card :deep(.p-paginator .p-paginator-prev),
.bolt-card :deep(.p-paginator .p-paginator-next),
.bolt-card :deep(.p-paginator .p-paginator-first),
.bolt-card :deep(.p-paginator .p-paginator-last) {
  background: #ffffff !important;
  color: #111111 !important;
  border-color: rgba(17, 17, 17, 0.06) !important;
}

/* Dialog claro: textos en negro */
:deep(.p-dialog) {
  color: #111 !important;
}
:deep(.p-dialog .p-dialog-header),
:deep(.p-dialog .p-dialog-content),
:deep(.p-dialog .p-dialog-footer) {
  background: #fff !important;
  color: #111 !important;
}
:deep(.p-dialog label),
:deep(.p-dialog .p-inputtext),
:deep(.p-dialog .p-calendar),
:deep(.p-dialog .p-inputtextarea) {
  color: #111 !important;
  background: #fff !important;
}

/* Botones de la paleta */
:deep(.p-button.btn-dark-green) {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}
:deep(.p-button.btn-dark-green:hover) {
  background: #15803d;
  border-color: #15803d;
}
:deep(.p-button.btn-blue) {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
:deep(.p-button.btn-blue:hover) {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

/* Ajustes menores */
.text-600 {
  color: #6b7280;
}
.text-900 {
  color: #111827;
}

:deep(.p-dialog .p-dialog-header),
:deep(.p-dialog .p-dialog-content) {
  background: #fff !important;
  color: #111 !important;
}

/* Apunta al contenedor del contenido del dialog (ya lo tenés con class="dialog-body") */
.dialog-body label {
  color: #111 !important;
}

.dialog-body .p-inputtext,
.dialog-body .p-inputtextarea,
.dialog-body .p-calendar {
  background: #fff !important;
  color: #111 !important;
}

/* Para tags auxiliares dentro del modal, por si algún tema los deja pálidos */
.dialog-body .text-900,
.dialog-body .text-700 {
  color: #111 !important;
}

:deep(.p-datatable-tbody > tr > td),
:deep(.p-datatable-tbody > tr > td *) {
  color: #111 !important;
}
.bolt-card :deep(.p-datatable),
.bolt-card :deep(.p-datatable-wrapper),
.bolt-card :deep(.p-datatable-header),
.bolt-card :deep(.p-datatable-thead > tr > th),
.bolt-card :deep(.p-datatable-tbody > tr),
.bolt-card :deep(.p-datatable-tbody > tr > td),
.bolt-card :deep(.p-paginator) {
  background: #fff !important;
}
.detail-pane :deep(*) {
  color: #111 !important;
}
.detail-pane :deep(.p-tag) {
  color: #fff !important;
}

.dlg-2col :deep(.p-dialog-content) {
  max-height: none;
  overflow-y: visible;
}

/* botones icon-only blanco con icono negro */
.btn-icon-white {
  background: #ffffff !important; /* fondo blanco */
  border: 1px solid transparent !important;
  color: #000000 !important; /* texto (por si hubiera) */
  box-shadow: none !important;
  min-width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
}

/* icono dentro del botón */
.btn-icon-white .p-button-icon {
  color: #000000 !important; /* icono negro */
  font-size: 1.05rem;
}

/* hover / focus: pequeña sombra o borde tenue (opcional) */
.btn-icon-white:hover {
  background: #ffffff !important;
  border-color: #e6e6e6 !important;
}

/* si usás la clase statebutton en conjunto, asegurar prioridad del icon color */
.statebutton .p-button-icon,
.btn-icon-white.statebutton .p-button-icon {
  color: #000 !important;
}

.is-view-mode :deep(.p-inputtext),
.is-view-mode :deep(.p-dropdown),
.is-view-mode :deep(.p-calendar .p-inputtext),
.is-view-mode :deep(.p-checkbox-box),
.is-view-mode :deep(textarea),
.is-view-mode :deep(input),
.is-view-mode :deep(select) {
  filter: grayscale(100%);
  opacity: 0.75;
  pointer-events: none;
}

.is-view-mode :deep(.p-checkbox-box.p-highlight),
.is-view-mode :deep(.p-checkbox.p-checkbox-checked .p-checkbox-box),
.is-view-mode :deep(.p-checkbox.p-highlight .p-checkbox-box) {
  background: #9ca3af !important;
  border-color: #9ca3af !important;
}
</style>
