<template>
  <div class="habits-report">
    <div class="page-header">
      <div>
        <h2 class="page-title">Hábitos de Conducción</h2>
        <span class="page-subtitle">Score conductual por conductor · Basado en frenadas, aceleraciones, excesos de velocidad y distracciones</span>
      </div>
      <div class="header-actions">
        <Select v-model="periodo" :options="periodos" optionLabel="label" optionValue="value" class="w-12rem" />
        <Button label="Exportar" icon="pi pi-download" outlined />
      </div>
    </div>

    <!-- Score promedio flota -->
    <div class="fleet-score-banner" :class="scoreFlota >= 80 ? 'score-green' : scoreFlota >= 60 ? 'score-yellow' : 'score-red'">
      <div class="fleet-score-value">{{ scoreFlota }}</div>
      <div class="fleet-score-info">
        <span class="fleet-score-label">Score Promedio de Flota</span>
        <span class="fleet-score-sub">{{ scoreFlota >= 80 ? '✅ Flota en buen nivel de seguridad' : scoreFlota >= 60 ? '⚠️ Se requieren acciones de mejora' : '🔴 Riesgo elevado — capacitación urgente' }}</span>
      </div>
      <div class="fleet-score-stats">
        <div class="stat-item"><span class="stat-n">{{ conductores.filter(c => c.score >= 80).length }}</span><span class="stat-l">Buenos</span></div>
        <div class="stat-item"><span class="stat-n">{{ conductores.filter(c => c.score >= 60 && c.score < 80).length }}</span><span class="stat-l">En atención</span></div>
        <div class="stat-item"><span class="stat-n">{{ conductores.filter(c => c.score < 60).length }}</span><span class="stat-l">Riesgo alto</span></div>
      </div>
    </div>

    <!-- Ranking conductores -->
    <div class="section-card">
      <h3 class="section-title"><i class="pi pi-trophy mr-2"></i>Ranking de Conductores — {{ periodoLabel }}</h3>
      <DataTable :value="conductoresSorted" stripedRows size="small">
        <Column header="#" style="width:50px" bodyClass="text-center">
          <template #body="{ index }">
            <span class="rank-badge" :class="index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-n'">
              {{ index + 1 }}
            </span>
          </template>
        </Column>
        <Column field="nombre" header="Conductor" style="min-width:160px">
          <template #body="{ data }">
            <div class="conductor-cell">
              <span class="conductor-avatar" :style="{ background: data.color }">{{ data.nombre[0] }}</span>
              <span>{{ data.nombre }}</span>
            </div>
          </template>
        </Column>
        <Column header="Score" style="width:160px">
          <template #body="{ data }">
            <div class="score-bar-cell">
              <div class="score-bar-bg">
                <div class="score-bar-fill" :style="{ width: `${data.score}%` }"
                  :class="data.score >= 80 ? 'fill-green' : data.score >= 60 ? 'fill-yellow' : 'fill-red'" />
              </div>
              <span class="score-num" :class="data.score >= 80 ? 'text-green-600' : data.score >= 60 ? 'text-yellow-600' : 'text-red-500'">
                {{ data.score }}
              </span>
            </div>
          </template>
        </Column>
        <Column field="viajes" header="Viajes" bodyClass="text-center" />
        <Column field="km" header="Km" bodyClass="text-center" />
        <Column field="frenadas" header="Frenadas bruscas" bodyClass="text-center">
          <template #body="{ data }">
            <span :class="data.frenadas > 10 ? 'text-red-500 font-bold' : data.frenadas > 5 ? 'text-yellow-600' : 'text-green-600'">
              {{ data.frenadas }}
            </span>
          </template>
        </Column>
        <Column field="aceleraciones" header="Aceleraciones" bodyClass="text-center">
          <template #body="{ data }">
            <span :class="data.aceleraciones > 8 ? 'text-red-500 font-bold' : 'text-slate-600'">
              {{ data.aceleraciones }}
            </span>
          </template>
        </Column>
        <Column field="excesos" header="Excesos vel." bodyClass="text-center">
          <template #body="{ data }">
            <span :class="data.excesos > 5 ? 'text-red-500 font-bold' : data.excesos > 0 ? 'text-yellow-600' : 'text-green-600'">
              {{ data.excesos }}
            </span>
          </template>
        </Column>
        <Column field="distracciones" header="Distracciones" bodyClass="text-center">
          <template #body="{ data }">
            <span :class="data.distracciones > 3 ? 'text-red-500 font-bold' : 'text-slate-600'">
              {{ data.distracciones }}
            </span>
          </template>
        </Column>
        <Column header="Tendencia" bodyClass="text-center">
          <template #body="{ data }">
            <i :class="`pi pi-arrow-${data.tendencia} ${data.tendencia === 'up' ? 'text-green-500' : data.tendencia === 'down' ? 'text-red-500' : 'text-yellow-500'}`" />
          </template>
        </Column>
        <Column header="Acción" bodyClass="text-center">
          <template #body="{ data }">
            <Button v-if="data.score < 70" label="Capacitar" icon="pi pi-book" size="small" severity="warning" text />
            <span v-else class="text-slate-400 text-xs">Sin acción</span>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Top eventos -->
    <div class="events-grid">
      <div class="section-card">
        <h3 class="section-title"><i class="pi pi-exclamation-circle mr-2 text-red-500"></i>Top Eventos — Frenadas Bruscas</h3>
        <div v-for="ev in topFrenadas" :key="ev.id" class="event-item">
          <div class="event-dot event-red"></div>
          <div class="event-body">
            <span class="event-conductor">{{ ev.conductor }}</span>
            <span class="event-detail">{{ ev.fecha }} · {{ ev.hora }} · {{ ev.lugar }}</span>
          </div>
          <span class="event-speed">{{ ev.velocidad }} km/h</span>
        </div>
      </div>
      <div class="section-card">
        <h3 class="section-title"><i class="pi pi-bolt mr-2 text-yellow-500"></i>Top Eventos — Excesos de Velocidad</h3>
        <div v-for="ev in topExcesos" :key="ev.id" class="event-item">
          <div class="event-dot event-orange"></div>
          <div class="event-body">
            <span class="event-conductor">{{ ev.conductor }}</span>
            <span class="event-detail">{{ ev.fecha }} · {{ ev.hora }} · {{ ev.lugar }}</span>
          </div>
          <Tag :value="`${ev.velocidad} / ${ev.limite} km/h`" severity="warn" />
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
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const periodos = [
  { label: 'Marzo 2026', value: '2026-03' },
  { label: 'Febrero 2026', value: '2026-02' },
  { label: 'Enero 2026', value: '2026-01' },
]
const periodo = ref('2026-03')
const periodoLabel = computed(() => periodos.find(p => p.value === periodo.value)?.label ?? '')

const conductores = [
  { nombre: 'Ana Suárez',      color: '#06b6d4', score: 94, viajes: 10, km: 480,  frenadas: 1,  aceleraciones: 2,  excesos: 0, distracciones: 0, tendencia: 'up' },
  { nombre: 'María González',  color: '#a855f7', score: 88, viajes: 12, km: 610,  frenadas: 3,  aceleraciones: 4,  excesos: 1, distracciones: 1, tendencia: 'up' },
  { nombre: 'Juan Pérez',      color: '#22c55e', score: 80, viajes: 14, km: 720,  frenadas: 5,  aceleraciones: 5,  excesos: 2, distracciones: 2, tendencia: 'right' },
  { nombre: 'Luis Martínez',   color: '#f59e0b', score: 71, viajes: 16, km: 780,  frenadas: 8,  aceleraciones: 7,  excesos: 4, distracciones: 3, tendencia: 'right' },
  { nombre: 'Carlos Rodríguez',color: '#3b82f6', score: 63, viajes: 18, km: 890,  frenadas: 14, aceleraciones: 11, excesos: 7, distracciones: 5, tendencia: 'down' },
  { nombre: 'Pedro Vargas',    color: '#ef4444', score: 48, viajes: 9,  km: 400,  frenadas: 18, aceleraciones: 15, excesos: 9, distracciones: 8, tendencia: 'down' },
]
const conductoresSorted = computed(() => [...conductores].sort((a, b) => b.score - a.score))
const scoreFlota = computed(() => Math.round(conductores.reduce((s, c) => s + c.score, 0) / conductores.length))

const topFrenadas = [
  { id: 1, conductor: 'Pedro Vargas',     fecha: '28 Mar', hora: '07:14', lugar: 'Cra. 30 con Calle 45', velocidad: 72 },
  { id: 2, conductor: 'Carlos Rodríguez', fecha: '27 Mar', hora: '14:32', lugar: 'Av. NQS con Calle 68', velocidad: 65 },
  { id: 3, conductor: 'Pedro Vargas',     fecha: '26 Mar', hora: '08:55', lugar: 'Autopista Norte Km 4', velocidad: 85 },
  { id: 4, conductor: 'Luis Martínez',    fecha: '25 Mar', hora: '11:20', lugar: 'Calle 80 con Av. 68', velocidad: 58 },
]
const topExcesos = [
  { id: 1, conductor: 'Pedro Vargas',     fecha: '28 Mar', hora: '06:45', lugar: 'Autopista Sur Km 8',  velocidad: 92, limite: 80 },
  { id: 2, conductor: 'Carlos Rodríguez', fecha: '27 Mar', hora: '16:10', lugar: 'Cra. 7 con Calle 100', velocidad: 68, limite: 50 },
  { id: 3, conductor: 'Pedro Vargas',     fecha: '25 Mar', hora: '07:30', lugar: 'Autopista Norte Km 2', velocidad: 105, limite: 80 },
  { id: 4, conductor: 'Luis Martínez',    fecha: '24 Mar', hora: '12:00', lugar: 'Av. El Dorado',       velocidad: 75, limite: 60 },
]
</script>

<style scoped>
.habits-report { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
.page-title { font-size: 1.4rem; font-weight: 700; color: #1e3a5f; margin: 0; }
.page-subtitle { font-size: 0.85rem; color: #64748b; }
.header-actions { display: flex; gap: 0.75rem; align-items: center; }

.fleet-score-banner {
  border-radius: 12px; padding: 1.2rem 1.5rem;
  display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;
}
.score-green  { background: linear-gradient(135deg, #dcfce7, #bbf7d0); border-left: 6px solid #22c55e; }
.score-yellow { background: linear-gradient(135deg, #fef3c7, #fde68a); border-left: 6px solid #f59e0b; }
.score-red    { background: linear-gradient(135deg, #fee2e2, #fecaca); border-left: 6px solid #ef4444; }
.fleet-score-value { font-size: 3.5rem; font-weight: 900; color: #1e293b; line-height: 1; }
.fleet-score-info { flex: 1; }
.fleet-score-label { display: block; font-size: 1rem; font-weight: 700; color: #1e293b; }
.fleet-score-sub   { font-size: 0.85rem; color: #475569; }
.fleet-score-stats { display: flex; gap: 1.5rem; }
.stat-item { text-align: center; }
.stat-n { display: block; font-size: 1.4rem; font-weight: 700; color: #1e293b; }
.stat-l { font-size: 0.75rem; color: #64748b; }

.section-card { background: white; border-radius: 12px; padding: 1.4rem; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
.section-title { font-size: 1rem; font-weight: 600; color: #1e3a5f; margin: 0 0 1.2rem; display: flex; align-items: center; }
.conductor-cell { display: flex; align-items: center; gap: 0.6rem; }
.conductor-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }

.rank-badge { width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; }
.rank-1 { background: #fbbf24; color: #78350f; }
.rank-2 { background: #d1d5db; color: #374151; }
.rank-3 { background: #c07a4c; color: white; }
.rank-n { background: #f1f5f9; color: #64748b; }

.score-bar-cell { display: flex; align-items: center; gap: 0.5rem; }
.score-bar-bg { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
.score-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
.fill-green  { background: #22c55e; }
.fill-yellow { background: #f59e0b; }
.fill-red    { background: #ef4444; }
.score-num { font-size: 0.9rem; font-weight: 700; width: 28px; text-align: right; }

.events-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
@media (max-width: 768px) { .events-grid { grid-template-columns: 1fr; } }
.event-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0; border-bottom: 1px solid #f1f5f9; }
.event-dot  { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.event-red  { background: #ef4444; }
.event-orange { background: #f59e0b; }
.event-body { flex: 1; }
.event-conductor { display: block; font-size: 0.85rem; font-weight: 600; color: #1e293b; }
.event-detail    { font-size: 0.75rem; color: #94a3b8; }
.event-speed { font-size: 0.85rem; font-weight: 700; color: #ef4444; }
</style>
