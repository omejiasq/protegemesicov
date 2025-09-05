<template>
  <div class="grid">
    <!-- Filtros -->
    <div class="col-12">
      <div class="surface-0 panel-white p-3 border-round shadow-1">
        <div class="flex flex-wrap gap-3 align-items-end">
          <div class="field">
            <label class="block mb-2 text-900">Tipo</label>
            <UiDropdownBasic
              v-model="filters.tipoId"
              :options="tipoOpts"
              placeholder="Todos"
              class="w-15rem"
            />
          </div>
          <div class="field col">
            <label class="block mb-2 text-900">Vigilado ID</label>
            <InputText
              v-model="filters.vigiladold"
              class="w-12rem"
              placeholder="123"
            />
          </div>
          <div class="field">
            <Button
              label="Buscar"
              icon="pi pi-search"
              @click="fetch"
              class="btn-filter"
              :loading="loadingList"
            />
          </div>
        </div>
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
              :options="tipoOpts"
              class="w-full"
            />
          </div>

          <div class="field col-6 md:col-3">
            <label class="block mb-2 text-900">Vigilado ID</label>
            <InputText
              v-model="form.vigiladold"
              placeholder="123"
              class="w-full"
            />
          </div>

          <div class="field col-12 md:col-2 flex align-items-end">
            <Button
              label="Subir y guardar"
              icon="pi pi-upload"
              :loading="uploading || saving"
              :disabled="!filePicked || !form.tipoId || !form.vigiladold"
              @click="uploadAndSave"
              class="w-full"
            />
          </div>
        </div>

        <small class="text-700" v-if="lastRef">
          Subido: {{ lastRef?.nombreOriginalArchivo }} ({{ lastRef?.mimeType }})
        </small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useMaintenanceStore } from "../../stores/maintenanceStore";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import Tag from "primevue/tag";
import UiDropdownBasic from "../../components/ui/Dropdown.vue";

const store = useMaintenanceStore();

const tipoOpts = [
  { label: "Preventivo", value: 1 },
  { label: "Correctivo", value: 2 },
  { label: "Alistamiento", value: 3 },
];

const filters = reactive<{ tipoId: number | null; vigiladold: string }>({
  tipoId: null,      
  vigiladold: '',    
});

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

async function fetch() {
  await store.programsFetch({
    ...(filters.tipoId ? { tipoId: filters.tipoId } : {}),
    ...(filters.vigiladold ? { vigiladold: filters.vigiladold } : {}),
  });
}

// Upload + Save
const filePicked = ref<File | null>(null);
const form = reactive<{ tipoId: 1 | 2 | 3 | null; vigiladold: string }>({
  tipoId: 1,
  vigiladold: "",
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

  // 1) tomar el vigiladoId: lo tipeado o, si está vacío, el user_id precargado
  const raw = String(form.vigiladold || "").trim();

  // 2) validar que sea NUMÉRICO
  if (!/^\d+$/.test(raw)) {
    // si usás toast:
    // toast.add({ severity: 'warn', summary: 'Vigilado ID inválido', detail: 'Debe ser numérico', life: 2500 });
    return;
  }
  const vigiladoIdNum = Number(raw); // <- casteo seguro

  saving.value = true;
  try {
    // 3) upload -> el endpoint recibe "vigiladoId" (string en FormData, pero numérico en contenido)
    await store.uploadFile(filePicked.value, String(vigiladoIdNum));

    // 4) create program con el mismo vigiladoId (como Number)
    const ref = store.files.lastRef as any;
    await store.programsCreate({
      tipoId: form.tipoId,
      documento: ref?.nombreAlmacenado,
      nombreOriginal: ref?.nombreOriginalArchivo,
      ruta: ref?.ruta,
      vigiladoId: vigiladoIdNum, // <- número
    });

    await fetch();
    filePicked.value = null;
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await fetch();
  form.vigiladold = form.vigiladold; // << prefill
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
</style>
