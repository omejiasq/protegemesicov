<template>
  <div class="maintenance-calendar-page">

    <!-- ================= HEADER ================= -->
    <header class="page-header">
      <div>
        <h2>Agenda Operativa de Flota</h2>
        <p>Vencimientos y ejecuciones de mantenimientos preventivos</p>
      </div>
      <div class="header-actions">
        <button class="btn-refresh" @click="fetchData" :disabled="loading">
          <i class="pi pi-refresh" :class="{ 'spin': loading }" />
          Actualizar
        </button>
      </div>
    </header>

    <!-- ================= LEYENDA ================= -->
    <section class="legend-bar">
      <span v-for="item in legend" :key="item.label" class="legend-item">
        <span class="legend-dot" :style="{ background: item.color }" />
        {{ item.label }}
      </span>
      <span class="legend-separator" />
      <span class="legend-stat">
        <b>{{ stats.vencidos }}</b> vencidos
      </span>
      <span class="legend-stat urgente">
        <b>{{ stats.porVencer }}</b> por vencer ≤15d
      </span>
      <span class="legend-stat ok">
        <b>{{ stats.ejecutados }}</b> ejecutados
      </span>
    </section>

    <!-- ================= CALENDAR ================= -->
    <section class="calendar-wrapper">
      <div v-if="loading" class="loading-overlay">
        <i class="pi pi-spin pi-spinner" style="font-size:2rem" />
        <p>Cargando mantenimientos...</p>
      </div>

      <ejs-schedule
        v-else
        height="720px"
        width="100%"
        :selectedDate="selectedDate"
        :eventSettings="eventSettings"
        :showQuickInfo="true"
        :allowDragAndDrop="false"
        :allowResizing="false"
        :currentView="'Month'"
        @eventRendered="onEventRendered"
        @popupOpen="onPopupOpen"
      >
        <e-views>
          <e-view option="Month" />
          <e-view option="Week" />
          <e-view option="Agenda" />
        </e-views>
      </ejs-schedule>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from "vue";
import {
  ScheduleComponent as EjsSchedule,
  ViewsDirective as EViews,
  ViewDirective as EView,
  Month,
  Week,
  Agenda,
} from "@syncfusion/ej2-vue-schedule";
import { useMaintenanceStore } from "../../stores/maintenanceStore";

provide("schedule", [Month, Week, Agenda]);

const store = useMaintenanceStore();
const loading = ref(false);
const selectedDate = new Date();

/* =============================
   COLORES
============================= */
const COLORS = {
  vencido:    "#ef4444", // 🔴 dueDate pasada sin ejecutar
  porVencer:  "#f97316", // 🟠 vence en ≤15 días
  ejecutado:  "#22c55e", // 🟢 tiene executedAt
  programado: "#3b82f6", // 🔵 scheduledAt futuro, sin ejecutar
};

const legend = [
  { label: "Vencido sin ejecutar", color: COLORS.vencido    },
  { label: "Vence en ≤15 días",    color: COLORS.porVencer  },
  { label: "Ejecutado",            color: COLORS.ejecutado  },
  { label: "Programado",           color: COLORS.programado },
];

/* =============================
   STATS REACTIVOS
============================= */
const events = ref<any[]>([]);

const stats = computed(() => ({
  vencidos:   events.value.filter(e => e.Tipo === "VENCIDO").length,
  porVencer:  events.value.filter(e => e.Tipo === "POR_VENCER").length,
  ejecutados: events.value.filter(e => e.Tipo === "EJECUTADO").length,
}));

/* =============================
   HELPERS DE FECHA
============================= */
function formatDateCO(value?: string | Date | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric", month: "2-digit", day: "2-digit",
    timeZone: "America/Bogota",
  }).format(d);
}

function daysDiff(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function startOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(8, 0, 0, 0);
  return d;
}

function endOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(9, 0, 0, 0);
  return d;
}

/* =============================
   CLASIFICAR Y CONSTRUIR EVENTOS
============================= */
function buildEvents(items: any[]): any[] {
  const result: any[] = [];
  let id = 1;

  for (const item of items) {
    const placa = (item.placa || "").toUpperCase();
    const taller = item.razonSocial || item.taller || "Sin taller";
    const mecanico = item.nombresResponsable || item.mecanico || "Sin mecánico";

    // ── Fecha de ejecución (executedAt) ──────────────────
    if (item.executedAt) {
      const d = new Date(item.executedAt);
      result.push({
        Id: id++,
        Subject: `✅ ${placa}`,
        StartTime: startOf(d),
        EndTime: endOf(d),
        Description: `Ejecutado: ${formatDateCO(d)} · ${taller} · ${mecanico}`,
        CategoryColor: COLORS.ejecutado,
        Tipo: "EJECUTADO",
        Placa: placa,
        Taller: taller,
        Mecanico: mecanico,
        FechaEjecucion: formatDateCO(item.executedAt),
        FechaVencimiento: formatDateCO(item.dueDate),
      });
    }

    // ── Fecha de vencimiento (dueDate) ───────────────────
    if (item.dueDate) {
      const d = new Date(item.dueDate);
      const diff = daysDiff(d);
      const yaEjecutado = !!item.executedAt;

      // Si ya fue ejecutado no mostrar como vencido/urgente
      if (!yaEjecutado) {
        let color = COLORS.programado;
        let tipo = "PROGRAMADO";
        let emoji = "📅";

        if (diff < 0) {
          color = COLORS.vencido;
          tipo = "VENCIDO";
          emoji = "⛔";
        } else if (diff <= 15) {
          color = COLORS.porVencer;
          tipo = "POR_VENCER";
          emoji = "⚠️";
        }

        result.push({
          Id: id++,
          Subject: `${emoji} ${placa} · vence ${diff < 0 ? `hace ${Math.abs(diff)}d` : `en ${diff}d`}`,
          StartTime: startOf(d),
          EndTime: endOf(d),
          Description: `Vencimiento: ${formatDateCO(d)} · ${taller} · ${mecanico}`,
          CategoryColor: color,
          Tipo: tipo,
          Placa: placa,
          Taller: taller,
          Mecanico: mecanico,
          FechaEjecucion: formatDateCO(item.executedAt),
          FechaVencimiento: formatDateCO(item.dueDate),
          DiasRestantes: diff,
        });
      }
    }
  }

  return result;
}

/* =============================
   FETCH DATA
============================= */
async function fetchData() {
  loading.value = true;
  try {
    await store.preventiveFetchList({ numero_items: 500, page: 1 });
    // ✅ Solo activos
    const soloActivos = (store.preventiveList.items || []).filter(
      (item: any) => item.estado === true
    );
    
    events.value = buildEvents(soloActivos);
    
  } catch (e) {
    console.error("Error cargando preventivos:", e);
  } finally {
    loading.value = false;
  }
}

/* =============================
   EVENT SETTINGS
============================= */
const eventSettings = computed(() => ({
  dataSource: events.value,
  fields: {
    id:          "Id",
    subject:     { name: "Subject"    },
    startTime:   { name: "StartTime"  },
    endTime:     { name: "EndTime"    },
    description: { name: "Description"},
  },
}));

/* =============================
   RENDER COLOR
============================= */
function onEventRendered(args: any) {
  const color = args.data?.CategoryColor;
  if (color && args.element) {
    args.element.style.backgroundColor = color;
    args.element.style.borderColor = color;
    args.element.style.color = "#fff";
    args.element.style.borderRadius = "6px";
    args.element.style.fontWeight = "500";
    args.element.style.fontSize = "11px";
  }
}

/* =============================
   QUICK INFO ENRIQUECIDO
============================= */
function onPopupOpen(args: any) {
  if (args.type !== "QuickInfo") return;
  const d = args.data;
  if (!d?.Placa) return;

  // Enriquecer el quickInfo con datos extra
  const container = args.element?.querySelector(".e-popup-content");
  if (container) {
    container.innerHTML = `
      <div style="font-size:13px;line-height:1.8">
        <div><b>🚗 Placa:</b> ${d.Placa}</div>
        <div><b>🔧 Taller:</b> ${d.Taller}</div>
        <div><b>👷 Mecánico:</b> ${d.Mecanico}</div>
        <div><b>📅 Vencimiento:</b> ${d.FechaVencimiento}</div>
        <div><b>✅ Ejecutado:</b> ${d.FechaEjecucion || "Pendiente"}</div>
        ${d.DiasRestantes !== undefined ? `
          <div style="margin-top:6px;padding:4px 8px;border-radius:6px;
            background:${d.CategoryColor}20;color:${d.CategoryColor};font-weight:600">
            ${d.DiasRestantes < 0
              ? `Vencido hace ${Math.abs(d.DiasRestantes)} días`
              : `Vence en ${d.DiasRestantes} días`}
          </div>` : ""}
      </div>
    `;
  }
}

onMounted(fetchData);
</script>

<style scoped>
.maintenance-calendar-page {
  padding: 16px;
  background: #f8fafc;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-header h2 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: #0f172a;
}
.page-header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.9rem;
}
.btn-refresh {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
}
.btn-refresh:hover { background: #1d4ed8; }
.btn-refresh:disabled { opacity: 0.6; cursor: not-allowed; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Leyenda */
.legend-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  background: #fff;
  padding: 10px 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: #374151;
  font-weight: 500;
}
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-separator {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
  margin: 0 4px;
}
.legend-stat {
  font-size: 0.82rem;
  color: #6b7280;
}
.legend-stat b { color: #ef4444; }
.legend-stat.urgente b { color: #f97316; }
.legend-stat.ok b { color: #22c55e; }

/* Calendar */
.calendar-wrapper {
  background: #fff;
  border-radius: 16px;
  padding: 8px;
  box-shadow: 0 10px 28px rgba(0,0,0,0.06);
  position: relative;
}
.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  gap: 12px;
  color: #64748b;
}

@media (max-width: 768px) {
  .legend-bar { gap: 8px; }
  .legend-item { font-size: 0.75rem; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 8px; }
}
</style>