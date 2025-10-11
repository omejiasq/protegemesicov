<template>
  <div class="bolt-wrap">
    <!-- Encabezado -->
    <div class="bolt-toolbar bolt-card">
      <div class="left">
        <h2 class="title">Novedades — Incidentes</h2>
        <p class="subtitle">Listado y alta de novedades</p>
      </div>
      <div class="right">
        <Button
          label="Nueva Novedad"
          icon="pi pi-plus"
          class="btn-dark-green"
          @click="openCreate"
        />
      </div>
    </div>

    <div class="bolt-card mt-3 p-3">
      <div class="grid align-items-center">
        <div class="">
          <div class="p-inputgroup">
            <SearchBar v-model="q.find" :width="'700px'" @search="refresh" />
          </div>
        </div>

        <div class="col-12 md:col-2 flex align-items-center">
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

      <div class="mt-3">
        <DataTable
          :value="store.incidentsList.items"
          paginator
          :rows="q.numero_items"
          :totalRecords="total"
          lazy
          @page="onPage"
          :loading="loading"
          class="p-datatable-sm"
        >
          <Column
            field="idDespacho"
            header="ID Despacho"
            style="width: 120px"
          />
          <Column
            header="Tipo"
            field="tipoNovedadId"
            :body="typeBody"
            style="min-width: 140px"
          />
          <Column
            field="descripcion"
            header="Descripción"
            style="min-width: 250px"
          />
          <Column
            header="Otros"
            field="otros"
            :body="dateBody"
            style="width: 180px"
          />
          <Column header="Estado" style="width: 120px">
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
                  icon="pi pi-pencil"
                  class="btn-icon-white statebutton"
                  @click="openEdit(data)"
                />
                <Button
                  :icon="data?.estado ? 'pi pi-ban' : 'pi pi-check'"
                  class="btn-icon-white"
                  @click="toggleState(data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>

    <!-- Dialog alta/edicion -->
    <Dialog
      v-model:visible="dlg.visible"
      :modal="true"
      :closable="false"
      :style="{ width: '640px' }"
    >
      <template #header>
        <div class="flex align-items-center gap-2">
          <h3 class="m-0">
            {{ dlg.isEditing ? "Editar Novedad" : "Nueva Novedad" }}
          </h3>
        </div>
      </template>

      <div class="p-fluid grid">
        <div class="field col-12 md:col-6">
          <label class="block mb-2 text-900">ID Despacho</label>
          <InputNumber
            v-model="form.idDespacho"
            :useGrouping="false"
            placeholder="Número de despacho (ej. 1234)"
            :min="0"
          />
        </div>

        <div class="field col-12 md:col-6">
          <label class="block mb-2 text-900">Tipo Novedad</label>
          <UiDropdownBasic
            v-model="form.tipoNovedadId"
            :options="tipoOptions"
            placeholder="Seleccione"
          />
        </div>

        <div class="field col-12">
          <label class="block mb-2 text-900">Descripción</label>
          <Textarea v-model="form.descripcion" rows="4" class="w-full" />
        </div>

        <div class="field col-12">
          <label class="block mb-2 text-900">Otros (opcional)</label>
          <Textarea v-model="form.otros" rows="3" class="w-full" />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-content-end gap-2">
          <Button
            label="Cancelar"
            class="p-button-text"
            @click="dlg.visible = false"
          />
          <Button :label="dlg.isEditing ? 'Guardar' : 'Crear'" @click="save" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
/* IncidentsView.vue
   Copiar-pegar directo en: src/views/incidents/IncidentsView.vue
   Nota: usa IncidentsserviceApi definido en src/api/incidents.service.ts
*/
import { reactive, ref, onMounted } from "vue";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Textarea from "primevue/textarea";
import UiDropdownBasic from "../components/ui/Dropdown.vue";
import { useToast } from "primevue/usetoast";
import { Tag } from "primevue";

import SearchBar from "../components/ui/SearchBar.vue";
import Button from "../components/ui/Button.vue";

import { useIncidentsStore } from "../stores/incidentsStore";
const store = useIncidentsStore();

const toast = useToast();

console.log(
  "%cprotegeme-app\src\views\IncidentsView.vue:169 store.incidents",
  "color: #007acc;",
  store.incidentsList
);

const tipoOptions = [
  { label: "1", value: 1 },
  { label: "2", value: 2 },
];

const q = reactive({
  page: 1,
  numero_items: 10,
  find: "",
  tipoNovedadId: null as number | null,
});

const items = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);

const dlg = reactive({
  visible: false,
  isEditing: false,
});

const form = reactive({
  _id: null as string | null,
  idDespacho: 0 as number,
  tipoNovedadId: 1 as number,
  descripcion: "",
  otros: "",
});

function mapServerItem(it: any) {
  // Ajustes/normalizaciones si hacen falta
  return it;
}

async function fetchList() {
  loading.value = true;
  try {
    const params: any = {
      page: q.page,
      numero_items: q.numero_items,
    };
    if (q.find) params.find = q.find;
    if (q.tipoNovedadId) params.tipoNovedadId = q.tipoNovedadId;

    const resp = await store.incidentsFetchList(params);
    const payload =
      resp && typeof resp === "object" && "data" in resp ? resp.data : resp;
    const arr = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data)
      ? payload.data
      : [];
    items.value = arr.map(mapServerItem);
    total.value = payload?.total ?? (Array.isArray(arr) ? arr.length : 0);
  } catch (e: any) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: e?.response?.data?.message || e?.message || "No se pudo cargar",
    });
  } finally {
    loading.value = false;
  }
}

function onPage(e: any) {
  q.page = (e.page ?? 0) + 1;
  q.numero_items = e.rows ?? q.numero_items;
  fetchList();
}

function openCreate() {
  dlg.visible = true;
  dlg.isEditing = false;
  form._id = null;
  form.idDespacho = 0; // enviamos 0 por defecto (no null)
  form.tipoNovedadId = 1;
  form.descripcion = "";
  form.otros = "";
}

function openEdit(row: any) {
  dlg.visible = true;
  dlg.isEditing = true;
  form._id = row._id || row.id || null;
  form.idDespacho = Number(row.idDespacho ?? 0); // normalizamos a número (0 si falta)
  form.tipoNovedadId = Number(row.tipoNovedadId ?? 1);
  form.descripcion = row.descripcion ?? "";
  form.otros = row.otros ?? "";
}

async function save() {
  try {
    const payload: any = {
      idDespacho: Number(form.idDespacho),
      tipoNovedadId: Number(form.tipoNovedadId),
      descripcion: (form.descripcion || "").toString().slice(0, 500),
      otros: form.otros || undefined,
    };
    if (dlg.isEditing && form._id) {
      await store.incidentUpdate(String(form._id), payload);
      toast.add({
        severity: "success",
        summary: "Guardado",
        detail: "Novedad actualizada",
      });
    } else {
      await store.incidentCreate(payload);
      toast.add({
        severity: "success",
        summary: "Creado",
        detail: "Novedad creada",
      });
    }
    dlg.visible = false;
    await fetchList();
  } catch (e: any) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: e?.response?.data?.message || e?.message || "Error",
    });
  }
}

async function toggleState(row: any) {
  try {
    await store.incidentToggle(row._id || row.id);
    toast.add({
      severity: "success",
      summary: "Actualizado",
      detail: "Estado cambiado",
    });
    await fetchList();
  } catch (e: any) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: e?.response?.data?.message || e?.message || "Error",
    });
  }
}

function typeBody(data: any) {
  return (
    tipoOptions.find((t) => t.value === data.tipoNovedadId)?.label ||
    String(data.tipoNovedadId)
  );
}

function dateBody(data: any) {
  const s = data.createdAt || data.fecha || data.created_at;
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return String(s);
  }
}

function estadoBody(row: any) {
  const v = row?.estado;
  if (v === true || v === "true" || v === 1 || v === "1") return "Activo";
  if (v === false || v === "false" || v === 0 || v === "0" || v == null)
    return "Inactivo";
  console.log(
    "%cprotegeme-app\src\views\IncidentsView.vue:339 v",
    "color: #007acc;",
    v
  );
  return v ? "Activo" : "Inactivo";
}

function refresh() {
  q.page = 1;
  fetchList();
}

async function clearFilters() {
  // reset UI filters
  q.find = '';
  q.tipoNovedadId = null;
  q.page = 1;

  // If there's a Pinia store with incidentsFetchList, use it (preferred)
  if (typeof store !== 'undefined' && typeof store.incidentsFetchList === 'function') {
    try {
      // reset store filters if present
      if (store.incidentsList && store.incidentsList.filters) {
        store.incidentsList.filters = { find: '', idDespacho: undefined, estado: undefined };
        store.incidentsList.page = 1;
      }
      await store.incidentsFetchList({ page: 1, numero_items: q.numero_items });
    } catch (e: any) {
      if (typeof toast !== 'undefined') {
        toast.add({ severity: 'error', summary: 'Error', detail: e?.response?.data?.message || e?.message || 'No se pudo limpiar filtros' });
      }
    }
    return;
  }

  // Fallback: call API directly and update local refs (items, total, loading) if exist
  if (typeof loading !== 'undefined' && 'value' in loading) loading.value = true;
  try {
    const params: any = { page: q.page, numero_items: q.numero_items };
    const resp: any = await store.incidentsFetchList(params);
    const payload = resp && typeof resp === 'object' && 'data' in resp ? resp.data : resp;
    const arr = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data)
      ? payload.data
      : [];

    if (typeof items !== 'undefined' && 'value' in items) {
      items.value = Array.isArray(arr) ? arr.map(mapServerItem) : [];
    }
    if (typeof total !== 'undefined' && 'value' in total) {
      total.value = payload?.total ?? (Array.isArray(arr) ? arr.length : 0);
    }
  } catch (e: any) {
    if (typeof toast !== 'undefined') {
      toast.add({ severity: 'error', summary: 'Error', detail: e?.response?.data?.message || e?.message || 'No se pudo limpiar filtros' });
    }
  } finally {
    if (typeof loading !== 'undefined' && 'value' in loading) loading.value = false;
  }
}

onMounted(async () => {
  await fetchList();
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
label {
  color: #111 !important;
}
</style>
