<template>
  <div class="bolt-wrap">

    <!-- ===================== -->
    <!-- TOOLBAR -->
    <!-- ===================== -->
    <div class="bolt-toolbar bolt-card">
      <div>
        <h2 class="title">Listado de Mantenimientos Correctivos</h2>
      </div>

      <div class="actions">
        <Button
          label="Exportar Excel"
          icon="pi pi-file-excel"
          class="btn-blue"
          @click="exportExcel"
        />
        <Button
          label="Nuevo Correctivo"
          icon="pi pi-plus"
          class="btn-dark-green"
          @click="showCreate = true"
        />
      </div>
    </div>

    <!-- ================= FILTROS ================= -->
    <div class="p-4 bg-white mb-3 rounded">
      <div class="grid gap-3 md:grid-cols-4">
        <div>
          <label>Placa</label>
          <input
            v-model="filters.placa"
            class="p-inputtext w-full"
            placeholder="ABC123"
          />
        </div>

        <div>
          <label>Fecha desde</label>
          <input
            type="date"
            v-model="filters.fechaDesde"
            class="p-inputtext w-full"
          />
        </div>

        <div>
          <label>Fecha hasta</label>
          <input
            type="date"
            v-model="filters.fechaHasta"
            class="p-inputtext w-full"
          />
        </div>

        <div class="flex gap-2 items-end">
          <button class="p-button p-button-primary" @click="fetchData">
            Filtrar
          </button>
          <button class="p-button p-button-secondary" @click="onClear">
            Limpiar
          </button>
        </div>
      </div>
    </div>

    <!-- ================= GRID ================= -->
    <EjsGrid
      ref="gridRef"
      :dataSource="tableData"
      height="600"
      :allowPaging="true"
      :pageSettings="{ pageSize: 15 }"
      :allowSorting="true"
      :allowExcelExport="true"
      :allowPdfExport="true"
      :toolbar="toolbar"
      :toolbarClick="toolbarClick"
    >
      <e-columns>


        <e-column field="Taller" headerText="Taller" width="20" />
        <e-column field="Mecanico" headerText="Mecánico" width="20" />
        <e-column field="Estado" headerText="Estado" width="20" />

      </e-columns>
    </EjsGrid>

    <!-- ================= MODAL DETALLE ================= -->
    <p-dialog
      v-model:visible="showDetail"
      modal
      header="Detalle del mantenimiento"
      style="width: 60vw"
    >
      <div v-if="selected">
        <p><b>Placa:</b> {{ selected.Placa }}</p>
        <p><b>Fecha:</b> {{ formatDate(selected.Fecha) }}</p>
        <p><b>Taller:</b> {{ selected.Taller }}</p>
        <p><b>Mecánico:</b> {{ selected.Mecanico }}</p>
        <p><b>Estado:</b> {{ selected.Estado }}</p>
      </div>
    </p-dialog>

    <!-- ================= MODAL NUEVO ================= -->
    <CorrectiveCreateDialog
      v-model:visible="showCreate"
      @save="saveFromDialog"
    />
  </div>
  
  <p>tableData:{{tableData}}:</p>

</template>

<script lang="ts">
import { ref, provide, onMounted } from "vue";
import Button from "primevue/button";

/* ===== Syncfusion ===== */
import {
  GridComponent,
  Page,
  Sort,
  Toolbar,
  ExcelExport,
  PdfExport
} from "@syncfusion/ej2-vue-grids";

/* ===== Store ===== */
import { useMaintenanceStore } from "../../stores/maintenanceStore";
import CorrectiveCreateDialog from "../../components/correctives/CorrectiveCreateDialog.vue";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default {
  name: "CorrectiveMaintenance",

  components: {
    EjsGrid: GridComponent,
    Button,
    CorrectiveCreateDialog,
    "e-columns": { template: "<slot />" },
    "e-column": { template: "<slot />" }
  },

  setup() {
    provide("grid", [Page, Sort, Toolbar, ExcelExport, PdfExport]);

    const gridRef = ref<any>(null);
    const tableData = ref<any[]>([]);

    const showDetail = ref(false);
    const showCreate = ref(false);
    const selected = ref<any>(null);

    const filters = ref({
      placa: "",
      fechaDesde: "",
      fechaHasta: ""
    });

    const toolbar = ref([]);
    const store = useMaintenanceStore();

    const showDetailModal = (rowData: any) => {
      selected.value = rowData;
      showDetail.value = true;
    };

    const onClear = () => {
      filters.value = {
        placa: "",
        fechaDesde: "",
        fechaHasta: ""
      };
      fetchData();
    };

    const toolbarClick = (args: any) => {
      if (args.item.id === "Grid_pdfexport") {
        gridRef.value?.pdfExport();
      } else if (args.item.id === "Grid_excelexport") {
        gridRef.value?.excelExport();
      }
    };

    const formatDate = (d: Date | null) => {
      if (!d) return "";
      return d.toISOString().slice(0, 10);
    };

    const dateAccessor = (_field: string, data: any) => {
      if (!data.Fecha) return "";
      const d = new Date(data.Fecha);
      return d.toISOString().slice(0, 10); // yyyy-MM-dd
    };


    function exportExcel() {
      if (!tableData.value.length) return;

      const data = tableData.value.map((r: any) => ({
        Placa: r.Placa,
        Fecha: formatDate(r.Fecha),
        //Fecha2: toYMD(item.ocurredAt),

        Taller: r.Taller,
        Mecánico: r.Mecanico,
        Estado: r.Estado
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Mantenimientos");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array"
      });

      saveAs(
        new Blob([excelBuffer], {
          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }),
        `mantenimientos_${Date.now()}.xlsx`
      );
    }

    async function saveFromDialog(data: any) {
      await store.correctiveCreateDetail(data);
      showCreate.value = false;
      await fetchData();
    }

    const toYMD = (value: any): string => {
      if (!value) return "";

      const d = value instanceof Date ? value : new Date(value);

      if (isNaN(d.getTime())) return "";

      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");

      return `${y}-${m}-${day}`;
    };


function formatDateTime(value?: string | Date) {
  if (!value) return '';

  const d = new Date(value);
  if (isNaN(d.getTime())) return '';

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');

  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function formatDateTimeLocal(value?: string | Date) {
  if (!value) return '';

  const d = new Date(value);
  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Bogota',
  }).format(d);
}


 const fetchData = async () => {
  try {
    const params = {
      numero_items: 15,
      page: 1,
      placa: filters.value.placa || undefined,
      fechaDesde: filters.value.fechaDesde || undefined,
      fechaHasta: filters.value.fechaHasta || undefined
    };

    await store.correctiveFetchList(params);

     // 👇 VER TODOS LOS CAMPOS DEL ENDPOINT
    /*if (store.correctiveList.items.length > 0) {
      console.log("Primer item completo:", store.correctiveList.items[0]);
      console.log("Todos los campos:", Object.keys(store.correctiveList.items[0]));
    }*/

    tableData.value = store.correctiveList.items.map((item: any) => {
      return {
        Placa: item.placa,
        Fecha: formatDateTimeLocal(item.occurredAt || item.updatedAt),
        //Fecha2: formatDateTime(item.ocurredAt),

        Taller: item.taller || item.razonSocial || "",
        Mecanico: item.mecanico || item.nombresResponsable || "",
        Estado: item.estado ? "Activo" : "Inactivo",

        // 👇 AGREGAR ESTOS DOS NUEVOS CAMPOS (opcional, para depuración)
        //_occurredAt: item.occurredAt,        // Fecha original sin formatear
        //OccurredAtFormatted: toYMD(item.occurredAt)  // Fecha formateada
      };
    });

  } catch (error) {
    console.error("Error cargando datos", error);
    tableData.value = [];
  }
};


    onMounted(fetchData);

    return {
      gridRef,
      tableData,
      filters,
      toolbar,
      showDetail,
      showCreate,
      selected,
      showDetailModal,
      onClear,
      toolbarClick,
      fetchData,
      exportExcel,
      saveFromDialog,
      formatDate
    };
  }
};
</script>



<style scoped>


.control-section {
  background: #f9fafb;
  padding: 1.5rem;
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

/* =====================================
   TABLA ACTIVIDADES – MODERNA SUAVE
   ===================================== */
.activities-table {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(13, 110, 253, 0.12);
}

/* Header */
.activities-table :deep(.p-datatable-thead > tr > th) {
  background: linear-gradient(
    135deg,
    #e7f1ff,
    #dbeafe
  );
  color: #1e3a8a !important;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.75rem;
  border: none;
}

/* Redondeo SOLO arriba */
.activities-table :deep(.p-datatable-thead > tr > th:first-child) {
  border-top-left-radius: 12px;
}
.activities-table :deep(.p-datatable-thead > tr > th:last-child) {
  border-top-right-radius: 12px;
}

/* Texto header (forzado) */
.activities-table :deep(.p-datatable-thead span),
.activities-table :deep(.p-datatable-thead div) {
  color: #1e3a8a !important;
}

/* Body */
.activities-table :deep(.p-datatable-tbody > tr > td) {
  background: #ffffff;
  padding: 0.7rem;
  font-size: 0.9rem;
}

/* Hover sutil */
.activities-table :deep(.p-datatable-tbody > tr:hover) {
  background: #f8fbff;
}

/* Checkbox centrado */
.activities-table :deep(.p-datatable-tbody > tr > td:first-child) {
  text-align: center;
}

/* Quitar líneas duras */
.activities-table :deep(.p-datatable-tbody > tr > td) {
  border-bottom: 1px solid #eef2ff;
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

:deep(.p-checkbox-box.p-highlight),
:deep(.p-checkbox.p-checkbox-checked .p-checkbox-box),
:deep(.p-checkbox.p-highlight .p-checkbox-box) {
  background: #16a34a !important;
  border-color: #16a34a !important;
}
:deep(.p-checkbox .p-checkbox-icon) {
  color: #fff !important;
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

.actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

</style>
