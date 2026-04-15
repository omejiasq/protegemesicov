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

  <!-- ✅ SLOT VA AQUÍ DENTRO -->
  <template #actionTemplate="{ data }">
    <div class="flex gap-1 justify-center align-items-center">
      <Button
        icon="pi pi-pencil"
        class="p-button-text p-button-warning p-button-sm"
        v-tooltip.top="'Editar'"
        @click="goToEdit(data)"
      />
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
        <i class="pi pi-clock" /> Pendiente
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
</style>
