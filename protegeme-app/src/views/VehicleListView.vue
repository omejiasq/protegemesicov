<script setup lang="ts">
import { ref, reactive, watch, onMounted, provide } from "vue";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import Tag from "primevue/tag";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
import Dialog from "primevue/dialog";

import {
  GridComponent as EjsGrid,
  Page,
  Sort
} from "@syncfusion/ej2-vue-grids";

import { useVehiclesStore } from "../stores/vehiclesStore";
import VehicleFormView from "../views/VehicleFormView.vue";

provide("grid", [Page, Sort]);

const toast = useToast();
const store = useVehiclesStore();

/* =========================
   STATE
========================= */
const query = reactive({
  placa: "",
  estado: null as null | boolean
});

const page = ref(1);
const pageSize = ref(10);

const showForm = ref(false);
const editingId = ref<string | null>(null);

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

function openCreate() {
  editingId.value = null;
  showForm.value = true;
}

function openEdit(row: any) {
  editingId.value = row?._id || null;
  showForm.value = true;
}

async function toggle(id: string) {
  try {
    await store.toggle(id);
    toast.add({
      severity: "success",
      summary: "Actualizado",
      detail: "Estado actualizado",
      life: 2500
    });
    refresh();
  } catch (e: any) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: e?.response?.data?.message || "No se pudo actualizar",
      life: 3500
    });
  }
}

/* =========================
   GRID EVENTS
========================= */
function onPageChange(args: any) {
  page.value = args.currentPage;
  pageSize.value = args.pageSize;
  refresh();
}

/* =========================
   LIFECYCLE
========================= */
watch([page, pageSize], refresh);
onMounted(refresh);
</script>

<template>
  <div class="grid">
    <!-- ================= TOOLBAR ================= -->
    <div class="col-12 page-toolbar flex justify-between items-center">
      <h2 class="m-0">Gestión de Vehículos</h2>
      <!--
      <Button
        label="Nuevo Vehículo"
        icon="pi pi-plus"
        class="p-button-success"
        @click="openCreate"
      />
      -->
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
        :dataSource="store.items"
        :allowPaging="true"
        :allowSorting="true"
        :pageSettings="{
          currentPage: page,
          pageSize: pageSize,
          totalRecordsCount: store.total
        }"
        height="550"
        @actionComplete="(e:any) => e.requestType === 'paging' && onPageChange(e)"
      >
        <e-columns>
          <e-column field="placa" headerText="Placa" width="120" />
          <e-column field="clase" headerText="Clase" width="120" />
          <e-column field="modelo" headerText="Modelo" width="100" />
          <e-column field="capacidad" headerText="Capacidad" width="120" />
          <e-column field="nombre_propietario" headerText="Propietario" width="180" />

          <e-column field="driver.usuario.nombre" headerText="Conductor" width="180" />

        </e-columns>
      </EjsGrid>
    </div>
  </div>

  <!-- ================= DIALOG ================= -->
  <Dialog
    v-model:visible="showForm"
    modal
    :header="editingId ? 'Editar Vehículo' : 'Nuevo Vehículo'"
    style="width: 650px"
  >
    <VehicleFormView
      :id="editingId"
      @saved="
        showForm = false;
        refresh();
      "
      @cancel="showForm = false"
    />
  </Dialog>
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
