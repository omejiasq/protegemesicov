<template>
  <div class="grid">
    <!-- Header -->
    <div class="col-12">
      <div
        class="surface-0 panel-white p-3 border-round shadow-1 flex align-items-center justify-content-between"
      >
        <h2 class="m-0 text-900">Mantenimientos</h2>
        <Button
          label="Nuevo mantenimiento"
          icon="pi pi-plus"
          class="btn-dark-green"
          @click="openCreate"
        />
      </div>
    </div>

    <!-- Filtros -->
    <div class="col-12">
      <div class="surface-0 panel-white p-3 border-round shadow-1">
        <div class="formgrid grid">
          <!-- Buscar (ícono dentro) -->
          <div class="field col-12 md:col-6">
            <label class="block mb-2 text-900">Buscar</label>
            <span class="p-input-icon-left w-full">
              <i class="pi pi-search" />
              <InputText
                v-model="local.plate"
                class="w-full pv-light"
                placeholder="Buscar por placa…"
                @keydown.enter="refresh"
              />
            </span>
          </div>

          <!-- Tipo -->
          <div class="field col-6 md:col-2">
            <label class="block mb-2 text-900">Tipo</label>
            <UiDropdownBasic
              v-model="local.tipoId"
              :options="tipoOpts"
              placeholder="Todos"
              class="w-full"
              @update:modelValue="onTipoChange"
            />
          </div>

          <!-- Botones (misma fila, con aire respecto al dropdown) -->
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
                @click="clearFilters"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="col-12">
      <div class="surface-0 panel-white p-3 border-round shadow-1">
        <DataTable
          :value="items"
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
          <!-- (ID removida) -->
          <Column field="placa" header="Placa" style="width: 140px">
            <template #body="{ data }">{{ data.placa || "—" }}</template>
          </Column>

          <Column field="tipoId" header="Tipo" style="width: 160px">
            <template #body="{ data }">{{ tipoLabel(data.tipoId) }}</template>
          </Column>

          <Column field="vigiladoId" header="Vigilado" style="width: 160px">
            <template #body="{ data }">{{ data.vigiladoId ?? "—" }}</template>
          </Column>

          <Column header="Fecha" style="width: 160px">
            <template #body="{ data }">{{ fmtDate(data.createdAt) }}</template>
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
    </div>

    <!-- Dialogo crear -->
    <Dialog
      v-model:visible="dlg.visible"
      :modal="true"
      header="Nuevo mantenimiento"
      class="w-11 h-50 md:w-6 lg:w-5 dlg-maint"
    >
      <div class="formgrid grid">
        <div class="field col-12 md:col-4">
          <label class="block mb-2 text-900">Tipo</label>
          <UiDropdownBasic
            v-model="form.tipoId"
            :options="tipoOpts"
            placeholder="Seleccioná"
            class="w-full"
            @update:modelValue="(v) => (form.tipoId = normTipo(v))"
          />
        </div>

        <div class="field col-12 md:col-4">
          <label class="block mb-2 text-900">Placa</label>
          <InputText
            v-model="form.placa"
            class="w-full pv-light"
            placeholder="ABC123"
          />
        </div>

<!--         <div class="field col-12 md:col-4">
          <label class="block mb-2 text-900">Vigilado ID</label>
          <InputText
            v-model="form.vigiladoIdString"
            class="w-full pv-light"
            placeholder="7007007007"
          />
        </div> -->

        <div class="field col-12 flex justify-content-end gap-2 mt-2">
          <Button label="Cancelar" text @click="dlg.visible = false" />
          <Button
            label="Crear"
            icon="pi pi-save"
            class="btn-dark-green"
            :loading="saving"
            @click="save"
            type="button"
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
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Dialog from "primevue/dialog";
import UiDropdownBasic from "../../components/ui/Dropdown.vue";

const store = useMaintenanceStore();

/** ====== Computeds del store (NO creo objetos nuevos) ====== */
const page = computed(() => store.maintenanceList.page);
const limit = computed(() => store.maintenanceList.limit);
const loading = computed(() => store.maintenanceList.loading);
const items = computed(() => store.maintenanceList.items);
const total = computed(() => store.maintenanceList.total);

/** ====== Filtros locales (reflejan store.maintenanceList.filters) ====== */
const local = reactive<{
  search: string;
  plate: string;
  tipoId: number | null;
  vigiladoId?: string | number | null;
}>({
  search: store.maintenanceList.filters.search || "",
  plate: store.maintenanceList.filters.plate || "",
  tipoId: (store.maintenanceList.filters.tipoId as number | undefined) ?? null,
  vigiladoId: store.maintenanceList.filters.vigiladoId ?? null,
});

/** ====== Opciones de tipo ====== */
type Opt = { label: string; value: number };
const tipoOpts: Opt[] = [
  { label: "Preventivo", value: 1 },
  { label: "Correctivo", value: 2 },
  { label: "Alistamiento", value: 3 },
];

/** ====== Utils ====== */
function fmtDate(s?: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return s;
  }
}
function tipoLabel(v?: number | null) {
  const m: Record<number, string> = {
    1: "Preventivo",
    2: "Correctivo",
    3: "Alistamiento",
  };
  return v ? m[v] || String(v) : "—";
}
function normTipo(v: any): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function toIntOrUndef(v: any): number | undefined {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function clean(obj: Record<string, any>) {
  const out: any = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === "" || v === null || v === undefined) return;
    out[k] = v;
  });
  return out;
}

/** ====== Filtros ====== */
function onTipoChange(v: any) {
  local.tipoId = normTipo(v);
}

async function refresh() {
  const filters = clean({
    plate: local.plate?.trim(),   // ⬅️ usar el mismo v-model del input
    tipoId: local.tipoId ?? undefined,
    vigiladoId: toIntOrUndef(local.vigiladoId),
  });

  store.maintenanceUpdateFilters(filters);
  await store.maintenanceFetchList();
}

function clearFilters() {
  local.search = "";
  local.plate = "";
  local.tipoId = null;
  local.vigiladoId = null;

  store.maintenanceUpdateFilters({
    search: "",
    plate: "",
    tipoId: undefined,
    vigiladoId: undefined,
  });
  store.maintenanceSetPageLimit(1, limit.value);
  store.maintenanceFetchList();
}

function onPage(e: any) {
  const newPage = Math.floor(e.first / e.rows) + 1;
  store.maintenanceSetPageLimit(newPage, e.rows);
  store.maintenanceFetchList();
}

/** ====== Crear (payload EXACTO) ====== */
const dlg = reactive({ visible: false });
const form = reactive<{
  tipoId: number | null;
  placa: string;
  vigiladoIdString: string | null;
}>({
  tipoId: 3,
  placa: "",
  vigiladoIdString: null,
});
const saving = ref(false);

function openCreate() {
  dlg.visible = true;
  form.tipoId = 3;
  form.placa = "";
}

async function save() {
  const payload = {
    tipoId: toIntOrUndef(form.tipoId),
    placa: form.placa?.trim(),
  };
  if (!payload.tipoId || !payload.placa) return;

  saving.value = true;
  try {
    await store.createMaintenance(payload);
    dlg.visible = false;
    await store.maintenanceFetchList();
  } finally {
    saving.value = false;
  }
}

/** ====== Init ====== */
onMounted(() => {
  store.maintenanceFetchList();
});
</script>

<style scoped>
/* Panel claro idéntico al Preventive */
.panel-white {
  background: #ffffff !important;
  color: #111111 !important;
  border: 1px solid rgba(17, 17, 17, 0.06);
}
.panel-white :deep(.p-datatable),
.panel-white :deep(.p-datatable-thead > tr > th),
.panel-white :deep(.p-datatable-tbody > tr > td),
.panel-white :deep(.p-paginator) {
  background: #ffffff !important;
  color: #111111 !important;
  border-color: rgba(17, 17, 17, 0.06) !important;
}

/* Forzar negro en headings y labels dentro del panel blanco */
.panel-white :deep(h1),
.panel-white :deep(h2),
.panel-white :deep(h3),
.panel-white :deep(label),
.panel-white :deep(.text-900) {
  color: #111111 !important;
}

/* Ícono de búsqueda dentro del input */
:deep(.p-input-icon-left) {
  position: relative;
}
:deep(.p-input-icon-left > i) {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
}
:deep(.p-input-icon-left .p-inputtext) {
  padding-left: 2.25rem;
  background: #fff !important;
  color: #111 !important;
}

/* Botones con buen ancho y un pelín de separación */
.search-actions :deep(.p-button) {
  min-width: 9rem;
}

/* Colores de botones */
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

/* Inputs claros reutilizables */
.pv-light {
  background: #fff !important;
  color: #111 !important;
}

.dlg-maint :deep(.p-dialog-content) {
  min-height: 360px; /* subilo a 420px si lo querés más alto */
}

/* Por si algún label quedaba claro sobre fondo blanco */
.dlg-maint label,
.dlg-maint,
.dlg-maint :deep(.p-inputtext),
.dlg-maint :deep(.p-dropdown) {
  color: #111 !important;
  background: #fff !important;
}
</style>
