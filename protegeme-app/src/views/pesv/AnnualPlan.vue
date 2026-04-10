<template>
  <div class="annual-plan">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Metas y Plan Anual PESV</h2>
        <span class="page-subtitle">
          Indicadores PESV N°4 (Var. 18–19) y N°5 (Var. 20–21) · Resolución 40595 de 2022, Paso 7
        </span>
      </div>
      <div class="header-actions">
        <Select v-model="anioSeleccionado" :options="anios" optionLabel="label" optionValue="value" class="w-10rem" />
        <Button label="Nueva actividad" icon="pi pi-plus" @click="nuevaActividadVisible = true" />
        <Button label="Exportar F2" icon="pi pi-file-pdf" severity="danger" outlined @click="exportarF2" />
      </div>
    </div>

    <!-- KPIs generales (variables 18–21) -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-blue">
        <i class="pi pi-flag kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ totalMetas }}</span>
          <span class="kpi-label">Metas definidas (Var. 18)</span>
        </div>
      </div>
      <div class="kpi-card" :class="metasAlcanzadas / totalMetas >= 0.8 ? 'kpi-green' : 'kpi-yellow'">
        <i class="pi pi-check-circle kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ metasAlcanzadas }}</span>
          <span class="kpi-label">Metas alcanzadas (Var. 19)</span>
        </div>
      </div>
      <div class="kpi-card kpi-purple">
        <i class="pi pi-list-check kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ totalActividades }}</span>
          <span class="kpi-label">Actividades programadas (Var. 20)</span>
        </div>
      </div>
      <div class="kpi-card" :class="actividadesEjecutadas / totalActividades >= 0.8 ? 'kpi-green' : 'kpi-orange'">
        <i class="pi pi-check kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ actividadesEjecutadas }}</span>
          <span class="kpi-label">Actividades ejecutadas (Var. 21)</span>
        </div>
      </div>
    </div>

    <!-- Indicadores ind 4 y 5 con progress -->
    <div class="kpis-double">
      <div class="section-card">
        <h3 class="section-title"><i class="pi pi-chart-bar mr-2"></i>Indicador 4 — Cumplimiento de Metas PESV</h3>
        <div class="progress-big">
          <div class="progress-label">
            <span>{{ metasAlcanzadas }} / {{ totalMetas }} metas alcanzadas</span>
            <Tag :value="`${pctMetas}%`" :severity="pctMetas >= 80 ? 'success' : pctMetas >= 60 ? 'warn' : 'danger'" />
          </div>
          <ProgressBar :value="pctMetas" :class="`prog-${pctMetas >= 80 ? 'green' : pctMetas >= 60 ? 'yellow' : 'red'}`"
            style="height:14px" />
          <span class="progress-detail">Meta requerida por Supertransporte: ≥ 80% por trimestre acumulativo</span>
        </div>
        <div class="trimestres-grid">
          <div v-for="t in trimestresResumen" :key="t.trim" class="trim-card">
            <span class="trim-label">{{ t.trim }}</span>
            <div class="trim-bar-wrap">
              <div class="trim-bar" :style="{ width: `${t.pct}%` }"
                :class="t.pct >= 80 ? 'bar-green' : t.pct >= 60 ? 'bar-yellow' : 'bar-red'"></div>
            </div>
            <span class="trim-pct">{{ t.pct }}%</span>
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title"><i class="pi pi-list mr-2"></i>Indicador 5 — Plan Anual de Trabajo</h3>
        <div class="progress-big">
          <div class="progress-label">
            <span>{{ actividadesEjecutadas }} / {{ totalActividades }} actividades ejecutadas</span>
            <Tag :value="`${pctActividades}%`" :severity="pctActividades >= 80 ? 'success' : pctActividades >= 60 ? 'warn' : 'danger'" />
          </div>
          <ProgressBar :value="pctActividades"
            :class="`prog-${pctActividades >= 80 ? 'green' : pctActividades >= 60 ? 'yellow' : 'red'}`"
            style="height:14px" />
          <span class="progress-detail">Seguimiento trimestral acumulativo · Plan anual de trabajo PESV</span>
        </div>
        <!-- Resumen por línea de acción -->
        <div class="lineas-summary">
          <div v-for="linea in resumenLineas" :key="linea.nombre" class="linea-row">
            <span class="linea-nombre">{{ linea.nombre }}</span>
            <div class="linea-bar-wrap">
              <div class="linea-bar" :style="{ width: `${linea.pct}%` }"
                :class="linea.pct >= 80 ? 'bar-green' : linea.pct >= 60 ? 'bar-yellow' : 'bar-red'"></div>
            </div>
            <span class="linea-pct">{{ linea.pct }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de actividades del plan anual -->
    <div class="section-card">
      <div class="table-header">
        <h3 class="section-title"><i class="pi pi-table mr-2"></i>Actividades del Plan Anual de Trabajo</h3>
        <div class="table-filters">
          <Select v-model="filtroTrimestre" :options="['Todos', 'Q1', 'Q2', 'Q3', 'Q4']" placeholder="Trimestre" class="w-9rem" />
          <Select v-model="filtroEstadoAct" :options="['Todos', 'Ejecutada', 'En curso', 'Pendiente', 'Aplazada']"
            placeholder="Estado" class="w-9rem" />
        </div>
      </div>

      <DataTable :value="actividadesFiltradas" stripedRows size="small" :paginator="true" :rows="8"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink">
        <Column field="codigo" header="Cód." style="width:80px">
          <template #body="{ data }">
            <span class="font-mono font-bold text-slate-500">{{ data.codigo }}</span>
          </template>
        </Column>
        <Column field="actividad" header="Actividad" style="min-width:200px">
          <template #body="{ data }">
            <div>
              <span class="font-semibold text-sm">{{ data.actividad }}</span>
              <span class="block text-xs text-slate-400">{{ data.linea }}</span>
            </div>
          </template>
        </Column>
        <Column field="meta" header="Meta relacionada" style="width:120px" />
        <Column field="trimestre" header="Trim." style="width:70px" bodyClass="text-center">
          <template #body="{ data }">
            <span class="font-bold text-blue-700">{{ data.trimestre }}</span>
          </template>
        </Column>
        <Column field="responsable" header="Responsable" />
        <Column field="avance" header="Avance" style="width:100px" bodyClass="text-center">
          <template #body="{ data }">
            <span :class="data.avance === 100 ? 'text-green-600 font-bold' : 'text-slate-600'">{{ data.avance }}%</span>
          </template>
        </Column>
        <Column field="estado" header="Estado" style="width:100px">
          <template #body="{ data }">
            <Tag :value="data.estado"
              :severity="data.estado === 'Ejecutada' ? 'success' : data.estado === 'En curso' ? 'warn' : data.estado === 'Aplazada' ? 'danger' : 'secondary'" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Dialog nueva actividad -->
    <Dialog v-model:visible="nuevaActividadVisible" header="Agregar Actividad al Plan" :modal="true" style="width:520px">
      <div class="dialog-form">
        <div class="form-field">
          <label>Actividad *</label>
          <InputText v-model="nuevaAct.actividad" placeholder="Describa la actividad planificada" class="w-full" />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Línea de acción PESV</label>
            <Select v-model="nuevaAct.linea" :options="lineasPesv" placeholder="Línea" class="w-full" />
          </div>
          <div class="form-field">
            <label>Trimestre</label>
            <Select v-model="nuevaAct.trimestre" :options="['Q1', 'Q2', 'Q3', 'Q4']" class="w-full" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Meta relacionada</label>
            <InputText v-model="nuevaAct.meta" placeholder="Ej: Meta 3 — Reducir siniestros" class="w-full" />
          </div>
          <div class="form-field">
            <label>Responsable</label>
            <Select v-model="nuevaAct.responsable" :options="responsables" placeholder="Asignar" class="w-full" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="nuevaActividadVisible = false" />
        <Button label="Agregar al plan" icon="pi pi-plus" @click="guardarActividad" />
      </template>
    </Dialog>

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
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const nuevaActividadVisible = ref(false)
const filtroTrimestre = ref('Todos')
const filtroEstadoAct = ref('Todos')
const anios = [{ label: '2026', value: '2026' }, { label: '2025', value: '2025' }]
const anioSeleccionado = ref('2026')

const lineasPesv = ['1. Gestión institucional', '2. Comportamiento humano', '3. Vehículos seguros', '4. Infraestructura segura', '5. Atención a víctimas']
const responsables = ['Carlos Méndez (PESV)', 'Laura Gómez (Operaciones)', 'Andrés Torres (Mantenimiento)', 'María Ruiz (RRHH)', 'Gerente General']

// ── Actividades del plan anual ───────────────────────────────────────────────
const actividades = ref([
  { id: 1,  codigo: 'A-001', actividad: 'Actualizar política de seguridad vial',                    linea: '1. Gestión institucional',  meta: 'Meta 1', trimestre: 'Q1', responsable: 'Gerente General',              avance: 100, estado: 'Ejecutada' },
  { id: 2,  codigo: 'A-002', actividad: 'Capacitación obligatoria manejo defensivo conductores',     linea: '2. Comportamiento humano',  meta: 'Meta 2', trimestre: 'Q1', responsable: 'María Ruiz (RRHH)',            avance: 100, estado: 'Ejecutada' },
  { id: 3,  codigo: 'A-003', actividad: 'Implementar sistema alcoholemia antes de turno',            linea: '2. Comportamiento humano',  meta: 'Meta 2', trimestre: 'Q1', responsable: 'Carlos Méndez (PESV)',         avance: 100, estado: 'Ejecutada' },
  { id: 4,  codigo: 'A-004', actividad: 'Revisión RTM y SOAT de toda la flota',                     linea: '3. Vehículos seguros',       meta: 'Meta 3', trimestre: 'Q1', responsable: 'Andrés Torres (Mantenimiento)',avance: 100, estado: 'Ejecutada' },
  { id: 5,  codigo: 'A-005', actividad: 'Evaluar 5 rutas de alta frecuencia',                       linea: '4. Infraestructura segura',  meta: 'Meta 4', trimestre: 'Q1', responsable: 'Laura Gómez (Operaciones)',    avance: 80,  estado: 'En curso' },
  { id: 6,  codigo: 'A-006', actividad: 'Actualizar botiquines y kit emergencias en flota',          linea: '5. Atención a víctimas',     meta: 'Meta 5', trimestre: 'Q1', responsable: 'Andrés Torres (Mantenimiento)',avance: 100, estado: 'Ejecutada' },
  { id: 7,  codigo: 'A-007', actividad: 'Capacitación primeros auxilios y protocolo de accidentes',  linea: '5. Atención a víctimas',     meta: 'Meta 5', trimestre: 'Q2', responsable: 'María Ruiz (RRHH)',            avance: 0,   estado: 'Pendiente' },
  { id: 8,  codigo: 'A-008', actividad: 'Auditoría interna PESV semestral',                         linea: '1. Gestión institucional',  meta: 'Meta 1', trimestre: 'Q2', responsable: 'Carlos Méndez (PESV)',         avance: 0,   estado: 'Pendiente' },
  { id: 9,  codigo: 'A-009', actividad: 'Simulacro de atención a accidentes',                       linea: '5. Atención a víctimas',     meta: 'Meta 5', trimestre: 'Q2', responsable: 'Carlos Méndez (PESV)',         avance: 0,   estado: 'Pendiente' },
  { id: 10, codigo: 'A-010', actividad: 'Renovar programa de incentivos a conductores',              linea: '2. Comportamiento humano',  meta: 'Meta 2', trimestre: 'Q3', responsable: 'María Ruiz (RRHH)',            avance: 0,   estado: 'Pendiente' },
  { id: 11, codigo: 'A-011', actividad: 'Revisión técnico-mecánica del 100% de la flota (RTM)',      linea: '3. Vehículos seguros',       meta: 'Meta 3', trimestre: 'Q3', responsable: 'Andrés Torres (Mantenimiento)',avance: 0,   estado: 'Pendiente' },
  { id: 12, codigo: 'A-012', actividad: 'Informe anual de gestión PESV para Supertransporte',        linea: '1. Gestión institucional',  meta: 'Meta 1', trimestre: 'Q4', responsable: 'Carlos Méndez (PESV)',         avance: 0,   estado: 'Pendiente' },
])

const totalActividades = computed(() => actividades.value.length)
const actividadesEjecutadas = computed(() => actividades.value.filter(a => a.estado === 'Ejecutada').length)
const pctActividades = computed(() => Math.round((actividadesEjecutadas.value / totalActividades.value) * 100))

const totalMetas = 5
const metasAlcanzadas = 3
const pctMetas = Math.round((metasAlcanzadas / totalMetas) * 100)

const actividadesFiltradas = computed(() => {
  return actividades.value.filter(a => {
    const okTrim = filtroTrimestre.value === 'Todos' || a.trimestre === filtroTrimestre.value
    const okEst = filtroEstadoAct.value === 'Todos' || a.estado === filtroEstadoAct.value
    return okTrim && okEst
  })
})

const trimestresResumen = [
  { trim: 'Q1 2026', pct: 87 },
  { trim: 'Q2 2026', pct: 0 },
  { trim: 'Q3 2026', pct: 0 },
  { trim: 'Q4 2026', pct: 0 },
]

const resumenLineas = [
  { nombre: '1. Gestión institucional',  pct: 67 },
  { nombre: '2. Comportamiento humano', pct: 75 },
  { nombre: '3. Vehículos seguros',      pct: 50 },
  { nombre: '4. Infraestructura segura', pct: 80 },
  { nombre: '5. Atención a víctimas',   pct: 50 },
]

const nuevaAct = ref({ actividad: '', linea: '', trimestre: 'Q2', meta: '', responsable: '' })

function guardarActividad() {
  if (!nuevaAct.value.actividad) {
    toast.add({ severity: 'warn', summary: 'Datos incompletos', detail: 'Ingrese la actividad', life: 3000 })
    return
  }
  const id = actividades.value.length + 1
  actividades.value.push({
    id, codigo: `A-${String(id).padStart(3, '0')}`,
    actividad: nuevaAct.value.actividad,
    linea: nuevaAct.value.linea || '1. Gestión institucional',
    meta: nuevaAct.value.meta || 'Sin meta asignada',
    trimestre: nuevaAct.value.trimestre,
    responsable: nuevaAct.value.responsable || 'Sin asignar',
    avance: 0, estado: 'Pendiente',
  })
  toast.add({ severity: 'success', summary: 'Actividad agregada', detail: `A-${String(id).padStart(3, '0')} incluida en el plan anual`, life: 3500 })
  nuevaActividadVisible.value = false
  nuevaAct.value = { actividad: '', linea: '', trimestre: 'Q2', meta: '', responsable: '' }
}

function exportarF2() {
  toast.add({ severity: 'success', summary: 'F2 generado', detail: 'Indicadores 4 y 5 exportados para Supertransporte', life: 4000 })
}
</script>

<style scoped>
.annual-plan { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
.page-title { font-size: 1.4rem; font-weight: 700; color: #1e3a5f; margin: 0; }
.page-subtitle { font-size: 0.82rem; color: #64748b; }
.header-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }

.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem; }
.kpi-card {
  background: white; border-radius: 12px; padding: 1.1rem 1.2rem;
  display: flex; align-items: center; gap: 0.9rem;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08); border-left: 4px solid transparent;
}
.kpi-blue   { border-left-color: #3b82f6; }
.kpi-green  { border-left-color: #22c55e; }
.kpi-yellow { border-left-color: #f59e0b; }
.kpi-purple { border-left-color: #a855f7; }
.kpi-orange { border-left-color: #f97316; }
.kpi-icon { font-size: 1.6rem; opacity: 0.45; }
.kpi-value { display: block; font-size: 1.5rem; font-weight: 700; color: #1e293b; }
.kpi-label { font-size: 0.72rem; color: #64748b; }

.kpis-double { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 900px) { .kpis-double { grid-template-columns: 1fr; } }

.section-card { background: white; border-radius: 12px; padding: 1.4rem; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
.section-title { font-size: 1rem; font-weight: 600; color: #1e3a5f; margin: 0 0 1rem; display: flex; align-items: center; }

.progress-big { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
.progress-label { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; font-weight: 600; color: #334155; }
.progress-detail { font-size: 0.72rem; color: #94a3b8; }
:deep(.prog-green .p-progressbar-value) { background: #22c55e !important; }
:deep(.prog-yellow .p-progressbar-value) { background: #f59e0b !important; }
:deep(.prog-red .p-progressbar-value) { background: #ef4444 !important; }

.trimestres-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.trim-card { background: #f8fafc; border-radius: 8px; padding: 0.6rem 0.8rem; display: flex; align-items: center; gap: 0.5rem; }
.trim-label { font-size: 0.72rem; font-weight: 700; color: #475569; min-width: 55px; }
.trim-bar-wrap { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
.trim-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.trim-pct { font-size: 0.72rem; font-weight: 700; color: #334155; min-width: 32px; text-align: right; }

.lineas-summary { display: flex; flex-direction: column; gap: 0.5rem; }
.linea-row { display: flex; align-items: center; gap: 0.5rem; }
.linea-nombre { font-size: 0.72rem; color: #475569; min-width: 180px; }
.linea-bar-wrap { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
.linea-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.linea-pct { font-size: 0.72rem; font-weight: 700; color: #334155; min-width: 32px; text-align: right; }

.bar-green  { background: #22c55e; }
.bar-yellow { background: #f59e0b; }
.bar-red    { background: #ef4444; }

.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.table-header .section-title { margin: 0; }
.table-filters { display: flex; gap: 0.5rem; }
.font-mono { font-family: monospace; }

.dialog-form { display: flex; flex-direction: column; gap: 1rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-field { display: flex; flex-direction: column; gap: 0.4rem; }
.form-field label { font-size: 0.82rem; font-weight: 600; color: #475569; }
</style>
