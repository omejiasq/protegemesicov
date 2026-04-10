<template>
  <div class="working-hours">
    <div class="page-header">
      <div>
        <h2 class="page-title">Horas Laboradas y Conducidas</h2>
        <span class="page-subtitle">Control de jornada por conductor · Límite legal: 10 h/día · 60 h/semana</span>
      </div>
      <div class="header-actions">
        <Select v-model="semanaSeleccionada" :options="semanas" optionLabel="label" optionValue="value" class="w-12rem" />
        <Button label="Exportar" icon="pi pi-download" outlined />
      </div>
    </div>

    <!-- Alertas activas -->
    <div v-if="alertas.length" class="alertas-bar">
      <i class="pi pi-exclamation-triangle"></i>
      <span>{{ alertas.length }} conductor(es) con alerta de jornada esta semana</span>
      <Button label="Ver" link @click="scrollToAlertas" />
    </div>

    <!-- Resumen semana -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <i class="pi pi-users kpi-icon kpi-blue"></i>
        <div><span class="kpi-value">6</span><span class="kpi-label">Conductores activos</span></div>
      </div>
      <div class="kpi-card">
        <i class="pi pi-clock kpi-icon kpi-green"></i>
        <div><span class="kpi-value">{{ totalHoras }} h</span><span class="kpi-label">Horas conducidas (semana)</span></div>
      </div>
      <div class="kpi-card">
        <i class="pi pi-map kpi-icon kpi-purple"></i>
        <div><span class="kpi-value">4.280 km</span><span class="kpi-label">Km recorridos (semana)</span></div>
      </div>
      <div class="kpi-card">
        <i class="pi pi-exclamation-circle kpi-icon kpi-orange"></i>
        <div><span class="kpi-value">{{ alertas.length }}</span><span class="kpi-label">Alertas de jornada</span></div>
      </div>
    </div>

    <!-- Tabla conductores -->
    <div class="section-card" ref="tablaRef">
      <h3 class="section-title"><i class="pi pi-table mr-2"></i>Detalle por Conductor — {{ semanaLabel }}</h3>
      <DataTable :value="conductores" stripedRows size="small" :rowClass="rowClass">
        <Column field="nombre" header="Conductor" style="min-width:180px">
          <template #body="{ data }">
            <div class="conductor-cell">
              <span class="conductor-avatar" :style="{ background: data.avatarColor }">{{ data.nombre[0] }}</span>
              <span>{{ data.nombre }}</span>
            </div>
          </template>
        </Column>
        <Column field="vehiculo" header="Vehículo" />
        <Column field="horasLaboradas" header="H. Laboradas" bodyClass="text-center">
          <template #body="{ data }">{{ data.horasLaboradas }} h</template>
        </Column>
        <Column field="horasConducidas" header="H. Conducidas" bodyClass="text-center">
          <template #body="{ data }">
            <span :class="data.horasConducidas >= 50 ? 'text-red-500 font-bold' : data.horasConducidas >= 40 ? 'text-yellow-600 font-bold' : 'text-green-600'">
              {{ data.horasConducidas }} h
            </span>
          </template>
        </Column>
        <Column header="% del límite semanal" style="min-width:180px">
          <template #body="{ data }">
            <div class="progress-cell">
              <ProgressBar :value="Math.round((data.horasConducidas / 60) * 100)"
                :class="data.horasConducidas >= 50 ? 'pb-red' : data.horasConducidas >= 40 ? 'pb-yellow' : 'pb-green'"
                style="height:10px" />
              <span class="progress-pct">{{ Math.round((data.horasConducidas / 60) * 100) }}%</span>
            </div>
          </template>
        </Column>
        <Column field="km" header="Km recorridos" bodyClass="text-center" />
        <Column field="viajes" header="Viajes" bodyClass="text-center" />
        <Column header="Estado" bodyClass="text-center">
          <template #body="{ data }">
            <Tag :value="data.horasConducidas >= 50 ? 'Alerta' : data.horasConducidas >= 40 ? 'Atención' : 'Normal'"
              :severity="data.horasConducidas >= 50 ? 'danger' : data.horasConducidas >= 40 ? 'warn' : 'success'" />
          </template>
        </Column>
        <Column header="Alcohol" bodyClass="text-center">
          <template #body="{ data }">
            <Tag :value="data.alcohol" :severity="data.alcohol === 'Negativo' ? 'success' : 'danger'" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Timeline de la semana -->
    <div class="section-card">
      <h3 class="section-title"><i class="pi pi-calendar mr-2"></i>Timeline de Turnos — Semana</h3>
      <div class="timeline-grid">
        <div class="timeline-header">
          <span class="t-conductor-col">Conductor</span>
          <span v-for="dia in dias" :key="dia" class="t-dia-col">{{ dia }}</span>
        </div>
        <div v-for="c in conductores" :key="c.nombre" class="timeline-row">
          <span class="t-conductor-col t-name">{{ c.nombre.split(' ')[0] }}</span>
          <div v-for="(turno, i) in c.turnos" :key="i" class="t-dia-col">
            <div v-if="turno" class="turno-pill"
              :class="turno.alerta ? 'turno-alerta' : 'turno-ok'"
              :title="`${turno.inicio} – ${turno.fin} · ${turno.horas}h`">
              {{ turno.horas }}h
            </div>
            <span v-else class="turno-libre">—</span>
          </div>
        </div>
      </div>
    </div>
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

const tablaRef = ref<HTMLElement | null>(null)
const semanas = [
  { label: 'Semana 24–30 Mar', value: '2026-W13' },
  { label: 'Semana 17–23 Mar', value: '2026-W12' },
  { label: 'Semana 10–16 Mar', value: '2026-W11' },
]
const semanaSeleccionada = ref('2026-W13')
const semanaLabel = computed(() => semanas.find(s => s.value === semanaSeleccionada.value)?.label ?? '')
const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const conductores = [
  {
    nombre: 'Carlos Rodríguez', vehiculo: 'ABC-123', avatarColor: '#3b82f6',
    horasLaboradas: 54, horasConducidas: 52, km: 890, viajes: 18, alcohol: 'Negativo',
    turnos: [
      { inicio: '06:00', fin: '14:30', horas: 8 },
      { inicio: '06:00', fin: '15:00', horas: 9 },
      { inicio: '06:00', fin: '15:30', horas: 9 },
      { inicio: '06:00', fin: '16:00', horas: 10, alerta: true },
      { inicio: '06:00', fin: '16:30', horas: 10, alerta: true },
      null, null
    ],
  },
  {
    nombre: 'Juan Pérez', vehiculo: 'DEF-456', avatarColor: '#22c55e',
    horasLaboradas: 42, horasConducidas: 38, km: 720, viajes: 14, alcohol: 'Negativo',
    turnos: [
      { inicio: '07:00', fin: '14:00', horas: 7 },
      { inicio: '07:00', fin: '14:30', horas: 7 },
      { inicio: '07:00', fin: '15:00', horas: 8 },
      { inicio: '07:00', fin: '15:00', horas: 8 },
      { inicio: '07:00', fin: '15:00', horas: 8 },
      null, null
    ],
  },
  {
    nombre: 'María González', vehiculo: 'GHI-789', avatarColor: '#a855f7',
    horasLaboradas: 40, horasConducidas: 35, km: 610, viajes: 12, alcohol: 'Negativo',
    turnos: [
      { inicio: '08:00', fin: '15:00', horas: 7 },
      null,
      { inicio: '08:00', fin: '15:00', horas: 7 },
      { inicio: '08:00', fin: '15:30', horas: 7 },
      { inicio: '08:00', fin: '16:00', horas: 8 },
      { inicio: '08:00', fin: '14:00', horas: 6 },
      null
    ],
  },
  {
    nombre: 'Luis Martínez', vehiculo: 'JKL-012', avatarColor: '#f59e0b',
    horasLaboradas: 48, horasConducidas: 44, km: 780, viajes: 16, alcohol: 'Negativo',
    turnos: [
      { inicio: '05:00', fin: '13:00', horas: 8 },
      { inicio: '05:00', fin: '14:00', horas: 9 },
      { inicio: '05:00', fin: '14:00', horas: 9 },
      { inicio: '05:00', fin: '13:30', horas: 8 },
      { inicio: '05:00', fin: '15:00', horas: 10, alerta: true },
      null, null
    ],
  },
  {
    nombre: 'Ana Suárez', vehiculo: 'MNO-345', avatarColor: '#06b6d4',
    horasLaboradas: 36, horasConducidas: 30, km: 480, viajes: 10, alcohol: 'Negativo',
    turnos: [
      { inicio: '09:00', fin: '15:00', horas: 6 },
      { inicio: '09:00', fin: '15:00', horas: 6 },
      null,
      { inicio: '09:00', fin: '15:00', horas: 6 },
      { inicio: '09:00', fin: '15:00', horas: 6 },
      { inicio: '09:00', fin: '15:00', horas: 6 },
      null
    ],
  },
  {
    nombre: 'Pedro Vargas', vehiculo: 'PQR-678', avatarColor: '#ef4444',
    horasLaboradas: 30, horasConducidas: 28, km: 400, viajes: 9, alcohol: 'Positivo',
    turnos: [
      { inicio: '06:00', fin: '12:00', horas: 6 },
      null,
      { inicio: '06:00', fin: '12:30', horas: 6 },
      { inicio: '06:00', fin: '13:00', horas: 7 },
      { inicio: '06:00', fin: '13:00', horas: 7 },
      null, null
    ],
  },
]

const totalHoras = computed(() => conductores.reduce((s, c) => s + c.horasConducidas, 0))
const alertas = computed(() => conductores.filter(c => c.horasConducidas >= 50))

function rowClass(data: any) {
  if (data.alcohol === 'Positivo') return 'row-danger'
  if (data.horasConducidas >= 50) return 'row-warning'
  return ''
}
function scrollToAlertas() {
  tablaRef.value?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style scoped>
.working-hours { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
.page-title { font-size: 1.4rem; font-weight: 700; color: #1e3a5f; margin: 0; }
.page-subtitle { font-size: 0.85rem; color: #64748b; }
.header-actions { display: flex; gap: 0.75rem; align-items: center; }

.alertas-bar {
  background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px;
  padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem; color: #92400e;
}
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; }
.kpi-card {
  background: white; border-radius: 12px; padding: 1rem 1.2rem;
  display: flex; align-items: center; gap: 0.9rem;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08);
}
.kpi-icon { font-size: 1.6rem; }
.kpi-blue   { color: #3b82f6; }
.kpi-green  { color: #22c55e; }
.kpi-purple { color: #a855f7; }
.kpi-orange { color: #f59e0b; }
.kpi-value { display: block; font-size: 1.4rem; font-weight: 700; color: #1e293b; }
.kpi-label { font-size: 0.75rem; color: #64748b; }

.section-card { background: white; border-radius: 12px; padding: 1.4rem; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
.section-title { font-size: 1rem; font-weight: 600; color: #1e3a5f; margin: 0 0 1.2rem; display: flex; align-items: center; }
.conductor-cell { display: flex; align-items: center; gap: 0.6rem; }
.conductor-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }
.progress-cell { display: flex; align-items: center; gap: 0.5rem; }
.progress-pct { font-size: 0.75rem; color: #64748b; white-space: nowrap; }
:deep(.pb-green .p-progressbar-value) { background: #22c55e !important; }
:deep(.pb-yellow .p-progressbar-value) { background: #f59e0b !important; }
:deep(.pb-red .p-progressbar-value) { background: #ef4444 !important; }
:deep(.row-danger td) { background: #fff1f2 !important; }
:deep(.row-warning td) { background: #fffbeb !important; }

.timeline-grid { overflow-x: auto; }
.timeline-header, .timeline-row {
  display: grid;
  grid-template-columns: 100px repeat(7, 1fr);
  gap: 4px; align-items: center; margin-bottom: 4px;
}
.timeline-header { font-size: 0.75rem; font-weight: 600; color: #64748b; padding-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0; margin-bottom: 0.5rem; }
.t-conductor-col { font-size: 0.8rem; }
.t-dia-col { text-align: center; }
.t-name { font-weight: 600; color: #334155; font-size: 0.82rem; }
.turno-pill { background: #dcfce7; color: #166534; border-radius: 6px; padding: 2px 6px; font-size: 0.75rem; font-weight: 600; text-align: center; }
.turno-alerta { background: #fef3c7; color: #92400e; }
.turno-libre { color: #cbd5e1; font-size: 0.8rem; display: block; text-align: center; }
</style>
