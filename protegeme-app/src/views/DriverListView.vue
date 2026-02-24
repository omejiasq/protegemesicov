<script setup lang="ts">
import { ref, reactive, onMounted, provide } from "vue";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";

import {
  GridComponent as EjsGrid,
  Page,
  Sort
} from "@syncfusion/ej2-vue-grids";

import { useDriversStore } from "../stores/driversStore";
import { useRouter } from "vue-router";

provide("grid", [Page, Sort]);

const toast = useToast();
const store = useDriversStore();
const router = useRouter();

/* =========================
   STATE
========================= */
const query = reactive({
  documento: "",
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
    documentNumber: query.documento || undefined,
    active: query.estado ?? undefined
  });
}

function onActionComplete(e: any) {
  if (e.requestType === "paging") {
    page.value = e.currentPage;
    pageSize.value = e.pageSize;
    refresh();
  }
}

function goToEdit(row: any) {
  router.push({
    name: "driver-edit",
    params: { id: row._id }
  });
}

const goToCreateDriver = () => {
  router.push({ name: "drivercreate" });
};

/* =========================
   ACCESSORS
========================= */

const nombreAccessor = (_field: string, data: any) => {
  return `${data?.nombres ?? ""} ${data?.apellidos ?? ""}`.trim();
};

const estadoAccessor = (_field: string, data: any) => {
  return data.active ? "Activo" : "Inactivo";
};

/* =========================
   LIFECYCLE
========================= */

onMounted(refresh);
</script>

<template>
  <div class="grid">

    <!-- ================= TOOLBAR ================= -->
    <div class="col-12 page-toolbar flex justify-between items-center">
      <h2 class="m-0">Gestión de Conductores</h2>
      <Button
        label="Nuevo Conductor"
        icon="pi pi-plus"
        class="p-button-success"
        @click="goToCreateDriver"
      />
    </div>

    <!-- ================= FILTROS ================= -->
    <div class="col-12 page-section table-card">
      <div class="filters-bar">
        <div class="grid formgrid">

          <!-- Documento -->
          <div class="col-12 md:col-5">
            <InputText
              v-model="query.documento"
              placeholder="Buscar por documento"
              class="w-full"
              @keydown.enter="refresh"
            />
          </div>

          <!-- Estado -->
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
                query.documento = '';
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
        @actionComplete="onActionComplete"
      >

        <e-columns>

          <e-column
            field="documento"
            headerText="Documento"
            width="150"
          />

          <e-column
            field="nombres"
            headerText="Nombre"
            width="200"
            :valueAccessor="nombreAccessor"
          />

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
            template="actionTemplate"
          />

        </e-columns>

        <!-- SLOT DE ACCIONES -->
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