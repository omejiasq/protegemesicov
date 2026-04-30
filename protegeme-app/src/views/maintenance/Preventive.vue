<template>
  <div class="bolt-wrap">

    <!-- ===================== TOOLBAR ===================== -->
    <div class="bolt-toolbar bolt-card">
      <div>
        <h2 class="title">Mantenimientos Preventivos</h2>
      </div>
      <div class="actions">
        <Button
          label="Exportar Excel"
          icon="pi pi-file-excel"
          class="btn-blue"
          @click="exportExcel"
        />
        <Button
          label="Planificación masiva"
          icon="pi pi-calendar-plus"
          class="btn-orange"
          @click="showBulk = true"
        />
        <Button
          label="Nuevo Preventivo"
          icon="pi pi-plus"
          class="btn-dark-green"
          @click="showCreate = true"
        />
      </div>
    </div>

    <!-- ===================== PANEL: PRÓXIMOS A VENCER ===================== -->
    <div class="expiry-panel">
      <div class="expiry-card red" @click="applyExpiryFilter('vencidos')">
        <i class="pi pi-exclamation-circle expiry-icon" />
        <div>
          <div class="expiry-num">{{ expiryStats.vencidos }}</div>
          <div class="expiry-label">Vencidos</div>
        </div>
      </div>
      <div class="expiry-card orange" @click="applyExpiryFilter('7dias')">
        <i class="pi pi-clock expiry-icon" />
        <div>
          <div class="expiry-num">{{ expiryStats.vence7 }}</div>
          <div class="expiry-label">Vencen en 7 días</div>
        </div>
      </div>
      <div class="expiry-card yellow" @click="applyExpiryFilter('30dias')">
        <i class="pi pi-calendar expiry-icon" />
        <div>
          <div class="expiry-num">{{ expiryStats.vence30 }}</div>
          <div class="expiry-label">Vencen en 30 días</div>
        </div>
      </div>
      <div class="expiry-card blue" @click="applyExpiryFilter('planeados')">
        <i class="pi pi-list-check expiry-icon" />
        <div>
          <div class="expiry-num">{{ expiryStats.planeados }}</div>
          <div class="expiry-label">Planeados pendientes</div>
        </div>
      </div>
      <div class="expiry-card green" @click="applyExpiryFilter('')">
        <i class="pi pi-check-circle expiry-icon" />
        <div>
          <div class="expiry-num">{{ expiryStats.ejecutados }}</div>
          <div class="expiry-label">Ejecutados (activos)</div>
        </div>
      </div>
    </div>

    <!-- ===================== FILTROS ===================== -->
    <div class="p-4 bg-white mb-3 rounded">
      <div class="grid gap-3 md:grid-cols-5">
        <div>
          <label>Placa</label>
          <input v-model="filters.placa" class="p-inputtext w-full" placeholder="ABC123" />
        </div>
        <div>
          <label>Fecha desde</label>
          <input type="date" v-model="filters.fechaDesde" class="p-inputtext w-full" />
        </div>
        <div>
          <label>Fecha hasta</label>
          <input type="date" v-model="filters.fechaHasta" class="p-inputtext w-full" />
        </div>
        <div>
          <label>Estado</label>
          <select v-model="filters.estado" class="p-inputtext w-full">
            <option value="">Todos</option>
            <option value="planeado">Planeados</option>
            <option value="ejecutado">Ejecutados</option>
            <option value="vencido">Vencidos</option>
          </select>
        </div>
        <div class="flex gap-2 items-end">
          <button class="p-button p-button-primary" @click="fetchData">Filtrar</button>
          <button class="p-button p-button-secondary" @click="onClear">Limpiar</button>
        </div>
      </div>
    </div>

    <!-- ===================== GRID ===================== -->
    <EjsGrid
      ref="gridRef"
      :dataSource="tableData"
      height="520"
      :allowPaging="true"
      :pageSettings="{ pageSize: 15 }"
      :allowSorting="true"
      :allowExcelExport="true"
      :toolbar="toolbar"
      :toolbarClick="toolbarClick"
    >
      <e-columns>
        <e-column field="Placa" headerText="Placa" width="100" />
        <e-column field="NoInterno" headerText="No. Interno" width="110" />
        <e-column field="Estado" headerText="Estado" width="130" template="estadoTemplate" />
        <e-column field="Fecha_planeada" headerText="Fecha planeada" width="150" />
        <e-column field="Fecha_ejecutada" headerText="Fecha ejecutada" width="150" />
        <e-column field="Fecha_vencimiento" headerText="Vencimiento" width="150" />
        <e-column field="Taller" headerText="Taller" width="160" />
        <e-column field="Mecanico" headerText="Mecánico" width="150" />
        <e-column headerText="Acciones" width="130" textAlign="Center"
          :allowSorting="false" :allowFiltering="false"
          template="accionesTemplate"
        />
      </e-columns>

      <template #estadoTemplate="{ data }">
        <span :class="['estado-badge', `estado-${data._estadoClave}`]">
          {{ data.Estado }}
        </span>
      </template>

      <template #accionesTemplate="{ data }">
        <div class="acciones-cell">
          <Button
            icon="pi pi-file-pdf"
            class="p-button-text p-button-info p-button-sm"
            title="Ver reporte"
            @click="goToReport(data)"
          />

        </div>
      </template>
    </EjsGrid>

    <!-- ===================== MODAL DETALLE ===================== -->
    <p-dialog v-model:visible="showDetail" modal header="Detalle del mantenimiento" style="width: 60vw">
      <div v-if="selected">
        <p><b>Placa:</b> {{ selected.Placa }}</p>
        <p><b>Taller:</b> {{ selected.Taller }}</p>
        <p><b>Mecánico:</b> {{ selected.Mecanico }}</p>
        <p><b>Estado:</b> {{ selected.Estado }}</p>
      </div>
    </p-dialog>

    <!-- ===================== MODAL NUEVO ===================== -->
    <PreventiveCreateDialog v-model:visible="showCreate" @save="saveFromDialog" />

    <!-- ===================== MODAL PLANIFICACIÓN MASIVA ===================== -->
    <PreventiveBulkPlanDialog v-model:visible="showBulk" @done="fetchData" />

    <!-- ===================== MODAL EVIDENCIA + IA ===================== -->
    <EvidenceUploadDialog
      v-model:visible="showEvidence"
      :maintenance="selectedForEvidence"
      @saved="fetchData"
    />

    <!-- ===================== MODAL CONFIRMAR EJECUTADO ===================== -->
    <p-dialog v-model:visible="showExecuteDialog" modal header="Marcar como ejecutado" style="width: 420px">
      <div v-if="selectedForExecute" class="execute-dialog-body">
        <p>Vehículo: <b>{{ selectedForExecute.Placa }}</b></p>
        <p class="execute-note">
          Al confirmar, este mantenimiento se enviará a <b>Supertransporte</b> con la fecha de ejecución indicada.
        </p>
        <div class="field mt-3">
          <label>Fecha de ejecución real</label>
          <input type="date" v-model="executeDate" class="p-inputtext w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" class="p-button-text" @click="showExecuteDialog = false" />
        <Button label="Confirmar ejecución" icon="pi pi-check" class="btn-dark-green"
          :loading="executingSicov" @click="confirmExecute" />
      </template>
    </p-dialog>

  </div>
</template>

<script lang="ts">
import { ref, computed, provide, onMounted, reactive } from "vue";
import Button from "primevue/button";
import {
  GridComponent, ColumnsDirective, ColumnDirective,
  Page, Sort, Toolbar, ExcelExport, PdfExport
} from "@syncfusion/ej2-vue-grids";
import { useMaintenanceStore } from "../../stores/maintenanceStore";
import { MaintenanceserviceApi } from "../../api/maintenance.service";
import PreventiveCreateDialog from "../../components/preventives/PreventiveCreateDialog.vue";
import PreventiveBulkPlanDialog from "../../components/preventives/PreventiveBulkPlanDialog.vue";
import EvidenceUploadDialog from "../../components/preventives/EvidenceUploadDialog.vue";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useRouter } from "vue-router";

export default {
  name: "PreventiveMaintenance",
  components: {
    EjsGrid: GridComponent,
    EColumns: ColumnsDirective,
    EColumn: ColumnDirective,
    Button,
    PreventiveCreateDialog,
    PreventiveBulkPlanDialog,
    EvidenceUploadDialog,
  },

  setup() {
    provide("grid", [Page, Sort, Toolbar, ExcelExport, PdfExport]);

    const gridRef = ref<any>(null);
    const tableData = ref<any[]>([]);
    const rawItems = ref<any[]>([]);
    const showDetail = ref(false);
    const showCreate = ref(false);
    const showBulk = ref(false);
    const showExecuteDialog = ref(false);
    const showEvidence = ref(false);
    const selected = ref<any>(null);
    const selectedForExecute = ref<any>(null);
    const selectedForEvidence = ref<any>(null);
    const executeDate = ref(new Date().toISOString().slice(0, 10));
    const executingSicov = ref(false);
    const router = useRouter();
    const store = useMaintenanceStore();
    const toolbar = ref([]);

    const filters = ref({ placa: "", fechaDesde: "", fechaHasta: "", estado: "" });

    // ── Estadísticas de vencimiento ────────────────────────
    const now = new Date();
    const in7 = new Date(now); in7.setDate(in7.getDate() + 7);
    const in30 = new Date(now); in30.setDate(in30.getDate() + 30);

    const expiryStats = computed(() => {
      const items = rawItems.value;
      return {
        vencidos: items.filter(i => !i.isPlanned && i.dueDate && new Date(i.dueDate) < now && !i.executedAt).length,
        vence7:   items.filter(i => !i.isPlanned && i.dueDate && new Date(i.dueDate) >= now && new Date(i.dueDate) <= in7).length,
        vence30:  items.filter(i => !i.isPlanned && i.dueDate && new Date(i.dueDate) > in7 && new Date(i.dueDate) <= in30).length,
        planeados: items.filter(i => i.isPlanned).length,
        ejecutados: items.filter(i => !i.isPlanned && i.executedAt && i.estado).length,
      };
    });

    function applyExpiryFilter(tipo: string) {
      filters.value.estado = tipo === "vencidos" ? "vencido"
        : tipo === "planeados" ? "planeado"
        : tipo === "7dias" || tipo === "30dias" ? "ejecutado"
        : "";
      filters.value.placa = "";
      applyLocalFilter();
    }

    function getEstadoClave(item: any): string {
      if (item.isPlanned) return "planeado";
      const due = item.dueDate ? new Date(item.dueDate) : null;
      if (due && due < now) return "vencido";
      return "ejecutado";
    }

    function getEstadoLabel(clave: string): string {
      if (clave === "planeado") return "Planeado";
      if (clave === "vencido") return "Vencido";
      return "Ejecutado";
    }

    // ── Navegación ──────────────────────────────────────────
    const goToReport = (row: any) => router.push({ name: "preventive-report", params: { id: row._id } });

    // ── Marcar como ejecutado ───────────────────────────────
    function marcarEjecutado(row: any) {
      selectedForExecute.value = row;
      executeDate.value = new Date().toISOString().slice(0, 10);
      showExecuteDialog.value = true;
    }

    function abrirEvidencia(row: any) {
      selectedForEvidence.value = row;
      showEvidence.value = true;
    }

    async function confirmExecute() {
      if (!selectedForExecute.value) return;
      executingSicov.value = true;
      try {
        await MaintenanceserviceApi.executePreventive(
          selectedForExecute.value._id,
          executeDate.value
        );
        showExecuteDialog.value = false;
        await fetchData();
      } catch {
        alert("Error al marcar como ejecutado. Intente de nuevo.");
      } finally {
        executingSicov.value = false;
      }
    }

    // ── Formato de fecha ────────────────────────────────────
    function formatDT(value?: string | Date) {
      if (!value) return "";
      const d = new Date(value);
      if (isNaN(d.getTime())) return "";
      return new Intl.DateTimeFormat("es-CO", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
        timeZone: "America/Bogota",
      }).format(d);
    }

    function formatDate(d: Date | null) {
      if (!d) return "";
      return d.toISOString().slice(0, 10);
    }

    // ── Fetch datos ─────────────────────────────────────────
    async function fetchData() {
      try {
        const params = {
          numero_items: 200,
          page: 1,
          placa: filters.value.placa || undefined,
          fechaDesde: filters.value.fechaDesde || undefined,
          fechaHasta: filters.value.fechaHasta || undefined,
        };
        await store.preventiveFetchList(params);
        rawItems.value = store.preventiveList.items ?? [];
        applyLocalFilter();
      } catch {
        tableData.value = [];
      }
    }

    function applyLocalFilter() {
      let items = rawItems.value;
      if (filters.value.estado) {
        items = items.filter(i => getEstadoClave(i) === filters.value.estado);
      }
      tableData.value = items.map((item: any) => {
        const clave = getEstadoClave(item);
        return {
          _id: item._id,
          _estadoClave: clave,
          Placa: item.placa,
          NoInterno: item.no_interno || "",
          Estado: getEstadoLabel(clave),
          Fecha_planeada: formatDT(item.scheduledAt),
          Fecha_ejecutada: item.isPlanned ? "—" : formatDT(item.executedAt),
          Fecha_vencimiento: formatDT(item.dueDate),
          Taller: item.razonSocial ?? "",
          Mecanico: item.nombresResponsable ?? "",
        };
      });
    }

    // ── Acciones toolbar ────────────────────────────────────
    const onClear = () => {
      filters.value = { placa: "", fechaDesde: "", fechaHasta: "", estado: "" };
      fetchData();
    };

    const toolbarClick = (args: any) => {
      if (args.item.id === "Grid_pdfexport") gridRef.value?.pdfExport();
      else if (args.item.id === "Grid_excelexport") gridRef.value?.excelExport();
    };

    function exportExcel() {
      if (!tableData.value.length) return;
      const data = tableData.value.map((r: any) => ({
        Placa: r.Placa,
        "No. Interno": r.NoInterno || "",
        Estado: r.Estado,
        "Fecha planeada": r.Fecha_planeada,
        "Fecha ejecutada": r.Fecha_ejecutada,
        Vencimiento: r.Fecha_vencimiento,
        Taller: r.Taller,
        Mecánico: r.Mecanico,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Preventivos");
      saveAs(
        new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `preventivos_${Date.now()}.xlsx`
      );
    }

    async function saveFromDialog(data: any) {
      await store.preventiveCreateDetail(data);
      showCreate.value = false;
      await fetchData();
    }

    onMounted(fetchData);

    return {
      gridRef, tableData, filters, toolbar, showDetail, showCreate, showBulk,
      showExecuteDialog, selectedForExecute, executeDate, executingSicov,
      selected, expiryStats,
      onClear, toolbarClick, fetchData, exportExcel,
      saveFromDialog, formatDate, goToReport,
      marcarEjecutado, confirmExecute, applyExpiryFilter, abrirEvidencia,
      showEvidence, selectedForEvidence,
    };
  },
};
</script>

<style scoped>
.bolt-wrap { display: grid; gap: 1rem; }

.bolt-card {
  background: #fff !important;
  color: #111 !important;
  border: 1px solid rgba(17,17,17,0.06);
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(17,17,17,0.05);
}
.bolt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
}
.bolt-toolbar .title { margin: 0; font-weight: 700; }
.actions { display: flex; gap: 0.75rem; align-items: center; }

/* ── Panel próximos a vencer ────────── */
.expiry-panel {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.expiry-card {
  flex: 1;
  min-width: 130px;
  border-radius: 12px;
  padding: 0.9rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}
.expiry-card:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0,0,0,0.12); }
.expiry-card.red    { background: #fef2f2; border: 1px solid #fecaca; }
.expiry-card.orange { background: #fff7ed; border: 1px solid #fed7aa; }
.expiry-card.yellow { background: #fefce8; border: 1px solid #fef08a; }
.expiry-card.blue   { background: #eff6ff; border: 1px solid #bfdbfe; }
.expiry-card.green  { background: #f0fdf4; border: 1px solid #bbf7d0; }
.expiry-icon { font-size: 1.6rem; }
.expiry-card.red    .expiry-icon { color: #dc2626; }
.expiry-card.orange .expiry-icon { color: #ea580c; }
.expiry-card.yellow .expiry-icon { color: #ca8a04; }
.expiry-card.blue   .expiry-icon { color: #2563eb; }
.expiry-card.green  .expiry-icon { color: #16a34a; }
.expiry-num { font-size: 1.6rem; font-weight: 800; line-height: 1; }
.expiry-card.red    .expiry-num { color: #dc2626; }
.expiry-card.orange .expiry-num { color: #ea580c; }
.expiry-card.yellow .expiry-num { color: #ca8a04; }
.expiry-card.blue   .expiry-num { color: #2563eb; }
.expiry-card.green  .expiry-num { color: #16a34a; }
.expiry-label { font-size: 0.78rem; color: #6b7280; margin-top: 0.15rem; }

/* ── Badges de estado ──────────────── */
.estado-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.78rem;
  font-weight: 600;
}
.estado-ejecutado { background: #dcfce7; color: #166534; }
.estado-planeado  { background: #dbeafe; color: #1e40af; }
.estado-vencido   { background: #fee2e2; color: #991b1b; }

/* ── Acciones en grid ──────────────── */
.acciones-cell { display: flex; gap: 0.25rem; justify-content: center; }

/* ── Modal ejecutar ────────────────── */
.execute-dialog-body { font-size: 0.93rem; }
.execute-note { color: #2563eb; font-size: 0.85rem; margin: 0.5rem 0; }

/* ── Botones ───────────────────────── */
:deep(.p-button.btn-dark-green) { background: #16a34a; border-color: #16a34a; color: #fff; }
:deep(.p-button.btn-blue) { background: #2563eb; border-color: #2563eb; color: #fff; }
:deep(.p-button.btn-orange) { background: #ea580c; border-color: #ea580c; color: #fff; }
:deep(.p-button.btn-dark-green:hover) { background: #15803d; border-color: #15803d; }
:deep(.p-button.btn-blue:hover) { background: #1d4ed8; border-color: #1d4ed8; }
:deep(.p-button.btn-orange:hover) { background: #c2410c; border-color: #c2410c; }

/* ── Dialog claro ──────────────────── */
:deep(.p-dialog .p-dialog-header),
:deep(.p-dialog .p-dialog-content),
:deep(.p-dialog .p-dialog-footer) { background: #fff !important; color: #111 !important; }
</style>
