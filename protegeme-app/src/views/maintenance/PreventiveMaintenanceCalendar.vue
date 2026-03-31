<template>
  <div class="maintenance-calendar-page">

    <!-- ================= HEADER ================= -->
    <header class="page-header">
      <div>
        <h2>Agenda Operativa de Flota</h2>
        <p>Mantenimientos preventivos y vencimientos de documentos</p>
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
        <p>Cargando calendario...</p>
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
import { useVehiclesStore } from "../../stores/vehiclesStore";
import { useDriversStore } from "../../stores/driversStore";

provide("schedule", [Month, Week, Agenda]);

const store = useMaintenanceStore();
const vehiclesStore = useVehiclesStore();
const driversStore = useDriversStore();
const loading = ref(false);
const selectedDate = new Date();

/* =============================
   COLORES — Mantenimientos preventivos
============================= */
const COLORS = {
  vencido:    "#ef4444", // 🔴 dueDate pasada sin ejecutar
  porVencer:  "#f97316", // 🟠 vence en ≤15 días
  ejecutado:  "#22c55e", // 🟢 tiene executedAt
  programado: "#3b82f6", // 🔵 scheduledAt futuro
  planeado:   "#a855f7", // 🟣 planeado para futuro (no ejecutado aún)
  // Documentos de vehículo
  soat:        "#8b5cf6", // 🟣 SOAT
  tecnomecanica: "#0891b2", // 🔵 Tecnomecánica
  tarjetaOpera:  "#f59e0b", // 🟡 Tarjeta Operación
  licencia:      "#ec4899", // 🩷 Licencia conducción
};

const legend = [
  { label: "Mant. vencido",     color: COLORS.vencido    },
  { label: "Mant. vence ≤15d",  color: COLORS.porVencer  },
  { label: "Mant. ejecutado",   color: COLORS.ejecutado  },
  { label: "Mant. planeado",    color: COLORS.planeado   },
  { label: "SOAT",              color: COLORS.soat       },
  { label: "Tecnomecánica",     color: COLORS.tecnomecanica },
  { label: "Tarjeta Operación", color: COLORS.tarjetaOpera  },
  { label: "Lic. conducción",   color: COLORS.licencia   },
];

/* =============================
   STATS
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
   EVENTOS DE MANTENIMIENTO PREVENTIVO
============================= */
function buildMaintenanceEvents(items: any[]): any[] {
  const result: any[] = [];
  let id = 1;

  for (const item of items) {
    const placa = (item.placa || "").toUpperCase();
    const taller = item.razonSocial || item.taller || "Sin taller";
    const mecanico = item.nombresResponsable || item.mecanico || "Sin mecánico";

    const nota = item.detalleActividades || "";

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
        Nota: nota,
      });
    }

    // Evento especial para mantenimientos PLANEADOS (sin ejecutar aún)
    if (item.isPlanned && item.scheduledAt) {
      const d = new Date(item.scheduledAt);
      result.push({
        Id: id++,
        Subject: `📋 ${placa} (planeado)`,
        StartTime: startOf(d),
        EndTime: endOf(d),
        Description: `Planeado: ${formatDateCO(d)} · ${taller} · ${mecanico}`,
        CategoryColor: COLORS.planeado,
        Tipo: "PLANEADO",
        Placa: placa,
        Taller: taller,
        Mecanico: mecanico,
        FechaEjecucion: "Pendiente",
        FechaVencimiento: formatDateCO(item.dueDate),
        Nota: nota,
      });
    }

    if (item.dueDate && !item.isPlanned) {
      const d = new Date(item.dueDate);
      const diff = daysDiff(d);
      const yaEjecutado = !!item.executedAt;

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
          Nota: nota,
        });
      }
    }
  }

  return result;
}

/* =============================
   EVENTOS DE DOCUMENTOS DE VEHÍCULO
============================= */
function buildDocEvent(
  id: number,
  placa: string,
  label: string,
  color: string,
  expirationDate: string | Date,
): any | null {
  if (!expirationDate) return null;
  const d = new Date(expirationDate);
  if (isNaN(d.getTime())) return null;

  const diff = daysDiff(d);
  let tipo = "PROGRAMADO";
  let emoji = "📋";

  if (diff < 0) {
    tipo = "VENCIDO";
    emoji = "⛔";
  } else if (diff <= 30) {
    tipo = "POR_VENCER";
    emoji = "⚠️";
  }

  return {
    Id: id,
    Subject: `${emoji} ${placa} · ${label} ${diff < 0 ? `venció hace ${Math.abs(diff)}d` : `vence en ${diff}d`}`,
    StartTime: startOf(d),
    EndTime: endOf(d),
    Description: `${label} — vence: ${formatDateCO(d)}`,
    CategoryColor: color,
    Tipo: tipo,
    Placa: placa,
    TipoDoc: label,
    FechaVencimiento: formatDateCO(d),
    DiasRestantes: diff,
  };
}

function buildVehicleDocEvents(vehicles: any[], startId: number): any[] {
  const result: any[] = [];
  let id = startId;

  for (const v of vehicles) {
    const placa = (v.placa || "").toUpperCase();
    if (!placa) continue;

    const docs = [
      { label: "SOAT",              color: COLORS.soat,          date: v.expiration_soat         },
      { label: "Tecnomecánica",     color: COLORS.tecnomecanica, date: v.expiration_tecnomecanica },
      { label: "Tarjeta Operación", color: COLORS.tarjetaOpera,  date: v.expiration_tarjeta_opera },
    ];

    for (const doc of docs) {
      const ev = buildDocEvent(id++, placa, doc.label, doc.color, doc.date);
      if (ev) result.push(ev);
    }
  }

  return result;
}

function buildDriverLicenseEvents(drivers: any[], startId: number): any[] {
  const result: any[] = [];
  let id = startId;

  for (const d of drivers) {
    const venc = d.vencimiento_licencia_conduccion || d.licenciaVencimiento;
    if (!venc) continue;

    const nombre = d.usuario
      ? [d.usuario.nombre, d.usuario.apellido].filter(Boolean).join(' ')
      : (d.nombre || d.primerNombrePrincipal || 'Conductor');

    const ev = buildDocEvent(id++, nombre, "Lic. conducción", COLORS.licencia, venc);
    if (ev) result.push(ev);
  }

  return result;
}

/* =============================
   FETCH DATA
============================= */
async function fetchData() {
  loading.value = true;
  try {
    const [_, __, ___] = await Promise.all([
      store.preventiveFetchList({ numero_items: 500, page: 1 }),
      vehiclesStore.fetch({ numero_items: 500, page: 1 }),
      driversStore.fetch({ numero_items: 500, page: 1 }),
    ]);

    const preventivos = (store.preventiveList.items || []).filter(
      (item: any) => item.estado === true
    );

    const maintEvents = buildMaintenanceEvents(preventivos);
    const vehicleDocEvents = buildVehicleDocEvents(vehiclesStore.items, maintEvents.length + 1);
    const driverLicEvents = buildDriverLicenseEvents(
      driversStore.items,
      maintEvents.length + vehicleDocEvents.length + 1
    );

    events.value = [...maintEvents, ...vehicleDocEvents, ...driverLicEvents];

  } catch (e) {
    console.error("Error cargando calendario:", e);
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
  if (!d?.CategoryColor) return;

  const container = args.element?.querySelector(".e-popup-content");
  if (!container) return;

  // Evento de documento de vehículo / licencia
  if (d.TipoDoc) {
    container.innerHTML = `
      <div style="font-size:13px;line-height:1.8">
        <div><b>📋 Documento:</b> ${d.TipoDoc}</div>
        <div><b>🚗 Vehículo/Conductor:</b> ${d.Placa}</div>
        <div><b>📅 Vencimiento:</b> ${d.FechaVencimiento}</div>
        ${d.DiasRestantes !== undefined ? `
          <div style="margin-top:6px;padding:4px 8px;border-radius:6px;
            background:${d.CategoryColor}20;color:${d.CategoryColor};font-weight:600">
            ${d.DiasRestantes < 0
              ? `Vencido hace ${Math.abs(d.DiasRestantes)} días`
              : `Vence en ${d.DiasRestantes} días`}
          </div>` : ""}
      </div>
    `;
    return;
  }

  // Evento de mantenimiento preventivo
  if (d.Placa) {
    container.innerHTML = `
      <div style="font-size:13px;line-height:1.8">
        <div><b>🚗 Placa:</b> ${d.Placa}</div>
        <div><b>🔧 Taller:</b> ${d.Taller}</div>
        <div><b>👷 Mecánico:</b> ${d.Mecanico}</div>
        <div><b>📅 Vencimiento:</b> ${d.FechaVencimiento}</div>
        <div><b>✅ Ejecutado:</b> ${d.FechaEjecucion || "Pendiente"}</div>
        ${d.Nota ? `
          <div style="margin-top:8px;padding:6px 8px;border-radius:6px;
            background:#f1f5f9;color:#374151;font-size:12px;line-height:1.5">
            <b>📝 Nota:</b> ${d.Nota}
          </div>` : ""}
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

/* ── Ocultar botones editar y borrar del QuickInfo de Syncfusion ── */
:deep(.e-quick-popup-wrapper .e-edit),
:deep(.e-quick-popup-wrapper .e-delete),
:deep(.e-quick-popup-wrapper .e-edit-icon),
:deep(.e-quick-popup-wrapper .e-delete-icon) {
  display: none !important;
}
</style>
