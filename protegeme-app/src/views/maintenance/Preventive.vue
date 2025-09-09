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
          <span class="p-input-icon-left w-full" style="flex: 1 1 520px">
            <i class="pi pi-search" />
            <InputText
              v-model="filters.placa"
              class="w-full pv-light"
              placeholder="Buscar por placa…"
              @keydown.enter="onSearch"
            />
          </span>

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
      </DataTable>
    </div>

    <Dialog
      v-model:visible="dlg.visible"
      :modal="true"
      header="Nuevo preventivo"
      class="w-11 md:w-7 lg:w-6"
    >
      <div class="formgrid grid dialog-body">
        <div class="field col-12 md:col-6">
          <label class="block mb-2 text-900">mantenimientoId *</label>
          <UiDropdownBasic
            v-model="form.mantenimientoId"
            :options="maintenanceOpts"
            :disabled="store.maintenanceList.loading"
            placeholder="Seleccioná un mantenimiento"
            @update:modelValue="onPickMaintenance"
          />
          <small
            v-if="!maintenanceOpts.length && !store.maintenanceList.loading"
            class="text-700"
          >
            No hay mantenimientos disponibles.
          </small>
        </div>
        <div class="field col-6 md:col-3">
          <label class="block mb-2 text-900">Placa</label>
          <InputText v-model="form.placa" class="w-full" />
        </div>
        <div class="field col-6 md:col-3">
          <label class="block mb-2 text-900">Fecha</label>
          <Calendar
            v-model="form.fecha"
            dateFormat="yy-mm-dd"
            showIcon
            appendTo="body"
            class="w-full pv-light"
          />
        </div>

        <div class="field col-6 md:col-3">
          <label class="block mb-2 text-900">Hora</label>
          <Calendar
            v-model="form.hora"
            timeOnly
            hourFormat="24"
            showIcon
            appendTo="self"
            class="w-full pv-light"
          />
        </div>
        <div class="field col-6 md:col-3">
          <label class="block mb-2 text-900">NIT</label>
          <InputText
            v-model="form.nit"
            class="w-full"
            placeholder="7007007007"
          />
        </div>
        <div class="field col-12 md:col-6">
          <label class="block mb-2 text-900">Razón Social</label>
          <InputText v-model="form.razonSocial" class="w-full" />
        </div>

        <div class="field col-6 md:col-3">
          <label class="block mb-2 text-900">Tipo Identificación</label>
          <InputText
            v-model="form.tipoIdentificacion"
            class="w-full"
            placeholder="1"
          />
        </div>
        <div class="field col-6 md:col-3">
          <label class="block mb-2 text-900">Número Identificación</label>
          <InputText
            v-model="form.numeroIdentificacion"
            class="w-full"
            placeholder="12345678"
          />
        </div>
        <div class="field col-12 md:col-6">
          <label class="block mb-2 text-900">Nombres Responsable</label>
          <InputText
            v-model="form.nombresResponsable"
            class="w-full"
            placeholder="Juan Pérez"
          />
        </div>

        <div class="field col-12">
          <label class="block mb-2 text-900">Detalle Actividades</label>
          <Textarea
            v-model="form.detalleActividades"
            rows="3"
            autoResize
            class="w-full"
          />
        </div>

        <div class="field col-12 flex justify-content-end gap-2 mt-2">
          <Button label="Cancelar" text @click="dlg.visible = false" />
          <Button
            label="Crear"
            icon="pi pi-save"
            class="btn-blue"
            :loading="saving"
            @click="save"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from "vue";
import { useMaintenanceStore } from "../../stores/maintenanceStore";
import InputText from "primevue/inputtext";
import Calendar from "primevue/calendar";
import Textarea from "primevue/textarea";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Dialog from "primevue/dialog";
import UiDropdownBasic from "../../components/ui/Dropdown.vue";
import { useToast } from 'primevue/usetoast';

const toast = useToast();

const store = useMaintenanceStore();

/** Estado */
const page = ref(1);
const limit = ref(10);
const filters = reactive({
  mantenimientoId: "",
  placa: "",
});

/** Store computeds (preventivo) */
const items = computed(() => store.preventiveList.items);

console.log(items);
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
  if (!v) return undefined;
  try {
    if (v instanceof Date) {
      const hh = String(v.getHours()).padStart(2, "0");
      const mm = String(v.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
    const m = String(v).match(/^(\d{1,2}):(\d{2})$/);
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
  if (!store.maintenanceList.items?.length) {
    await store.maintenanceFetchList({ page: 1, limit: 100, tipoId: 1 }); // ← filtro por preventivo
  }
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

/** Crear */
const dlg = reactive({ visible: false });
const form = reactive({
  mantenimientoId: "",
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
const saving = ref(false);

function openCreate() {
  Object.assign(form, {
    mantenimientoId: "",
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

async function save() {
  const payload = clean({
    mantenimientoId: form.mantenimientoId?.trim(),
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

  saving.value = true;
  try {
    await store.preventiveCreateDetail(payload);
    dlg.visible = false;
    await refresh();

    // Feedback OK
    toast?.add?.({
      severity: 'success',
      summary: 'Preventivo creado',
      detail: 'Se guardó correctamente.',
      life: 2500
    });

  } catch (e: any) {
    const status = e?.response?.status;
    const msg = e?.response?.data?.message || e?.message || 'No se pudo crear el preventivo';

    // Caso duplicado / ya existe
    if (status === 409 || /existe/i.test(msg) || /duplic/i.test(msg)) {
      toast?.add?.({
        severity: 'warn',
        summary: 'Preventivo ya existente',
        detail: 'Ya existe un preventivo para esta transacción.',
        life: 4000
      });
    } else {
      // Otros errores
      toast?.add?.({
        severity: 'error',
        summary: 'Error al crear',
        detail: msg,
        life: 4000
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
/* ---------- Bolt look (claro) ---------- */

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
</style>
