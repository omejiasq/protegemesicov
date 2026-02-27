<script setup lang="ts">
import { ref, reactive, onMounted, provide } from "vue";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";

import {
  GridComponent as EjsGrid,
  Page,
  Sort,
} from "@syncfusion/ej2-vue-grids";

import { useStaffStore } from "../stores/staffStore";
import { useRouter } from "vue-router";

provide("grid", [Page, Sort]);

const toast = useToast();
const store = useStaffStore();
const router = useRouter();

/* =========================
   STATE
========================= */
const query = reactive({
  search: "",
  roleType: null as string | null,
  estado: null as null | boolean,
});

const page = ref(1);
const pageSize = ref(10);

/* =========================
   METHODS
========================= */
function refresh() {
  store.fetch({
    search: query.search || undefined,
    roleType: query.roleType ?? undefined,
    active: query.estado ?? undefined,
  });
}

function onActionComplete(e: any) {
  if (e.requestType === "paging") {
    page.value = e.currentPage;
  }
}

function goToEdit(row: any) {
  router.push({ name: "staff-edit", params: { id: row._id } });
}

function goToCreate() {
  router.push({ name: "staff-create" });
}

/* =========================
   ACCESSORS
========================= */
const nombreAccessor = (_field: string, data: any) => {
  const nombre   = data?.usuario?.nombre?.trim() ?? "";
  const apellido = data?.usuario?.apellido?.trim() ?? "";
  return `${nombre} ${apellido}`.trim();
};

const usuarioAccessor = (_field: string, data: any) =>
  data?.usuario?.usuario ?? "";

const documentoAccessor = (_field: string, data: any) =>
  data?.usuario?.documentNumber ?? "";

const correoAccessor = (_field: string, data: any) =>
  data?.usuario?.correo ?? "";

const rolAccessor = (_field: string, data: any) => {
  const map: Record<string, string> = {
    admin:    "Administrador",
    operator: "Inspector",
    viewer:   "Visualizador",
  };
  return map[data?.roleType] ?? data?.roleType ?? "";
};

const estadoAccessor = (_field: string, data: any) =>
  data.active ? "Activo" : "Inactivo";

/* =========================
   LIFECYCLE
========================= */
onMounted(refresh);
</script>

<template>
  <div class="grid">

    <!-- TOOLBAR -->
    <div class="col-12 page-toolbar flex justify-between items-center">
      <h2 class="m-0">Gestión de Usuarios</h2>
      <Button
        label="Nuevo Usuario"
        icon="pi pi-plus"
        class="p-button-success"
        @click="goToCreate"
      />
    </div>

    <!-- FILTROS -->
    <div class="col-12 page-section table-card">
      <div class="filters-bar">
        <div class="grid formgrid">

          <!-- Búsqueda -->
          <div class="col-12 md:col-4">
            <InputText
              v-model="query.search"
              placeholder="Buscar por nombre, usuario o correo"
              class="w-full"
              @keydown.enter="refresh"
            />
          </div>

          <!-- Rol -->
          <div class="col-12 md:col-3">
            <Dropdown
              class="w-full"
              :options="[
                { label: 'Todos los roles', value: null },
                { label: 'Administrador',   value: 'admin' },
                { label: 'Operador',        value: 'operator' },
                { label: 'Visualizador',    value: 'viewer' },
              ]"
              optionLabel="label"
              optionValue="value"
              v-model="query.roleType"
              placeholder="Rol"
            />
          </div>

          <!-- Estado -->
          <div class="col-12 md:col-2">
            <Dropdown
              class="w-full"
              :options="[
                { label: 'Todos',     value: null },
                { label: 'Activos',   value: true },
                { label: 'Inactivos', value: false },
              ]"
              optionLabel="label"
              optionValue="value"
              v-model="query.estado"
              placeholder="Estado"
            />
          </div>

          <div class="col-6 md:col-1">
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
                query.search = '';
                query.roleType = null;
                query.estado = null;
                page = 1;
                refresh();
              "
            />
          </div>

        </div>
      </div>

      <!-- GRID -->
      <EjsGrid
        :dataSource="store.items"
        :allowPaging="true"
        :allowSorting="true"
        :pageSettings="{ pageSize }"
        @actionComplete="onActionComplete"
      >
        <e-columns>

          <e-column
            field="usuario.documentNumber"
            headerText="Documento"
            width="140"
            :valueAccessor="documentoAccessor"
          />

          <e-column
            field="usuario.nombre"
            headerText="Nombre"
            width="180"
            :valueAccessor="nombreAccessor"
          />

          <e-column
            field="usuario.usuario"
            headerText="Usuario"
            width="150"
            :valueAccessor="usuarioAccessor"
          />

          <e-column
            field="usuario.correo"
            headerText="Correo"
            width="200"
            :valueAccessor="correoAccessor"
          />

          <e-column
            field="roleType"
            headerText="Rol"
            width="130"
            textAlign="Center"
            :valueAccessor="rolAccessor"
          />

          <e-column
            field="active"
            headerText="Estado"
            width="110"
            textAlign="Center"
            :valueAccessor="estadoAccessor"
          />

          <e-column
            headerText="Acciones"
            width="100"
            textAlign="Center"
            :allowSorting="false"
            template="actionTemplate"
          />

        </e-columns>

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