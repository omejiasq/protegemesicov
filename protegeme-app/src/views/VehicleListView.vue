<script setup lang="ts">
import { computed, ref, reactive, watch, onMounted, provide } from "vue";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
import { VehiclesserviceApi } from "../api/vehicles.service";
import { useVehiclesStore } from "../stores/vehiclesStore";

import {
  GridComponent as EjsGrid,
  Page,
  Sort
} from "@syncfusion/ej2-vue-grids";
import { useRouter } from "vue-router";

// 👇 ESTO FALTABA (o estaba mal escrito)
const vehiclesStore = useVehiclesStore();

const vehiclesForGrid = computed(() =>
  vehiclesStore.items.map(v => ({
    ...v,
    __actions: null // 👈 campo virtual SOLO para el Grid
  }))
);

provide("grid", [Page, Sort]);

const toast = useToast();
const store = useVehiclesStore();
const router = useRouter();

/* =========================
   ACTION TEMPLATE (SYNCFUSION)
========================= */
const actionTemplate = (args: any) => {
  const row = args.data;

  const btn = document.createElement('button');
  btn.className = 'p-button p-button-text p-button-warning p-button-sm';
  btn.innerHTML = '<span class="pi pi-pencil"></span>';

  btn.onclick = () => {
    router.push({
      name: 'vehicle-edit',
      params: { id: row._id }
    });
  };

  return btn;
};



const estadoAccessor = (_field: string, data: any) => {
  if (data.active && data.deactivation_estado === 'pendiente') return 'Desactivación pendiente'
  if (!data.active && data.activation_estado === 'pendiente') return 'Activación pendiente'
  return data.active ? 'Activo' : 'Inactivo'
}


/* =========================
   STATE
========================= */
const query = reactive({
  placa: "",
  estado: null as null | boolean
});

const page = ref(1);
const pageSize = ref(10);

/* =========================
   METHODS
========================= */
function refresh() {
  clearSelection()
  store.fetch({
    page: page.value,
    numero_items: pageSize.value,
    placa: query.placa || undefined,
    estado: query.estado ?? undefined
  });
}

/* =========================
   GRID EVENTS
========================= */
function onPageChange(args: any) {
  page.value = args.currentPage;
  pageSize.value = args.pageSize;
  refresh();
}

function onActionComplete(e: any) {
  if (e.requestType === "paging") {
    page.value = e.currentPage;
    pageSize.value = e.pageSize;
    refresh();
  }
}
const conductorAccessor = (_field: string, data: any) => {
  return data?.driver?.usuario?.nombre ?? "";
};

const statusTemplate = (props: any) => {
  return props.active
    ? 'Activo'
    : 'Inactivo'
}


/* =========================
   LIFECYCLE
========================= */

//onMounted(refresh);
onMounted(() => {
  vehiclesStore.fetch();
})

function goToEdit(row: any) {
  router.push({
    name: "vehicle-edit",
    params: { id: row._id }
  });
}

const goToCreateVehicle = () => {
  router.push({ name: 'vehiclescreate' })
}

const verDetalle = (row: any) => {
  console.log('Fila:', row)
}

// ── Desactivación ────────────────────────────────────────────────────
const deactivateModalVisible = ref(false)
const deactivateTarget = ref<any>(null)
const deactivateNota = ref('')
const deactivating = ref(false)

function openDeactivate(row: any) {
  deactivateTarget.value = row
  deactivateNota.value = ''
  deactivateModalVisible.value = true
}

async function confirmDeactivate() {
  if (!deactivateTarget.value) return
  deactivating.value = true
  try {
    await VehiclesserviceApi.deactivate(deactivateTarget.value._id, deactivateNota.value)
    toast.add({
      severity: 'success',
      summary: 'Solicitud enviada',
      detail: `Solicitud de desactivación de ${deactivateTarget.value.placa} enviada al administrador`,
      life: 4000,
    })
    deactivateModalVisible.value = false
    vehiclesStore.fetch()
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.response?.data?.message || 'No se pudo enviar la solicitud',
      life: 4000,
    })
  } finally {
    deactivating.value = false
  }
}

// ── Activación (individual) ──────────────────────────────────────────
const activateModalVisible = ref(false)
const activateTarget = ref<any>(null)
const activateNota = ref('')
const activating = ref(false)

// ── Selección manual de filas ────────────────────────────────────────
const selectedIds = ref<string[]>([])

function isSelected(id: string) {
  return selectedIds.value.includes(id)
}
function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}
function clearSelection() {
  selectedIds.value = []
}

const inactiveSelected = computed(() =>
  vehiclesStore.items.filter(v => selectedIds.value.includes(v._id) && !v.active && v.activation_estado !== 'pendiente')
)
const activeSelected = computed(() =>
  vehiclesStore.items.filter(v => selectedIds.value.includes(v._id) && v.active && v.deactivation_estado !== 'pendiente')
)

// ── Activación masiva ────────────────────────────────────────────────
const bulkActivateModalVisible = ref(false)
const bulkActivateNota = ref('')
const bulkActivating = ref(false)

function openBulkActivate() {
  bulkActivateNota.value = ''
  bulkActivateModalVisible.value = true
}

async function confirmBulkActivate() {
  const ids = inactiveSelected.value.map((v: any) => v._id)
  if (!ids.length) return
  bulkActivating.value = true
  try {
    await VehiclesserviceApi.requestActivationBulk(ids, bulkActivateNota.value)
    toast.add({
      severity: 'success',
      summary: 'Solicitud enviada',
      detail: `Solicitud de activación enviada para ${ids.length} vehículo(s)`,
      life: 4000,
    })
    bulkActivateModalVisible.value = false
    clearSelection()
    vehiclesStore.fetch()
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.response?.data?.message || 'No se pudo enviar la solicitud',
      life: 4000,
    })
  } finally {
    bulkActivating.value = false
  }
}

// ── Desactivación masiva ─────────────────────────────────────────────
const bulkDeactivateModalVisible = ref(false)
const bulkDeactivateNota = ref('')
const bulkDeactivating = ref(false)

function openBulkDeactivate() {
  bulkDeactivateNota.value = ''
  bulkDeactivateModalVisible.value = true
}

async function confirmBulkDeactivate() {
  const ids = activeSelected.value.map((v: any) => v._id)
  if (!ids.length) return
  bulkDeactivating.value = true
  try {
    await VehiclesserviceApi.requestDeactivationBulk(ids, bulkDeactivateNota.value)
    toast.add({
      severity: 'success',
      summary: 'Solicitud enviada',
      detail: `Solicitud de desactivación enviada para ${ids.length} vehículo(s)`,
      life: 4000,
    })
    bulkDeactivateModalVisible.value = false
    clearSelection()
    vehiclesStore.fetch()
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.response?.data?.message || 'No se pudo enviar la solicitud',
      life: 4000,
    })
  } finally {
    bulkDeactivating.value = false
  }
}

function openActivate(row: any) {
  activateTarget.value = row
  activateNota.value = ''
  activateModalVisible.value = true
}

async function confirmActivate() {
  if (!activateTarget.value) return
  activating.value = true
  try {
    await VehiclesserviceApi.requestActivation(activateTarget.value._id, activateNota.value)
    toast.add({
      severity: 'success',
      summary: 'Solicitud enviada',
      detail: `Solicitud de activación de ${activateTarget.value.placa} enviada al administrador`,
      life: 4000,
    })
    activateModalVisible.value = false
    vehiclesStore.fetch()
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.response?.data?.message || 'No se pudo enviar la solicitud',
      life: 4000,
    })
  } finally {
    activating.value = false
  }
}
</script>


<template>
  <div class="grid">
    <!-- ================= TOOLBAR ================= -->
    <div class="col-12 page-toolbar flex justify-between items-center">
      <h2 class="m-0">Gestión de Vehículos</h2>
      
      <Button
        label="Nuevo Vehículo"
        icon="pi pi-plus"
        class="p-button-success"
        @click="goToCreateVehicle"
      />
      
    </div>

    <!-- ================= FILTROS ================= -->
    <div class="col-12 page-section table-card">
      <div class="filters-bar">
        <div class="grid formgrid">
          <div class="col-12 md:col-5">
            <span class="p-input-icon-left w-full search-field">
              <i class="pi pi-search" />
              <InputText
                v-model="query.placa"
                placeholder="Buscar por placa"
                class="w-full"
                @keydown.enter="refresh"
              />
            </span>
          </div>

          <div class="col-12 md:col-3">
            <Dropdown
              class="w-full"
              :options="[
                { label: 'Todos los estados', value: null },
                { label: 'Activos', value: true },
                { label: 'Inactivos', value: false }
              ]"
              optionLabel="label"
              optionValue="value"
              v-model="query.estado"
              placeholder="Estado"
              @change="refresh"
            />
          </div>

          <div class="col-6 md:col-2">
            <Button
              label="Filtrar"
              icon="pi pi-filter"
              class="w-full"
              @click="refresh"
            />
          </div>

          <div class="col-6 md:col-2">
            <Button
              label="Limpiar"
              icon="pi pi-times"
              class="w-full p-button-secondary"
              @click="
                query.placa = '';
                query.estado = null;
                page = 1;
                refresh();
              "
            />
          </div>
        </div>
      </div>

      <!-- ================= BARRAS ACCIONES MASIVAS ================= -->
      <div v-if="inactiveSelected.length > 0" class="bulk-action-bar bulk-activate">
        <span class="bulk-info">
          <i class="pi pi-check-square" />
          {{ inactiveSelected.length }} vehículo(s) inactivo(s) seleccionado(s)
        </span>
        <Button
          label="Solicitar activación"
          icon="pi pi-send"
          class="p-button-success p-button-sm"
          @click="openBulkActivate"
        />
      </div>
      <div v-if="activeSelected.length > 0" class="bulk-action-bar bulk-deactivate">
        <span class="bulk-info bulk-info-red">
          <i class="pi pi-check-square" />
          {{ activeSelected.length }} vehículo(s) activo(s) seleccionado(s)
        </span>
        <Button
          label="Solicitar desactivación"
          icon="pi pi-send"
          class="p-button-danger p-button-sm"
          @click="openBulkDeactivate"
        />
      </div>

      <!-- ================= GRID SYNCFUSION ================= -->
<EjsGrid
  :dataSource="vehiclesStore.items"
  :allowPaging="true"
  :allowSorting="true"
  :pageSettings="{
    currentPage: page,
    pageSize: pageSize,
    totalRecordsCount: vehiclesStore.total
  }"
>
  <e-columns>
    <e-column
      headerText=""
      width="50"
      textAlign="Center"
      :allowSorting="false"
      :allowFiltering="false"
      template="selectTemplate"
    />
    <e-column field="placa" headerText="Placa" width="120" />
    <e-column field="no_interno" headerText="No Interno" width="120" />
    <e-column field="modelo" headerText="Modelo" width="100" />
    <e-column field="nombre_propietario" headerText="Propietario" width="180" />
    <e-column field="driver.usuario.nombre" headerText="Conductor" width="180" />
<e-column
  field="active"
  headerText="Estado"
  width="120"
  textAlign="Center"
  :valueAccessor="estadoAccessor"
/>



    <e-column
    
      headerText="Acciones"
      width="120"
      textAlign="Center"
      :allowSorting="false"
      :allowFiltering="false"
      :allowGrouping="false"
      :allowResizing="false"
      :allowEditing="false"
      template="actionTemplate"
    />
  </e-columns>

  <!-- Checkbox de selección manual -->
  <template #selectTemplate="{ data }">
    <div class="flex justify-center">
      <input
        type="checkbox"
        class="row-checkbox"
        :checked="isSelected(data._id)"
        @change="toggleSelect(data._id)"
      />
    </div>
  </template>

  <!-- ✅ SLOT VA AQUÍ DENTRO -->
  <template #actionTemplate="{ data }">
    <div class="flex gap-1 justify-center align-items-center">
      <Button
        icon="pi pi-pencil"
        class="p-button-text p-button-warning p-button-sm"
        v-tooltip.top="'Editar'"
        @click="goToEdit(data)"
      />
      <!-- Botón desactivar: solo si está activo y sin solicitud pendiente -->
      <Button
        v-if="data.active && data.deactivation_estado !== 'pendiente'"
        icon="pi pi-ban"
        class="p-button-text p-button-danger p-button-sm"
        v-tooltip.top="'Solicitar desactivación'"
        @click="openDeactivate(data)"
      />
      <span
        v-if="data.active && data.deactivation_estado === 'pendiente'"
        class="deact-pending-badge"
        v-tooltip.top="'Desactivación pendiente de aprobación'"
      >
        <i class="pi pi-clock" /> Pendiente desact.
      </span>

      <!-- Botón activar: solo si está inactivo y sin solicitud pendiente -->
      <Button
        v-if="!data.active && data.activation_estado !== 'pendiente'"
        icon="pi pi-check-circle"
        class="p-button-text p-button-success p-button-sm"
        v-tooltip.top="'Solicitar activación'"
        @click="openActivate(data)"
      />
      <span
        v-if="!data.active && data.activation_estado === 'pendiente'"
        class="act-pending-badge"
        v-tooltip.top="'Activación pendiente de aprobación'"
      >
        <i class="pi pi-clock" /> Pendiente act.
      </span>
    </div>
  </template>

</EjsGrid>

<!-- ================= MODAL DESACTIVACIÓN ================= -->
<div
  v-if="deactivateModalVisible"
  class="modal-overlay"
  @click.self="deactivateModalVisible = false"
>
  <div class="modal-card">
    <div class="modal-header">
      <h3>Solicitar desactivación</h3>
      <button class="modal-close" @click="deactivateModalVisible = false">
        <i class="pi pi-times" />
      </button>
    </div>

    <div class="modal-body">
      <p class="mb-3">
        Va a enviar una solicitud de desactivación para el vehículo
        <strong>{{ deactivateTarget?.placa }}</strong>.
        El vehículo permanecerá activo hasta que el administrador de la plataforma apruebe la solicitud.
      </p>

      <div class="field">
        <label class="field-label">Nota de desactivación <span class="required">*</span></label>
        <textarea
          v-model="deactivateNota"
          rows="3"
          placeholder="Indique el motivo de desactivación..."
          class="p-inputtext w-full"
          style="resize: vertical; font-family: inherit;"
        />
      </div>
    </div>

    <div class="modal-footer">
      <Button
        label="Cancelar"
        icon="pi pi-times"
        class="p-button-secondary p-button-outlined"
        :disabled="deactivating"
        @click="deactivateModalVisible = false"
      />
      <Button
        label="Enviar solicitud"
        icon="pi pi-send"
        class="p-button-danger"
        :loading="deactivating"
        :disabled="!deactivateNota.trim()"
        @click="confirmDeactivate"
      />
    </div>
  </div>
</div>



<!-- ================= MODAL ACTIVACIÓN ================= -->
<div
  v-if="activateModalVisible"
  class="modal-overlay"
  @click.self="activateModalVisible = false"
>
  <div class="modal-card">
    <div class="modal-header">
      <h3>Solicitar activación</h3>
      <button class="modal-close" @click="activateModalVisible = false">
        <i class="pi pi-times" />
      </button>
    </div>

    <div class="modal-body">
      <p class="mb-3">
        Va a enviar una solicitud de activación para el vehículo
        <strong>{{ activateTarget?.placa }}</strong>.
        El vehículo permanecerá inactivo hasta que el administrador de la plataforma apruebe la solicitud.
      </p>

      <div class="field">
        <label class="field-label">Motivo de activación <span class="required">*</span></label>
        <textarea
          v-model="activateNota"
          rows="3"
          placeholder="Indique el motivo por el que solicita la activación del vehículo..."
          class="p-inputtext w-full"
          style="resize: vertical; font-family: inherit;"
        />
      </div>
    </div>

    <div class="modal-footer">
      <Button
        label="Cancelar"
        icon="pi pi-times"
        class="p-button-secondary p-button-outlined"
        :disabled="activating"
        @click="activateModalVisible = false"
      />
      <Button
        label="Enviar solicitud"
        icon="pi pi-send"
        class="p-button-success"
        :loading="activating"
        :disabled="!activateNota.trim()"
        @click="confirmActivate"
      />
    </div>
  </div>
</div>

    </div>
  </div>

<!-- ================= MODAL DESACTIVACIÓN MASIVA ================= -->
<div
  v-if="bulkDeactivateModalVisible"
  class="modal-overlay"
  @click.self="bulkDeactivateModalVisible = false"
>
  <div class="modal-card">
    <div class="modal-header">
      <h3>Solicitar desactivación masiva</h3>
      <button class="modal-close" @click="bulkDeactivateModalVisible = false">
        <i class="pi pi-times" />
      </button>
    </div>

    <div class="modal-body">
      <p class="mb-3">
        Va a enviar una solicitud de desactivación para los siguientes <strong>{{ activeSelected.length }}</strong> vehículo(s):
      </p>
      <div class="plates-list mb-3">
        <span
          v-for="v in activeSelected"
          :key="v._id"
          class="plate-chip plate-chip-red"
        >{{ v.placa }}</span>
      </div>
      <p class="mb-3 text-sm text-gray-600">
        Los vehículos permanecerán activos hasta que el administrador de la plataforma apruebe la solicitud.
      </p>

      <div class="field">
        <label class="field-label">Motivo de desactivación <span class="required">*</span></label>
        <textarea
          v-model="bulkDeactivateNota"
          rows="3"
          placeholder="Indique el motivo por el que solicita la desactivación de estos vehículos..."
          class="p-inputtext w-full"
          style="resize: vertical; font-family: inherit;"
        />
      </div>
    </div>

    <div class="modal-footer">
      <Button
        label="Cancelar"
        icon="pi pi-times"
        class="p-button-secondary p-button-outlined"
        :disabled="bulkDeactivating"
        @click="bulkDeactivateModalVisible = false"
      />
      <Button
        label="Enviar solicitud"
        icon="pi pi-send"
        class="p-button-danger"
        :loading="bulkDeactivating"
        :disabled="!bulkDeactivateNota.trim()"
        @click="confirmBulkDeactivate"
      />
    </div>
  </div>
</div>

<!-- ================= MODAL ACTIVACIÓN MASIVA ================= -->
<div
  v-if="bulkActivateModalVisible"
  class="modal-overlay"
  @click.self="bulkActivateModalVisible = false"
>
  <div class="modal-card">
    <div class="modal-header">
      <h3>Solicitar activación masiva</h3>
      <button class="modal-close" @click="bulkActivateModalVisible = false">
        <i class="pi pi-times" />
      </button>
    </div>

    <div class="modal-body">
      <p class="mb-3">
        Va a enviar una solicitud de activación para los siguientes <strong>{{ inactiveSelected.length }}</strong> vehículo(s):
      </p>
      <div class="plates-list mb-3">
        <span
          v-for="v in inactiveSelected"
          :key="v._id"
          class="plate-chip"
        >{{ v.placa }}</span>
      </div>
      <p class="mb-3 text-sm text-gray-600">
        Los vehículos permanecerán inactivos hasta que el administrador de la plataforma apruebe la solicitud.
      </p>

      <div class="field">
        <label class="field-label">Motivo de activación <span class="required">*</span></label>
        <textarea
          v-model="bulkActivateNota"
          rows="3"
          placeholder="Indique el motivo por el que solicita la activación de estos vehículos..."
          class="p-inputtext w-full"
          style="resize: vertical; font-family: inherit;"
        />
      </div>
    </div>

    <div class="modal-footer">
      <Button
        label="Cancelar"
        icon="pi pi-times"
        class="p-button-secondary p-button-outlined"
        :disabled="bulkActivating"
        @click="bulkActivateModalVisible = false"
      />
      <Button
        label="Enviar solicitud"
        icon="pi pi-send"
        class="p-button-success"
        :loading="bulkActivating"
        :disabled="!bulkActivateNota.trim()"
        @click="confirmBulkActivate"
      />
    </div>
  </div>
</div>

</template>

<style scoped>
.search-field:deep(.p-inputtext) {
  width: 100%;
  padding-left: 2.25rem;
}
.search-field {
  position: relative;
  display: block;
}
.search-field > i {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

/* ── Modal ───────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-card {
  background: #fff;
  border-radius: 8px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
}
.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #6b7280;
}
.modal-body {
  padding: 1.25rem;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid #e5e7eb;
}
.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field-label { font-size: 0.85rem; font-weight: 600; color: #374151; }
.required { color: #ef4444; }
.deact-pending-badge { display: inline-flex; align-items: center; gap: 0.25rem; background: #fef3c7; color: #92400e; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600; white-space: nowrap; }
.act-pending-badge { display: inline-flex; align-items: center; gap: 0.25rem; background: #dcfce7; color: #166534; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600; white-space: nowrap; }

/* ── Barra de acciones masivas ───────────────────────────────── */
.bulk-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 6px;
  padding: 0.6rem 1rem;
  margin-bottom: 0.5rem;
}
.bulk-activate {
  background: #f0fdf4;
  border: 1px solid #86efac;
}
.bulk-deactivate {
  background: #fef2f2;
  border: 1px solid #fca5a5;
}
.bulk-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #166534;
  font-weight: 600;
  font-size: 0.9rem;
}
.bulk-info-red {
  color: #991b1b;
}

/* ── Checkbox de fila ────────────────────────────────────────── */
.row-checkbox {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
  accent-color: #2563eb;
}

/* ── Chips de placas en modal masivo ─────────────────────────── */
.plates-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.plate-chip {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.plate-chip-red {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fca5a5;
}
</style>
