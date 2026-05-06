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

    <!-- ================= GRID SECTION ================= -->
    <div class="col-12 page-section table-card">
      <!-- ================= GRID SYNCFUSION ================= -->
      <ejs-grid
        ref="grid"
        id="DriversGrid"
        :dataSource="driversStore.items"
        :toolbar="toolbarOptions"
        :allowPdfExport="true"
        :allowExcelExport="true"
        :toolbarClick="toolbarClick"
        :excelExportComplete="excelExportComplete"
        :pdfExportComplete="pdfExportComplete"
        :allowPaging="true"
        :pageSettings="pageSettings"
        :allowSorting="true"
        :showColumnChooser="true"
        :allowFiltering="true"
        :filterSettings="filterOptions"
      >
        <e-columns>
          <!-- Columnas visibles por defecto -->
          <e-column
            field="usuario.documentNumber"
            headerText="Documento"
            width="150"
            :valueAccessor="documentoAccessor"
          />
          <e-column
            field="usuario.nombre"
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
          
          <!-- Columnas ocultas por defecto - disponibles en ColumnChooser -->
          <e-column
            field="usuario.apellido"
            headerText="Apellido"
            width="150"
            :visible="false"
            :valueAccessor="apellidoAccessor"
          />
          <e-column
            field="usuario.telefono"
            headerText="Teléfono"
            width="150"
            :visible="false"
            :valueAccessor="telefonoAccessor"
          />
          <e-column
            field="usuario.correo"
            headerText="Correo"
            width="200"
            :visible="false"
            :valueAccessor="correoAccessor"
          />
          <e-column
            field="no_licencia_conduccion"
            headerText="No. Licencia"
            width="150"
            :visible="false"
          />
          <e-column
            field="vencimiento_licencia_conduccion"
            headerText="Vence Licencia"
            width="150"
            :visible="false"
            type="date"
            format="yyyy-MM-dd"
          />
          
          <!-- Columna de acciones -->
          <e-column
            headerText="Acciones"
            width="120"
            textAlign="Center"
            :allowSorting="false"
            :allowFiltering="false"
            :allowExporting="false"
            :template="actionTemplate"
          />
        </e-columns>
      </ejs-grid>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import { useDriversStore } from "../stores/driversStore";
import { useRouter } from "vue-router";
import { createApp } from "vue/dist/vue.esm-bundler.js";

import {
  GridComponent,
  ColumnDirective,
  ColumnsDirective,
  Page,
  Sort,
  Toolbar,
  PdfExport,
  ExcelExport,
  ColumnChooser,
  Filter
} from '@syncfusion/ej2-vue-grids';

export default defineComponent({
  name: 'DriverListView',
  components: {
    'ejs-grid': GridComponent,
    'e-column': ColumnDirective,
    'e-columns': ColumnsDirective,
    Button
  },
  provide: {
    grid: [Page, Sort, Toolbar, PdfExport, ExcelExport, ColumnChooser, Filter]
  },
  setup() {
    const toast = useToast();
    const driversStore = useDriversStore();
    const router = useRouter();
    const grid = ref<any>(null);

    // Syncfusion Grid Options
    const toolbarOptions = ['PdfExport', 'ExcelExport', 'ColumnChooser'];
    const filterOptions = { type: "Excel" };
    const pageSettings = { pageCount: 8, pageSize: 10 };

    // Value Accessors
    const nombreAccessor = (_field: string, data: any) => {
      return data?.usuario?.nombre?.trim() ?? "";
    };

    const apellidoAccessor = (_field: string, data: any) => {
      return data?.usuario?.apellido?.trim() ?? "";
    };

    const documentoAccessor = (_field: string, data: any) => {
      return data?.usuario?.documentNumber ?? "";
    };

    const telefonoAccessor = (_field: string, data: any) => {
      return data?.usuario?.telefono ?? "";
    };

    const correoAccessor = (_field: string, data: any) => {
      return data?.usuario?.correo ?? "";
    };

    const estadoAccessor = (_field: string, data: any) => {
      return data.active ? "Activo" : "Inactivo";
    };

    // Action Template
    const actionTemplate = function () {
      return {
        template: createApp({}).component('actionTemplate', {
          template: `<div class="flex justify-center">
            <button
              @click="goToEdit(data._id)"
              class="p-button p-button-text p-button-warning p-button-sm"
              title="Editar"
            >
              <i class="pi pi-pencil"></i>
            </button>
          </div>`,
          methods: {
            goToEdit(id: string) {
              router.push({ name: 'driver-edit', params: { id } });
            }
          },
          data: function () {
            return { data: { data: {} } };
          },
        }),
      };
    };

    // Methods
    const goToCreateDriver = () => {
      router.push({ name: 'drivercreate' });
    };

    function toolbarClick(args: any) {
      if (args.item.id === 'DriversGrid_pdfexport') {
        grid.value.showSpinner();
        grid.value.pdfExport({
          fileName: `conductores_${new Date().toISOString().split('T')[0]}.pdf`,
          pageOrientation: 'Landscape',
          pageSize: 'A4'
        });
      } else if (args.item.id === 'DriversGrid_excelexport') {
        grid.value.showSpinner();
        grid.value.excelExport({
          fileName: `conductores_${new Date().toISOString().split('T')[0]}.xlsx`
        });
      }
    }

    function pdfExportComplete() {
      grid.value.hideSpinner();
    }

    function excelExportComplete() {
      grid.value.hideSpinner();
    }

    // Lifecycle
    onMounted(() => {
      driversStore.fetch({});
    });

    return {
      grid,
      driversStore,
      toolbarOptions,
      filterOptions,
      pageSettings,
      nombreAccessor,
      apellidoAccessor,
      documentoAccessor,
      telefonoAccessor,
      correoAccessor,
      estadoAccessor,
      actionTemplate,
      toolbarClick,
      pdfExportComplete,
      excelExportComplete,
      goToCreateDriver
    };
  }
});
</script>

<style scoped>
.page-toolbar {
  margin-bottom: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.page-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1rem;
}
</style>
