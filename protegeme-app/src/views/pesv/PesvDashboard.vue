<template>
  <div class="pesv-dashboard">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Dashboard PESV — Formulario 2</h2>
        <span class="page-subtitle">Período: {{ periodoLabel }} · Empresa: ProtegeMe Demo S.A.S.</span>
      </div>
      <div class="header-actions">
        <Select v-model="mesSeleccionado" :options="meses" optionLabel="label" optionValue="value"
          placeholder="Seleccionar mes" class="w-10rem" />
        <Button label="Exportar F2" icon="pi pi-file-pdf" severity="danger" @click="exportarF2" />
      </div>
    </div>

    <!-- KPIs superiores -->
    <div class="kpi-grid">
      <div v-for="kpi in kpis" :key="kpi.label" class="kpi-card" :class="`kpi-${kpi.color}`">
        <i :class="`pi ${kpi.icon} kpi-icon`"></i>
        <div class="kpi-body">
          <span class="kpi-value">{{ kpi.value }}</span>
          <span class="kpi-label">{{ kpi.label }}</span>
        </div>
        <span class="kpi-delta" :class="kpi.trend === 'up' ? 'delta-up' : 'delta-down'">
          <i :class="`pi pi-arrow-${kpi.trend}`"></i> {{ kpi.delta }}
        </span>
      </div>
    </div>

    <!-- Semáforo F2 por Línea de Acción -->
    <div class="section-card">
      <h3 class="section-title"><i class="pi pi-chart-bar mr-2"></i>Semáforo de Cumplimiento F2 — Líneas de Acción PESV</h3>
      <div class="semaforo-grid">
        <div v-for="linea in lineasAccion" :key="linea.nombre" class="semaforo-item">
          <div class="semaforo-header">
            <span class="semaforo-nombre">{{ linea.nombre }}</span>
            <Tag :value="`${linea.pct}%`" :severity="linea.pct >= 90 ? 'success' : linea.pct >= 60 ? 'warn' : 'danger'" />
          </div>
          <ProgressBar :value="linea.pct" :class="`progress-${linea.pct >= 90 ? 'green' : linea.pct >= 60 ? 'yellow' : 'red'}`" />
          <span class="semaforo-detalle">{{ linea.detalle }}</span>
        </div>
      </div>
    </div>

    <!-- Indicadores F2 tabla -->
    <div class="section-card">
      <h3 class="section-title"><i class="pi pi-table mr-2"></i>Indicadores Formulario 2 — Detalle del Período</h3>
      <DataTable :value="indicadoresF2" stripedRows size="small" class="p-datatable-sm">
        <Column field="indicador" header="Indicador" style="min-width:220px" />
        <Column field="meta" header="Meta" style="width:90px" bodyClass="text-center" />
        <Column field="valor" header="Valor Actual" style="width:110px" bodyClass="text-center">
          <template #body="{ data }">
            <span :class="data.valor >= data.meta ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
              {{ data.valor }}
            </span>
          </template>
        </Column>
        <Column field="estado" header="Estado" style="width:110px" bodyClass="text-center">
          <template #body="{ data }">
            <Tag :value="data.estado" :severity="data.estado === 'Cumple' ? 'success' : data.estado === 'En riesgo' ? 'warn' : 'danger'" />
          </template>
        </Column>
        <Column field="fuente" header="Fuente" />
      </DataTable>
    </div>

    <!-- Gráfica tendencia 6 meses -->
    <div class="section-card">
      <h3 class="section-title"><i class="pi pi-chart-line mr-2"></i>Cumplimiento F2 — Últimos 6 Meses</h3>
      <div class="chart-container">
        <div class="chart-bars">
          <div v-for="mes in tendencia" :key="mes.mes" class="bar-group">
            <div class="bar-wrap">
              <div class="bar" :style="{ height: `${mes.pct * 1.4}px` }"
                :class="mes.pct >= 90 ? 'bar-green' : mes.pct >= 60 ? 'bar-yellow' : 'bar-red'">
                <span class="bar-label-top">{{ mes.pct }}%</span>
              </div>
            </div>
            <span class="bar-label-bot">{{ mes.mes }}</span>
          </div>
        </div>
        <div class="chart-legend">
          <span class="legend-item"><span class="dot dot-green"></span> ≥ 90% Cumple</span>
          <span class="legend-item"><span class="dot dot-yellow"></span> 60–89% En riesgo</span>
          <span class="legend-item"><span class="dot dot-red"></span> &lt; 60% Incumple</span>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

const toast = useToast()

const meses = [
  { label: 'Marzo 2026', value: '2026-03' },
  { label: 'Febrero 2026', value: '2026-02' },
  { label: 'Enero 2026', value: '2026-01' },
]
const mesSeleccionado = ref('2026-03')
const periodoLabel = computed(() => meses.find(m => m.value === mesSeleccionado.value)?.label ?? '')

const kpis = [
  { label: 'Alistamientos completados', value: '98', icon: 'pi-list-check', color: 'green', trend: 'up', delta: '+5 vs feb' },
  { label: 'Km recorridos en flota', value: '18.420', icon: 'pi-map', color: 'blue', trend: 'up', delta: '+12%' },
  { label: 'Conductores activos', value: '6', icon: 'pi-users', color: 'purple', trend: 'up', delta: 'estable' },
  { label: 'Incidentes en el mes', value: '0', icon: 'pi-shield', color: 'green', trend: 'up', delta: '0 en 3 meses' },
  { label: 'Pruebas alcoholemia', value: '24', icon: 'pi-heart', color: 'blue', trend: 'up', delta: '1 positiva' },
  { label: 'Cumplimiento F2 general', value: '89%', icon: 'pi-chart-bar', color: 'yellow', trend: 'up', delta: '+4% vs feb' },
]

const lineasAccion = [
  { nombre: '1. Gestión institucional', pct: 95, detalle: '19/20 actividades completadas' },
  { nombre: '2. Comportamiento humano', pct: 82, detalle: '14/17 — capacitaciones pendientes' },
  { nombre: '3. Vehículos seguros', pct: 98, detalle: 'Alistamientos al día · RTM vigente en toda la flota' },
  { nombre: '4. Infraestructura segura', pct: 90, detalle: '9/10 rutas evaluadas' },
  { nombre: '5. Atención a víctimas', pct: 100, detalle: 'Protocolo activo · Botiquín verificado' },
]

const indicadoresF2 = [
  { indicador: 'Alistamientos diarios completados', meta: 95, valor: 98, estado: 'Cumple', fuente: 'Módulo Alistamiento' },
  { indicador: 'Mantenimientos preventivos ejecutados', meta: 90, valor: 93, estado: 'Cumple', fuente: 'Módulo Mantenimiento' },
  { indicador: 'Conductores con turno registrado', meta: 100, valor: 100, estado: 'Cumple', fuente: 'App Móvil' },
  { indicador: 'Pruebas alcoholemia realizadas', meta: 100, valor: 100, estado: 'Cumple', fuente: 'Alcoholemia BLE' },
  { indicador: 'Horas conducción dentro del límite legal', meta: 100, valor: 96, estado: 'Cumple', fuente: 'Control Turno' },
  { indicador: 'Capacitaciones en seguridad vial', meta: 2, valor: 1, estado: 'En riesgo', fuente: 'Módulo Capacitaciones' },
  { indicador: 'Conductores sin incidentes en el mes', meta: 100, valor: 100, estado: 'Cumple', fuente: 'Módulo Incidentes' },
  { indicador: 'Score promedio hábitos de conducción', meta: 80, valor: 76, estado: 'En riesgo', fuente: 'App Tracking' },
  { indicador: 'Documentos vigentes (SOAT/RTM/Licencia)', meta: 100, valor: 100, estado: 'Cumple', fuente: 'Gestión Vehículos' },
  { indicador: 'Incidentes reportados con acta ARL', meta: 100, valor: 100, estado: 'Cumple', fuente: 'Módulo Incidentes' },
]

const tendencia = [
  { mes: 'Oct', pct: 71 },
  { mes: 'Nov', pct: 75 },
  { mes: 'Dic', pct: 68 },
  { mes: 'Ene', pct: 80 },
  { mes: 'Feb', pct: 85 },
  { mes: 'Mar', pct: 89 },
]

function exportarF2() {
  toast.add({ severity: 'success', summary: 'F2 generado', detail: 'El reporte Formulario 2 de Marzo 2026 se descargará en PDF', life: 3500 })
}
</script>

<style scoped>
.pesv-dashboard { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
.page-title { font-size: 1.4rem; font-weight: 700; color: #1e3a5f; margin: 0; }
.page-subtitle { font-size: 0.85rem; color: #64748b; }
.header-actions { display: flex; gap: 0.75rem; align-items: center; }

.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem; }
.kpi-card {
  background: white; border-radius: 12px; padding: 1.1rem 1.2rem;
  display: flex; align-items: center; gap: 0.9rem;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08); border-left: 4px solid transparent;
  position: relative;
}
.kpi-green { border-left-color: #22c55e; }
.kpi-blue  { border-left-color: #3b82f6; }
.kpi-purple{ border-left-color: #a855f7; }
.kpi-yellow{ border-left-color: #f59e0b; }
.kpi-red   { border-left-color: #ef4444; }
.kpi-icon { font-size: 1.6rem; opacity: 0.5; }
.kpi-body { flex: 1; }
.kpi-value { display: block; font-size: 1.6rem; font-weight: 700; color: #1e293b; line-height: 1.1; }
.kpi-label { font-size: 0.75rem; color: #64748b; }
.kpi-delta { font-size: 0.7rem; position: absolute; top: 0.6rem; right: 0.8rem; }
.delta-up { color: #22c55e; }
.delta-down{ color: #ef4444; }

.section-card { background: white; border-radius: 12px; padding: 1.4rem; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
.section-title { font-size: 1rem; font-weight: 600; color: #1e3a5f; margin: 0 0 1.2rem; display: flex; align-items: center; }

.semaforo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
.semaforo-item { background: #f8fafc; border-radius: 8px; padding: 0.9rem 1rem; }
.semaforo-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.semaforo-nombre { font-size: 0.85rem; font-weight: 600; color: #334155; }
.semaforo-detalle { font-size: 0.75rem; color: #94a3b8; margin-top: 0.35rem; display: block; }
:deep(.progress-green .p-progressbar-value) { background: #22c55e !important; }
:deep(.progress-yellow .p-progressbar-value) { background: #f59e0b !important; }
:deep(.progress-red .p-progressbar-value) { background: #ef4444 !important; }

.chart-container { display: flex; flex-direction: column; gap: 1rem; }
.chart-bars { display: flex; align-items: flex-end; gap: 1.5rem; height: 160px; padding: 0 1rem; }
.bar-group { display: flex; flex-direction: column; align-items: center; flex: 1; }
.bar-wrap { display: flex; align-items: flex-end; height: 140px; }
.bar { width: 40px; border-radius: 6px 6px 0 0; position: relative; transition: height 0.5s ease; min-height: 10px; }
.bar-green  { background: #22c55e; }
.bar-yellow { background: #f59e0b; }
.bar-red    { background: #ef4444; }
.bar-label-top { position: absolute; top: -22px; left: 50%; transform: translateX(-50%); font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
.bar-label-bot { font-size: 0.8rem; color: #64748b; margin-top: 0.4rem; }
.chart-legend { display: flex; gap: 1.5rem; justify-content: center; }
.legend-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: #64748b; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.dot-green  { background: #22c55e; }
.dot-yellow { background: #f59e0b; }
.dot-red    { background: #ef4444; }
</style>
