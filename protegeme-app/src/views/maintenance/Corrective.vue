<template>
  <div class="bolt-wrap">
    <!-- Encabezado -->
    <div class="bolt-toolbar bolt-card">
      <div class="left">
        <h2 class="title">Mantenimientos — Correctivos</h2>
        <p class="subtitle">Listado y alta de correctivos</p>
      </div>
      <div class="right">
        <Button
          label="Nuevo Correctivo"
          icon="pi pi-plus"
          class="btn-dark-green"
          @click="openCreate"
        />
      </div>
    </div>

    <!-- Filtros -->
    <div class="bolt-card p-3">
      <div class="bolt-center formgrid grid align-items-end">
        <!-- Input búsqueda -->
        <div class="bolt_search p-3">
          <span class="p-input-icon-left w-full" style="flex: 1 1 520px">
            <i class="pi pi-search" />
            <InputText
              v-model="filters.placa"
              class="w-full pv-light"
              placeholder="Buscar por placa…"
              @keydown.enter="onSearch"
            />
          </span>
        </div>
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
        <!-- Botones alineados a la misma altura -->
      </div>
    </div>

    <!-- Tabla -->
    <div class="bolt-card p-3">
      <DataTable
        :value="rows"
        :loading="loading"
        dataKey="_id"
        responsive-layout="scroll"
        :paginator="false"
        class="p-datatable-sm"
      >
        <Column header="Falla" style="min-width: 240px">
          <template #body="{ data }"
            ><span class="text-900">{{ data.descripcionFalla }}</span></template
          >
        </Column>
        <Column header="Placa">
          <template #body="{ data }"
            ><span class="text-900">{{ data.placa || "—" }}</span></template
          >
        </Column>
        <Column header="Fecha">
          <template #body="{ data }"
            ><span class="text-900">{{
              fmtDate(data.fecha || data.createdAt)
            }}</span></template
          >
        </Column>
        <Column header="Responsable">
          <template #body="{ data }"
            ><span class="text-900">{{
              data.razonSocial || "—"
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

    <!-- Diálogo: Crear correctivo -->
    <Dialog
      v-model:visible="dlg.visible"
      modal
      header="Nuevo correctivo"
      class="dialog-body"
      :style="{ width: '720px' }"
    >
      <div class="formgrid grid">
        <div class="field col-12">
          <label class="block mb-2 text-900">Selecciona un mantenimiento</label>
          <UiDropdownBasic
            v-model="form.mantenimientoId"
            :options="maintenanceOptsType2"
            :disabled="store.maintenanceList.loading"
            placeholder="Seleccioná un mantenimiento"
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
            date-format="yy-mm-dd"
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
          <label class="block mb-2 text-900">NIT</label>
          <InputText v-model="form.nit" class="w-full" />
        </div>

        <div class="field col-12">
          <label class="block mb-2 text-900">Razón Social</label>
          <InputText v-model="form.razonSocial" class="w-full" />
        </div>

        <div class="field col-12">
          <label class="block mb-2 text-900">Descripción de la falla</label>
          <Textarea v-model="form.descripcionFalla" rows="3" class="w-full" />
        </div>

        <div class="field col-12">
          <label class="block mb-2 text-900">Acciones realizadas</label>
          <Textarea v-model="form.accionesRealizadas" rows="3" class="w-full" />
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
import { reactive, ref, computed, onMounted, watch } from "vue";
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
import { MaintenanceserviceApi } from "../../api/maintenance.service"; // <-- Add this import
import { useToast } from "primevue/usetoast";

const store = useMaintenanceStore();
const toast = useToast();

const saving = ref(false);
const filters = reactive({ mantenimientoId: "", placa: "" });
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
  nit: "",
  razonSocial: "",
  descripcionFalla: "",
  accionesRealizadas: "",
  detalleActividades: "",
});

const correctiveOptsLoading = ref(false);
const hasCorrective = ref(new Set<string>());

const correctiveMaintenanceOpts = computed(() =>
  (store.maintenanceList.items || [])
    .filter((m: any) => Number(m?.tipoId) === 2)
    .map((m: any) => ({
      label: formatMaintLabel(m),
      value: m?._id,
    }))
);

async function ensureCorrectiveOpts() {
  // Aseguramos mantenimientos en memoria
  if (!store.maintenanceList.items?.length) {
    await store.maintenanceFetchList({ page: 1, limit: 200 });
  }
  correctiveOptsLoading.value = true;
  try {
    // Para cada mantenimiento verifico si tiene correctivo
    for (const m of store.maintenanceList.items) {
      const id = String(m._id);
      if (hasCorrective.value.has(id)) continue;
      try {
        const { data } = await MaintenanceserviceApi.viewCorrective({
          mantenimientoId: id,
        });
        if (data && (data._id || data?.mantenimientoId)) {
          hasCorrective.value.add(id);
        }
      } catch {
        // si no tiene correctivo -> ignorar
      }
    }
  } finally {
    correctiveOptsLoading.value = false;
  }
}

// Al elegir opción, actualizo el filtro y reutilizo tu búsqueda
function onFilterPick(val: any) {
  const id =
    typeof val === "object"
      ? val?._id || val?.value || val?.id || ""
      : val || "";
  filters.mantenimientoId = String(id);
  onSearch(); // tu función existente
}

const loading = computed(() => store.correctiveList.loading);
const rows = computed(() => (store.correctiveList.items || []).map(normalize));

function normalize(r: any) {
  const m = r.mantenimiento || r.maintenance || {};
  const estadoBool =
    typeof r.estado === "boolean"
      ? r.estado
      : r.estado === "ACTIVO" || r.estado === 1 || r.estado === "1";
  return {
    _id: r._id,
    placa: r.placa ?? m.placa ?? "",
    fecha: r.fecha ?? r.createdAt ?? null,
    nombresResponsable: r.nombresResponsable ?? r.responsable ?? "",
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
    params.plate = filters.placa.trim(); // el store lo mapeará a 'placa'
  }
  await store.correctiveFetchList(params);
}

function onSearch() {
  refresh();
}

// Add clearFilters method for template binding
function clearFilters() {
  filters.mantenimientoId = "";
  refresh();
}

function openCreate() {
  Object.assign(form, {
    mantenimientoId: "",
    placa: "",
    fecha: null,
    detalleActividades: "",
  });
  dlg.visible = true;
  ensureMaintenances();
}

function normDate(v: any): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v.slice(0, 10);
  const d = new Date(v);
  if (isNaN(+d)) return undefined;
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, "0"),
    d2 = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${d2}`; // YYYY-MM-DD
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

async function save() {
  // 1) Armar payload ANTES de limpiar el form
  const payload: any = {
    mantenimientoId: String(form.mantenimientoId || "").trim(),
    placa: form.placa?.trim(),
    fecha: normDate(form.fecha),
    hora: normTime(form.hora),
    nit: toInt(form.nit),
    razonSocial: form.razonSocial?.trim(),
    descripcionFalla: form.descripcionFalla?.trim(),
    accionesRealizadas: form.accionesRealizadas?.trim(),
    detalleActividades: form.detalleActividades?.trim(),
  };

  // 2) Validación mínima (evita pelear con el back al pedo)
  const req = ["mantenimientoId", "placa", "fecha", "hora"];
  const missing = req.filter((k) => !payload[k]);
  if (missing.length) {
    toast?.add?.({
      severity: "warn",
      summary: "Campos requeridos",
      detail: `Completá: ${missing.join(", ")}`,
      life: 3000,
    });
    return;
  }

  saving.value = true;
  try {
    // 3) Crear en API
    await store.correctiveCreateDetail(payload);

    // 4) Marcar localmente que este mantenimiento ya tiene correctivo
    hasCorrective.value?.add(String(payload.mantenimientoId));

    // 5) Feedback
    toast?.add?.({
      severity: "success",
      summary: "Correctivo creado",
      detail: "Se guardó correctamente.",
      life: 2500,
    });

    // 6) Cerrar modal, refrescar lista y opciones del dropdown (tipo 2)
    dlg.visible = false;
    await ensureMaintenances(); // repuebla el dropdown con tipo 2
    await refresh();            // actualiza la tabla principal

    // 7) Limpieza del form (recién acá)
    Object.assign(form, {
      mantenimientoId: "",
      placa: "",
      fecha: null,
      hora: null,
      tipoIdentificacion: "",
      numeroIdentificacion: "",
      nombresResponsable: "",
      descripcionFalla: "",
      accionesRealizadas: "",
      detalleActividades: "",
    });

  } catch (e: any) {
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "No se pudo crear el correctivo";

    // Mostrar "duplicado" SOLO si el back devolvió 409
    if (status === 409) {
      toast?.add?.({
        severity: "warn",
        summary: "Correctivo ya existente",
        detail: "Ya existe un correctivo para esta transacción.",
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

const maintenanceOptsType2 = computed(() =>
  (store.maintenanceList.items || [])
    .filter((m: any) => Number(m?.tipoId) === 2)
    .map((m: any) => ({
      label: formatMaintLabel(m), // tu helper de etiqueta
      value: m?._id,
    }))
);

async function ensureMaintenances() {
  await store.maintenanceFetchList({ page: 1, limit: 100, tipoId: 2 });
}

function onPickMaintenance(id: string | number | null) {
  if (!id) return;
  const m = store.maintenanceList.items.find((x: any) => x._id === id);
  if (m) {
    form.placa = m.placa || "";
  }
}

onMounted(() => {
  ensureMaintenances();
  refresh();
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

.bolt-center {
  display: flex;
  justify-content: start;
  align-items: center;
}

.bolt-search {
  padding: 0 !important;
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

/* Texto negro dentro del panel de Detalle */
.detail-pane :deep(*) {
  color: #111 !important;
}
/* Mantener el texto del Tag legible */
.detail-pane :deep(.p-tag) {
  color: #fff !important;
}
</style>
