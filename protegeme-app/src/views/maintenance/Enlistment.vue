<template>
  <div class="bolt-wrap">
    <!-- Encabezado -->
    <div class="bolt-toolbar bolt-card">
      <div class="left">
        <h2 class="title">Mantenimientos — Alistamientos</h2>
        <p class="subtitle">Listado y alta de alistamientos</p>
      </div>
      <div class="right">
        <Button
          label="Nuevo Alistamiento"
          icon="pi pi-plus"
          class="btn-dark-green"
          @click="openCreate"
        />
      </div>
    </div>

    <!-- Filtros -->
    <div class="bolt-card p-3">
      <div class="bolt-center formgrid grid align-items-end">
        <!-- Dropdown de búsqueda -->
        <div class="bolt_search p-3">
          <span class="p-input-icon-left w-full" style="flex: 1 1 520px">
            <i class="pi pi-search" />
            <InputText
              v-model="filters.placa"
              class="w-full pv-light"
              placeholder="Buscar por placa…"
              @keydown.enter="refresh"
            />
          </span>
        </div>

        <!-- Botones -->
        <div class="field col-12 md:col-2 flex align-items-end">
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
              @click="onClear"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla (1 fila si hay resultado) -->
    <div class="bolt-card p-3">
      <DataTable
        :value="rows"
        :loading="loading"
        dataKey="_id"
        responsive-layout="scroll"
        :paginator="false"
        class="p-datatable-sm"
      >
        <Column header="Descripcion" style="min-width: 240px">
          <template #body="{ data }"
            ><span class="text-900">{{
              data.detalleActividades
            }}</span></template
          >
        </Column>
        <Column header="Placa" style="min-width: 240px">
          <template #body="{ data }"
            ><span class="text-900">{{ data.placa }}</span></template
          >
        </Column>
        <Column header="Numero de identificacion">
          <template #body="{ data }"
            ><span class="text-900">{{
              data.numeroIdentificacion || "—"
            }}</span></template
          >
        </Column>
        <Column header="Fecha">
          <template #body="{ data }"
            ><span class="text-900">{{
              fmtDate(data.fecha || data.createdAt)
            }}</span></template
          >
        </Column>
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

    <!-- Diálogo: Crear alistamiento -->
    <Dialog
      v-model:visible="dlg.visible"
      modal
      header="Nuevo alistamiento"
      class="dialog-body"
      :style="{ width: '720px' }"
      :contentStyle="{ overflowY: 'visible', maxHeight: 'none' }"
    >
      <!-- wrapper de grilla para 2 columnas -->
      <div class="formgrid grid">
        <div class="field col-12">
          <label class="block mb-2 text-900">Mantenimiento</label>
          <UiDropdownBasic
            v-model="form.mantenimientoId"
            :options="maintenanceOptsType3"
            :disabled="store.maintenanceList.loading"
            placeholder="Seleccioná un mantenimiento (tipo 3)"
            @update:modelValue="onPickMaintenance"
          />
        </div>

        <div class="field col-12 md:col-6">
          <label class="block mb-2 text-900">Placa</label>
          <InputText v-model="form.placa" class="w-full" />
        </div>

        <div class="field col-12 md:col-6">
          <label class="block mb-2 text-900">Fecha (YYYY-MM-DD)</label>
          <Calendar
            v-model="form.fecha"
            dateFormat="yy-mm-dd"
            appendTo="body"
            class="w-full"
          />
        </div>

        <div class="field col-12 md:col-6">
          <label class="block mb-2 text-900">Hora</label>
          <Calendar
            v-model="form.hora"
            timeOnly
            hourFormat="24"
            showIcon
            appendTo="self"
            class="w-full"
          />
        </div>

        <div class="field col-12 md:col-6">
          <label class="block mb-2 text-900">Tipo identificación</label>
          <InputText
            v-model="form.tipoIdentificacion"
            placeholder="3"
            class="w-full"
          />
        </div>

        <div class="field col-12 md:col-6">
          <label class="block mb-2 text-900">Número identificación</label>
          <InputText
            v-model="form.numeroIdentificacion"
            placeholder="12345678"
            class="w-full"
          />
        </div>

        <div class="field col-12 md:col-6">
          <label class="block mb-2 text-900">Responsable</label>
          <InputText
            v-model="form.nombresResponsable"
            placeholder="Juan Pérez"
            class="w-full"
          />
        </div>

        <div class="field col-12">
          <label class="block mb-2 text-900">Detalle de actividades</label>
          <Textarea v-model="form.detalleActividades" rows="4" class="w-full" />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-content-end gap-2">
          <Button
            label="Cancelar"
            class="p-button-text"
            @click="dlg.visible = false"
          />
          <Button
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
import { reactive, ref, computed, onMounted } from "vue";
import { useMaintenanceStore } from "../../stores/maintenanceStore";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Dialog from "primevue/dialog";
import UiDropdownBasic from "../../components/ui/Dropdown.vue";
import { MaintenanceserviceApi } from "../../api/maintenance.service";
import Calendar from "primevue/calendar";
import Textarea from "primevue/textarea";
import { useToast } from "primevue/usetoast";
import { watch } from "vue";

const toast = useToast();

const store = useMaintenanceStore();

type EnlistmentFilters = { mantenimientoId: string; placa: string };
const filters = reactive<EnlistmentFilters>({ mantenimientoId: "", placa: "" });
const saving = ref(false);
const dlg = reactive({ visible: false });
watch(
  () => dlg.visible,
  (v) => {
    if (v) ensureMaintenances();
  }
);
const form = reactive({
  mantenimientoId: "",
  placa: "",
  fecha: null as any,
  hora: null as any,
  tipoIdentificacion: "",
  numeroIdentificacion: "",
  nombresResponsable: "",
  detalleActividades: "",
});

const loading = computed(() => store.enlistmentList.loading);
const rows = computed(() => (store.enlistmentList.items || []).map(normalize));

const maintenanceOptsType3 = computed(() =>
  (store.maintenanceList.items || [])
    .filter((m: any) => Number(m?.tipoId) === 3) // 👈 SOLO tipo 3
    .map((m: any) => ({
      label: formatMaintLabel(m),
      value: m?._id,
    }))
);

function normalize(r: any) {
  const estadoBool =
    typeof r.estado === "boolean"
      ? r.estado
      : r.estado === "ACTIVO" || r.estado === 1 || r.estado === "1";
  return {
    _id: r._id,
    mantenimientoId: r.mantenimientoId,
    fecha: r.fecha ?? r.createdAt ?? null,
    estado: estadoBool,
    ...r,
  };
}

function fmtDate(s?: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return s as any;
  }
}

async function refresh() {
  const params: any = {};
  if (
    filters.placa &&
    typeof filters.placa === "string" &&
    filters.placa.trim()
  ) {
    params.plate = filters.placa.trim(); // el store lo mapea a 'placa'
  }
  await store.enlistmentFetchList(params);
}

function normDate(v: any): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v.slice(0, 10);
  const d = new Date(v);
  if (isNaN(+d)) return undefined;
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, "0"),
    dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
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

function toInt(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function clearFilters() {
  filters.mantenimientoId = "";
  filters.placa = ""; // 👈 importante
  refresh();
}

function onClear() {
  filters.mantenimientoId = "";
  refresh();
}

function openCreate() {
  Object.assign(form, { mantenimientoId: "" });
  dlg.visible = true;
  ensureMaintenances();
}

async function save() {
  const payload: any = {
    mantenimientoId: String(form.mantenimientoId || "").trim(),
    placa: form.placa?.trim() || undefined,
    fecha: normDate(form.fecha),
    hora: normTime(form.hora),
    tipoIdentificacion: toInt(form.tipoIdentificacion),
    numeroIdentificacion: form.numeroIdentificacion?.trim() || undefined,
    nombresResponsable: form.nombresResponsable?.trim() || undefined,
    detalleActividades: form.detalleActividades?.trim() || undefined,
  };

  const req = [
    "mantenimientoId",
    "placa",
    "fecha",
    "hora",
    "tipoIdentificacion",
    "numeroIdentificacion",
    "nombresResponsable",
    "detalleActividades",
  ];
  for (const k of req) {
    if (!payload[k]) {
      alert(`Falta completar: ${k}`);
      return;
    }
  }

  saving.value = true;
  try {
    await store.enlistmentCreate(payload);
    dlg.visible = false;

    toast?.add?.({
      severity: "success",
      summary: "Alistamiento creado",
      detail: "Se guardó correctamente.",
      life: 2500,
    });

    await refresh();
  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "No se pudo crear el alistamiento";

    if (status === 409 || /existe/i.test(msg) || /duplic/i.test(msg)) {
      toast?.add?.({
        severity: "warn",
        summary: "Alistamiento ya existente",
        detail: "Ya existe un alistamiento para esta placa/transacción.",
        life: 4000,
      });
    } else {
      toast?.add?.({
        severity: "error",
        summary: "Error al crear",
        detail: msg,
        life: 4000,
      });
    }
    return;
  } finally {
    saving.value = false;
  }
}

function formatMaintLabel(m: any) {
  const placa = (m?.placa || "").toString().toUpperCase();
  const tipo = m?.tipoId ?? "-";
  return `${placa || "(sin placa)"} — Tipo ${tipo}`;
}

async function ensureMaintenances() {
  await store.maintenanceFetchList({ page: 1, limit: 100, tipoId: 3 });
}

const enlistmentOptsLoading = ref(false);
const hasEnlistment = ref(new Set<string>());

const enlistmentMaintenanceOpts = computed(() => {
  const maints = store.maintenanceList.items || [];
  return maints
    .filter((m: any) => hasEnlistment.value.has(String(m._id)))
    .map((m: any) => ({ label: formatMaintLabel(m), value: m._id }));
});

async function ensureEnlistmentOpts() {
  if (!store.maintenanceList.items?.length) {
    await store.maintenanceFetchList({ page: 1, limit: 200 });
  }
  enlistmentOptsLoading.value = true;
  try {
    for (const m of store.maintenanceList.items) {
      const id = String(m._id);
      if (hasEnlistment.value.has(id)) continue;
      try {
        const { data } = await MaintenanceserviceApi.viewEnlistment({
          mantenimientoId: id,
        });
        if (data && (data._id || data?.mantenimientoId))
          hasEnlistment.value.add(id);
      } catch {
        /* si no existe, ignorar */
      }
    }
  } finally {
    enlistmentOptsLoading.value = false;
  }
}

function onFilterPick(val: any) {
  const id =
    typeof val === "object"
      ? val?._id || val?.value || val?.id || ""
      : val || "";
  filters.mantenimientoId = String(id);
  refresh();
}

function onPickMaintenance(id: string | number | null) {
  if (!id) return;
  const m = store.maintenanceList.items.find(
    (x: any) => String(x._id) === String(id)
  );
  if (m) {
    form.placa = m.placa || "";
  }
}

onMounted(() => {
  ensureMaintenances(); // lo mantenemos
  refresh(); // cargá la lista apenas entra
});
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
</style>
