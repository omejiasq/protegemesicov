<script setup lang="ts">
import { computed, ref, reactive, watch, onMounted, provide } from "vue";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
//import { computed, ref, onMounted } from 'vue';

import {
  GridComponent as EjsGrid,
  Page,
  Sort
} from "@syncfusion/ej2-vue-grids";

import { useVehiclesStore } from "../stores/vehiclesStore";
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
  // navegación o modal aquí
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
    <e-column field="clase" headerText="Clase" width="120" />
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
    <Button
      icon="pi pi-pencil"
      class="p-button-text p-button-warning p-button-sm"
      @click="goToEdit(data)"
    />
  </template>

</EjsGrid>



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
</style>
