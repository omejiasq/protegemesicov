<template>
  <div class="grid">
    <!-- Uploader + Guardar como programa -->
    <div class="col-12">
      <div class="surface-0 panel-white p-3 border-round shadow-1">
        <h3 class="m-0 text-lg text-900 mb-3">Subir archivo</h3>

        <div class="formgrid grid">
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900">Archivo</label>
            <input type="file" @change="onPick" />
          </div>

          <div class="field col-6 md:col-3">
            <label class="block mb-2 text-900">Tipo</label>
            <UiDropdownBasic
              v-model="form.tipoId"
              :options="tipoCreateOpts"
              class="w-full"
            />
          </div>

          <div class="field col-12 md:col-2 flex align-items-end">
            <Button
              label="Subir y guardar"
              icon="pi pi-upload"
              :loading="uploading || saving"
              :disabled="!filePicked || !form.tipoId"
              @click="createProgramAndMaintenance()"
              class="w-full"
            />
          </div>
        </div>

        <small class="text-700" v-if="lastRef">
          Subido: {{ lastRef?.nombreOriginalArchivo }} ({{ lastRef?.mimeType }})
        </small>
      </div>
    </div>
    <!-- Filtros -->
    <div class="bolt-card panel-white">
      <div class="formgrid grid align-items-end">
        <!-- Input búsqueda -->
        <div class="col-10 flex align-items-center gap-3">
          <SearchBar
            v-model="filters.tipoId"
            :width="'700px'"
            @search="refresh"
          />
          <label class="block mb-2 text-900">Tipo</label>
          <UiDropdownBasic
            v-model="filters.tipoId"
            :options="tipoFilterOpts"
            placeholder="Todos"
            class="w-15rem"
          />
          <div class="filters-actions">
            <Button
              label="Buscar"
              icon="pi pi-search"
              class="btn-filter"
              :loading="loading"
              @click="refresh()"
            />
            <Button
              label="Limpiar"
              icon="pi pi-times"
              class="btn-clear"
              @click="clearFilters()"
            />
          </div>
        </div>

        <!-- Botones alineados a la misma altura -->
        <div class="field col-12 md:col-2 flex align-items-end"></div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="col-12">
      <div class="surface-0 panel-white p-3 border-round shadow-1">
        <div class="flex align-items-center justify-content-between mb-3">
          <h3 class="m-0 text-lg text-900">Programas</h3>
          <Button
            label="Refrescar"
            icon="pi pi-refresh"
            text
            @click="fetch"
            :loading="loadingList"
          />
        </div>

        <DataTable
          :value="rows"
          :loading="loadingList"
          class="p-datatable-sm"
          responsive-layout="scroll"
        >
          <Column header="Nombre">
            <template #body="{ data }">
              {{ data?.nombreOriginal || data?.nombreOriginalArchivo || "—" }}
            </template>
          </Column>
          <Column header="Documento">
            <template #body="{ data }">
              <span class="text-700 panel-white">{{
                data?.documento || data?.nombreAlmacenado || "—"
              }}</span>
            </template>
          </Column>
          <Column header="Ruta">
            <template #body="{ data }">
              <span class="text-700 panel-white">{{ data?.ruta || "—" }}</span>
            </template>
          </Column>
          <Column header="Tipo">
            <template #body="{ data }">
              <Tag :value="tipoLabel(data?.tipoId)" />
            </template>
          </Column>
          <Column header="Vigilado">
            <template #body="{ data }">
              {{ data?.vigiladoId ?? "—" }}
            </template>
          </Column>
          <Column header="Creado">
            <template #body="{ data }">
              {{ fmtDate(data?.createdAt) }}
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useMaintenanceStore } from "../../stores/maintenanceStore";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import InputText from "../../components/ui/InputText.vue";
import Button from "primevue/button";
import Tag from "primevue/tag";
import UiDropdownBasic from "../../components/ui/Dropdown.vue";
import SearchBar from "../../components/ui/SearchBar.vue";

const store = useMaintenanceStore();

// 1) Filtros: solo tipo. Usamos null (no undefined) para llevarnos bien con UiDropdownBasic
const filters = reactive({
  tipoId: undefined as number | undefined,
});

// Opciones para tu UiDropdownBasic (ya lo tenés en el template)
type Option = { label: string; value?: string | number }; // value omitido = "Todos"
const createTipoId = ref<number | null>(null);

// Opciones separadas
const tipoFilterOpts = [
  { label: "Todos", value: null }, // <- este solo en el filtro
  { label: "Preventivo", value: 1 },
  { label: "Correctivo", value: 2 },
  { label: "Alistamiento", value: 3 },
] as const;

const tipoCreateOpts = [
  { label: "Preventivo", value: 1 },
  { label: "Correctivo", value: 2 },
  { label: "Alistamiento", value: 3 },
] as const;
// Normalización segura: null -> undefined (no manda filtro); string -> number
const tipoIdNormalized = computed<number | undefined>(() => {
  const v = filters.tipoId;
  if (v === null || v === undefined || v === ("" as any)) return undefined;
  return typeof v === "string" ? Number(v) : v;
});

// 2) Carga de lista (filtro por tipoId)
const loading = ref(false);

async function fetch() {
  const params: Record<string, any> = {};
  if (tipoIdNormalized.value !== undefined)
    params.tipoId = tipoIdNormalized.value;
  await store.programsFetch(params); // lista programas filtrando en backend
}

async function refresh(silent = false) {
  try {
    if (!silent) loading.value = true;
    await fetch();
  } catch (e) {
    console.error("[Programs] refresh error:", e);
  } finally {
    loading.value = false;
  }
}

function clearFilters({ autoRefresh = true }: { autoRefresh?: boolean } = {}) {
  filters.tipoId = undefined;
  if (autoRefresh) refresh();
}

// Auto-refresco cuando cambia el tipo
watch(
  () => filters.tipoId,
  () => refresh()
);

onMounted(() => {
  refresh(true); // primer render sin spinner local
});

/* 3) Subida de archivo + creación de programa+mantenimiento
   - Usa el tipoId actual para decidir qué método del store disparar
   - Usa tu payload real (ej: 'form') y el file que tengas seleccionado
*/
const selectedFile = ref<File | null>(null);
// Si ya tenés otro ref para el archivo, usalo y borrá esta parte.
function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] || null;
  selectedFile.value = f;
}

// TIP: usá tu 'form' si ya existe. Si tu vista se llama 'form', sustituí payload = form.
function buildMaintenancePayload() {
  // devuelve el payload que ya estés usando para createXxx (placa, fecha, hora, etc.)
  // Reemplazá esto por tu objeto real, por ejemplo: return form
  return {};
}

async function createProgramAndMaintenance() {
  // tipo desde el dropdown de creación
  const t = typeof form.tipoId === "string" ? Number(form.tipoId) : form.tipoId;

  if (!t || ![1, 2, 3].includes(t)) {
    console.warn("Seleccioná un tipo de mantenimiento para crear.");
    return;
  }
  if (!filePicked.value) {
    console.warn("Subí un archivo antes de crear el programa.");
    return;
  }

  const payload = buildMaintenancePayload ? buildMaintenancePayload() : {};

  if (t === 1) {
    const args = { tipoId: 1, file: filePicked.value };
    console.log(
      "%cprotegeme-app\src\views\maintenance\ProgramView.vue:250 args",
      "color: #007acc;",
      args
    );
    await store.programsCreate(args);
  } else if (t === 2) {
    const args = { tipoId: 2, file: filePicked.value };
    console.log(
      "%cprotegeme-app\src\views\maintenance\ProgramView.vue:250 args",
      "color: #007acc;",
      args
    );
    await store.programsCreate(args);
  } else if (t === 3) {
    const args = { tipoId: 3, file: filePicked.value };
    console.log(
      "%cprotegeme-app\src\views\maintenance\ProgramView.vue:250 args",
      "color: #007acc;",
      args
    );
    await store.programsCreate(args);
  }

  await refresh();
  filePicked.value = null; // opcional: limpiar selección
  // form.tipoId = null;        // opcional: resetear selector de creación
}

const rows = computed(() => store.programs.items);
const loadingList = computed(() => store.programs.loading);

function tipoLabel(v?: number) {
  if (v === 1) return "Preventivo";
  if (v === 2) return "Correctivo";
  if (v === 3) return "Alistamiento";
  return "—";
}
function fmtDate(s?: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return s;
  }
}

// Upload + Save
const filePicked = ref<File | null>(null);
const form = reactive<{ tipoId: 1 | 2 | 3 | null }>({
  tipoId: 1,
});
const uploading = computed(() => store.files.uploading);
const saving = ref(false);
const lastRef = computed(() => store.files.lastRef as any);

function onPick(e: Event) {
  const t = e.target as HTMLInputElement;
  filePicked.value = (t.files && t.files[0]) || null;
}

async function uploadAndSave() {
  if (!filePicked.value || !form.tipoId) return;

  saving.value = true;
  try {
    await store.uploadFile(filePicked.value);

    // 4) create program con el mismo vigiladoId (como Number)
    const ref = store.files.lastRef as any;
    await store.programsCreate({
      tipoId: form.tipoId,
      documento: ref?.nombreAlmacenado,
      nombreOriginal: ref?.nombreOriginalArchivo,
      ruta: ref?.ruta,
    });

    await fetch();
    filePicked.value = null;
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await refresh(true);
});
</script>

<style scoped>
/* Tarjetas blancas y texto negro */
.panel-white {
  background: #ffffff !important;
  color: #111111 !important;
  border: 1px solid rgba(17, 17, 17, 0.06);
}

/* Inputs claros */
.panel-white :deep(.p-inputtext) {
  background: #ffffff !important;
  color: #111111 !important;
}

/* Soporte para tu Dropdown custom */
.panel-white :deep(.ui-dropdown),
.panel-white :deep(.ui-dropdown .label),
.panel-white :deep(.ui-dropdown .arrow) {
  background: #ffffff !important;
  color: #111111 !important;
  border-color: rgba(17, 17, 17, 0.12) !important;
}
.panel-white :deep(.ui-dropdown-panel) {
  background: #ffffff !important;
  color: #111111 !important;
  border: 1px solid rgba(17, 17, 17, 0.12) !important;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

/* DataTable claro */
.panel-white :deep(.p-datatable),
.panel-white :deep(.p-datatable-header),
.panel-white :deep(.p-datatable-thead > tr > th),
.panel-white :deep(.p-datatable-tbody > tr > td) {
  background: #ffffff !important;
  color: #111111 !important;
  border-color: rgba(17, 17, 17, 0.06) !important;
}

/* Tags e íconos */
.panel-white :deep(.p-tag),
.panel-white i {
  color: #111111 !important;
}
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
  width: 99%;
  padding: 1rem;
  margin: 0.5rem;
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
  color: #111827 !important ;
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
