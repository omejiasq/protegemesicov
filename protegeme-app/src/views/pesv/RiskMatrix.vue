<template>
  <div class="risk-matrix">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Gestión de Riesgos de Seguridad Vial</h2>
        <span class="page-subtitle">
          Indicador PESV N°3 · Variables 14–17 — Resolución 40595 de 2022, Paso 6
        </span>
      </div>
      <div class="header-actions">
        <Select v-model="anioSeleccionado" :options="anios" optionLabel="label" optionValue="value" class="w-10rem" />
        <Button label="Nuevo riesgo" icon="pi pi-plus" @click="nuevoVisible = true" />
        <Button label="Exportar" icon="pi pi-download" outlined @click="exportar" />
      </div>
    </div>

    <!-- KPIs (variables 14-17) -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-blue">
        <i class="pi pi-list kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ riesgosInicio }}</span>
          <span class="kpi-label">Riesgos al inicio del año (Var. 14)</span>
        </div>
      </div>
      <div class="kpi-card kpi-green">
        <i class="pi pi-check-circle kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ riesgosActuales.length }}</span>
          <span class="kpi-label">Riesgos identificados hoy (Var. 15)</span>
        </div>
      </div>
      <div class="kpi-card kpi-red">
        <i class="pi pi-exclamation-triangle kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ riesgosAltaInicio }}</span>
          <span class="kpi-label">Riesgos alta valoración inicio (Var. 16)</span>
        </div>
      </div>
      <div class="kpi-card" :class="riesgosAltaActual <= riesgosAltaInicio ? 'kpi-green' : 'kpi-red'">
        <i class="pi pi-shield kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ riesgosAltaActual }}</span>
          <span class="kpi-label">Riesgos alta valoración hoy (Var. 17)</span>
        </div>
        <span class="kpi-trend" :class="riesgosAltaActual < riesgosAltaInicio ? 'trend-good' : 'trend-bad'">
          {{ riesgosAltaActual < riesgosAltaInicio ? '▼ Mejorando' : riesgosAltaActual === riesgosAltaInicio ? '= Estable' : '▲ Aumento' }}
        </span>
      </div>
    </div>

    <!-- Matriz de calor -->
    <div class="section-card">
      <h3 class="section-title"><i class="pi pi-th-large mr-2"></i>Matriz de Riesgos — Probabilidad × Impacto</h3>
      <div class="matrix-container">
        <div class="matrix-eje-y">
          <span v-for="p in probabilidades.slice().reverse()" :key="p.value" class="eje-label">{{ p.label }}</span>
        </div>
        <div class="matrix-grid">
          <div v-for="prob in probabilidades.slice().reverse()" :key="prob.value" class="matrix-row">
            <div v-for="imp in impactos" :key="imp.value" class="matrix-cell"
              :class="colorCelda(prob.value, imp.value)">
              <div class="cell-risks">
                <span v-for="r in riesgosEnCelda(prob.value, imp.value)" :key="r.id"
                  class="risk-chip" :class="chipClass(r.nivel)" :title="r.descripcion">
                  {{ r.codigo }}
                </span>
              </div>
              <span class="cell-nivel">{{ nivelRiesgo(prob.value, imp.value) }}</span>
            </div>
          </div>
          <div class="matrix-eje-x">
            <span v-for="imp in impactos" :key="imp.value" class="eje-label">{{ imp.label }}</span>
          </div>
        </div>
      </div>
      <div class="matrix-legend">
        <span class="leg"><span class="dot cell-alto-l"></span> Alto</span>
        <span class="leg"><span class="dot cell-medio-l"></span> Medio</span>
        <span class="leg"><span class="dot cell-bajo-l"></span> Bajo</span>
        <span class="leg"><span class="dot cell-muy-bajo-l"></span> Muy bajo</span>
      </div>
    </div>

    <!-- Tabla de riesgos -->
    <div class="section-card">
      <div class="table-header">
        <h3 class="section-title"><i class="pi pi-table mr-2"></i>Inventario de Riesgos</h3>
        <div class="table-filters">
          <Select v-model="filtroNivel" :options="['Todos', 'Alto', 'Medio', 'Bajo', 'Muy bajo']"
            placeholder="Nivel" class="w-9rem" />
          <Select v-model="filtroEstado" :options="['Todos', 'Activo', 'Controlado', 'Mitigado']"
            placeholder="Estado" class="w-9rem" />
        </div>
      </div>
      <DataTable :value="riesgosFiltrados" stripedRows size="small" :paginator="true" :rows="8"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink">
        <Column field="codigo" header="Cód." style="width:80px">
          <template #body="{ data }">
            <span class="font-mono font-bold text-slate-600">{{ data.codigo }}</span>
          </template>
        </Column>
        <Column field="descripcion" header="Riesgo identificado" style="min-width:220px">
          <template #body="{ data }">
            <div>
              <span class="font-semibold text-sm">{{ data.descripcion }}</span>
              <span class="block text-xs text-slate-400">{{ data.categoria }}</span>
            </div>
          </template>
        </Column>
        <Column field="probabilidad" header="Prob." style="width:80px" bodyClass="text-center">
          <template #body="{ data }">
            <span class="font-bold">{{ data.probabilidad }}</span>
          </template>
        </Column>
        <Column field="impacto" header="Impacto" style="width:80px" bodyClass="text-center">
          <template #body="{ data }">
            <span class="font-bold">{{ data.impacto }}</span>
          </template>
        </Column>
        <Column field="nivel" header="Nivel" style="width:90px">
          <template #body="{ data }">
            <Tag :value="data.nivel"
              :severity="data.nivel === 'Alto' ? 'danger' : data.nivel === 'Medio' ? 'warn' : 'secondary'" />
          </template>
        </Column>
        <Column field="control" header="Control / Medida" />
        <Column field="responsable" header="Responsable" />
        <Column field="estado" header="Estado" style="width:100px">
          <template #body="{ data }">
            <Tag :value="data.estado"
              :severity="data.estado === 'Mitigado' ? 'success' : data.estado === 'Controlado' ? 'warn' : 'danger'" />
          </template>
        </Column>
        <Column header="Acc." style="width:60px" bodyClass="text-center">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text size="small" @click="editarRiesgo(data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Dialog nuevo riesgo -->
    <Dialog v-model:visible="nuevoVisible" header="Registrar Riesgo de Seguridad Vial" :modal="true" style="width:540px">
      <div class="dialog-form">
        <div class="form-field">
          <label>Descripción del riesgo *</label>
          <Textarea v-model="nuevoForm.descripcion" rows="2" class="w-full" placeholder="Describa el riesgo identificado…" />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Categoría</label>
            <Select v-model="nuevoForm.categoria" :options="categorias" placeholder="Categoría" class="w-full" />
          </div>
          <div class="form-field">
            <label>Probabilidad (1–5) *</label>
            <Select v-model="nuevoForm.probabilidad" :options="[1,2,3,4,5]" placeholder="1=Raro, 5=Casi seguro" class="w-full" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Impacto (1–5) *</label>
            <Select v-model="nuevoForm.impacto" :options="[1,2,3,4,5]" placeholder="1=Insignificante, 5=Catastrófico" class="w-full" />
          </div>
          <div class="form-field">
            <label>Control / Medida preventiva</label>
            <InputText v-model="nuevoForm.control" placeholder="Ej: Capacitación, GPS, mantenimiento" class="w-full" />
          </div>
        </div>
        <div class="form-field">
          <label>Responsable</label>
          <Select v-model="nuevoForm.responsable" :options="responsables" placeholder="Asignar responsable" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="nuevoVisible = false" />
        <Button label="Guardar riesgo" icon="pi pi-save" @click="guardarRiesgo" />
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
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const nuevoVisible = ref(false)
const filtroNivel = ref('Todos')
const filtroEstado = ref('Todos')
const anios = [{ label: '2026', value: '2026' }, { label: '2025', value: '2025' }]
const anioSeleccionado = ref('2026')

const probabilidades = [
  { label: '1 Raro',        value: 1 },
  { label: '2 Improbable',  value: 2 },
  { label: '3 Posible',     value: 3 },
  { label: '4 Probable',    value: 4 },
  { label: '5 Casi seguro', value: 5 },
]
const impactos = [
  { label: '1 Insignificante', value: 1 },
  { label: '2 Menor',          value: 2 },
  { label: '3 Moderado',       value: 3 },
  { label: '4 Mayor',          value: 4 },
  { label: '5 Catastrófico',   value: 5 },
]

const categorias = ['Comportamiento humano', 'Vehículos', 'Infraestructura vial', 'Condiciones ambientales', 'Gestión operativa']
const responsables = ['Carlos Méndez (PESV)', 'Laura Gómez (Operaciones)', 'Andrés Torres (Mantenimiento)', 'María Ruiz (RRHH)']

function calcularNivel(p: number, imp: number): string {
  const score = p * imp
  if (score >= 15) return 'Alto'
  if (score >= 8)  return 'Medio'
  if (score >= 3)  return 'Bajo'
  return 'Muy bajo'
}

const riesgosActuales = ref([
  { id: 1, codigo: 'R-001', descripcion: 'Exceso de jornada laboral sin detección automática',             categoria: 'Comportamiento humano', probabilidad: 4, impacto: 4, nivel: 'Alto',    control: 'Módulo horas conducidas + alerta automática',  responsable: 'Carlos Méndez (PESV)',     estado: 'Controlado' },
  { id: 2, codigo: 'R-002', descripcion: 'Conductor con alcoholemia positiva en servicio',                  categoria: 'Comportamiento humano', probabilidad: 2, impacto: 5, nivel: 'Alto',    control: 'Test alcoholemia BLE antes de cada turno',     responsable: 'Carlos Méndez (PESV)',     estado: 'Controlado' },
  { id: 3, codigo: 'R-003', descripcion: 'Vehículo con SOAT o RTM vencido operando en servicio',            categoria: 'Vehículos',             probabilidad: 2, impacto: 4, nivel: 'Medio',   control: 'Alertas de vencimiento con 30 días de anticipación', responsable: 'Andrés Torres (Mantenimiento)', estado: 'Mitigado' },
  { id: 4, codigo: 'R-004', descripcion: 'Exceso de velocidad reiterado en conductor específico',           categoria: 'Comportamiento humano', probabilidad: 3, impacto: 4, nivel: 'Alto',    control: 'GPS + score de hábitos + bloqueo de turno',   responsable: 'Carlos Méndez (PESV)',     estado: 'Controlado' },
  { id: 5, codigo: 'R-005', descripcion: 'Falla mecánica por falta de mantenimiento preventivo',            categoria: 'Vehículos',             probabilidad: 3, impacto: 3, nivel: 'Medio',   control: 'Programa mantenimiento preventivo por km',     responsable: 'Andrés Torres (Mantenimiento)', estado: 'Controlado' },
  { id: 6, codigo: 'R-006', descripcion: 'Ruta con tramo de alta siniestralidad sin evaluación',            categoria: 'Infraestructura vial',  probabilidad: 3, impacto: 3, nivel: 'Medio',   control: 'Evaluación semestral de rutas',                responsable: 'Laura Gómez (Operaciones)',   estado: 'Activo' },
  { id: 7, codigo: 'R-007', descripcion: 'Conductor sin capacitación actualizada en seguridad vial',        categoria: 'Comportamiento humano', probabilidad: 2, impacto: 3, nivel: 'Bajo',    control: 'Módulo capacitaciones + registro de asistencia', responsable: 'María Ruiz (RRHH)',          estado: 'Mitigado' },
  { id: 8, codigo: 'R-008', descripcion: 'Alistamiento incompleto — pieza crítica no verificada',           categoria: 'Vehículos',             probabilidad: 2, impacto: 3, nivel: 'Bajo',    control: 'Alistamiento digital con firma y foto evidencia', responsable: 'Andrés Torres (Mantenimiento)', estado: 'Controlado' },
  { id: 9, codigo: 'R-009', descripcion: 'Condiciones climáticas adversas sin protocolo de suspensión',     categoria: 'Condiciones ambientales', probabilidad: 3, impacto: 2, nivel: 'Bajo',  control: 'Protocolo lluvia / neblina en rutas de montaña', responsable: 'Laura Gómez (Operaciones)',   estado: 'Activo' },
  { id: 10, codigo: 'R-010', descripcion: 'Accidente vial sin kit de primeros auxilios verificado',         categoria: 'Gestión operativa',     probabilidad: 1, impacto: 4, nivel: 'Bajo',    control: 'Verificación botiquín en alistamiento',        responsable: 'Andrés Torres (Mantenimiento)', estado: 'Mitigado' },
])

const riesgosInicio = 8
const riesgosAltaInicio = 3
const riesgosAltaActual = computed(() => riesgosActuales.value.filter(r => r.nivel === 'Alto').length)

const riesgosFiltrados = computed(() => {
  return riesgosActuales.value.filter(r => {
    const okNivel  = filtroNivel.value  === 'Todos' || r.nivel  === filtroNivel.value
    const okEstado = filtroEstado.value === 'Todos' || r.estado === filtroEstado.value
    return okNivel && okEstado
  })
})

function riesgosEnCelda(prob: number, imp: number) {
  return riesgosActuales.value.filter(r => r.probabilidad === prob && r.impacto === imp)
}

function nivelRiesgo(p: number, i: number) { return calcularNivel(p, i) }

function colorCelda(p: number, i: number): string {
  const n = calcularNivel(p, i)
  return n === 'Alto' ? 'cell-alto' : n === 'Medio' ? 'cell-medio' : n === 'Bajo' ? 'cell-bajo' : 'cell-muy-bajo'
}

function chipClass(nivel: string): string {
  return nivel === 'Alto' ? 'chip-alto' : nivel === 'Medio' ? 'chip-medio' : 'chip-bajo'
}

const nuevoForm = ref({ descripcion: '', categoria: '', probabilidad: null as number | null, impacto: null as number | null, control: '', responsable: '' })

function guardarRiesgo() {
  if (!nuevoForm.value.descripcion || !nuevoForm.value.probabilidad || !nuevoForm.value.impacto) {
    toast.add({ severity: 'warn', summary: 'Datos incompletos', detail: 'Complete descripción, probabilidad e impacto', life: 3000 })
    return
  }
  const p = nuevoForm.value.probabilidad!
  const i = nuevoForm.value.impacto!
  const id = riesgosActuales.value.length + 1
  riesgosActuales.value.push({
    id, codigo: `R-${String(id).padStart(3, '0')}`,
    descripcion: nuevoForm.value.descripcion,
    categoria: nuevoForm.value.categoria || 'Gestión operativa',
    probabilidad: p, impacto: i,
    nivel: calcularNivel(p, i),
    control: nuevoForm.value.control,
    responsable: nuevoForm.value.responsable || 'Sin asignar',
    estado: 'Activo',
  })
  toast.add({ severity: 'success', summary: 'Riesgo registrado', detail: `${riesgosActuales.value[riesgosActuales.value.length-1].codigo} creado con nivel ${calcularNivel(p, i)}`, life: 4000 })
  nuevoVisible.value = false
  nuevoForm.value = { descripcion: '', categoria: '', probabilidad: null, impacto: null, control: '', responsable: '' }
}

function editarRiesgo(data: any) {
  toast.add({ severity: 'info', summary: data.codigo, detail: 'Edición disponible en versión completa', life: 2500 })
}

function exportar() {
  toast.add({ severity: 'success', summary: 'Exportando', detail: 'Matriz de riesgos exportada — indicador 3, variables 14–17', life: 3500 })
}
</script>

<style scoped>
.risk-matrix { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
.page-title { font-size: 1.4rem; font-weight: 700; color: #1e3a5f; margin: 0; }
.page-subtitle { font-size: 0.82rem; color: #64748b; }
.header-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }

.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem; }
.kpi-card {
  background: white; border-radius: 12px; padding: 1.1rem 1.2rem;
  display: flex; align-items: center; gap: 0.9rem; position: relative;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08); border-left: 4px solid transparent;
}
.kpi-blue   { border-left-color: #3b82f6; }
.kpi-green  { border-left-color: #22c55e; }
.kpi-red    { border-left-color: #ef4444; }
.kpi-orange { border-left-color: #f97316; }
.kpi-icon { font-size: 1.6rem; opacity: 0.45; }
.kpi-value { display: block; font-size: 1.5rem; font-weight: 700; color: #1e293b; }
.kpi-label { font-size: 0.72rem; color: #64748b; }
.kpi-trend { position: absolute; top: 0.5rem; right: 0.7rem; font-size: 0.65rem; font-weight: 700; }
.trend-good { color: #16a34a; }
.trend-bad  { color: #dc2626; }

.section-card { background: white; border-radius: 12px; padding: 1.4rem; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
.section-title { font-size: 1rem; font-weight: 600; color: #1e3a5f; margin: 0 0 1.2rem; display: flex; align-items: center; }

/* Matriz */
.matrix-container { display: flex; gap: 0.5rem; align-items: flex-start; overflow-x: auto; }
.matrix-eje-y { display: flex; flex-direction: column; justify-content: space-around; padding-bottom: 2rem; min-width: 90px; }
.eje-label { font-size: 0.7rem; color: #64748b; font-weight: 600; text-align: right; padding-right: 0.4rem; line-height: 1.2; }
.matrix-grid { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 360px; }
.matrix-row { display: flex; gap: 3px; }
.matrix-cell {
  flex: 1; min-height: 60px; border-radius: 6px; padding: 4px;
  display: flex; flex-direction: column; justify-content: space-between; align-items: center;
  position: relative;
}
.cell-alto     { background: #fecaca; }
.cell-medio    { background: #fde68a; }
.cell-bajo     { background: #bbf7d0; }
.cell-muy-bajo { background: #e0f2fe; }
.cell-nivel { font-size: 0.6rem; color: rgba(0,0,0,0.4); font-weight: 600; }
.cell-risks { display: flex; flex-wrap: wrap; gap: 2px; justify-content: center; }
.risk-chip { font-size: 0.6rem; font-weight: 700; padding: 1px 5px; border-radius: 4px; cursor: default; }
.chip-alto  { background: #ef4444; color: white; }
.chip-medio { background: #f59e0b; color: white; }
.chip-bajo  { background: #22c55e; color: white; }
.matrix-eje-x { display: flex; padding-top: 4px; }
.matrix-eje-x .eje-label { flex: 1; text-align: center; }
.matrix-legend { display: flex; gap: 1.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
.leg { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: #64748b; }
.dot { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
.cell-alto-l     { background: #fecaca; border: 1px solid #fca5a5; }
.cell-medio-l    { background: #fde68a; border: 1px solid #fcd34d; }
.cell-bajo-l     { background: #bbf7d0; border: 1px solid #86efac; }
.cell-muy-bajo-l { background: #e0f2fe; border: 1px solid #7dd3fc; }

.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.table-header .section-title { margin: 0; }
.table-filters { display: flex; gap: 0.5rem; }
.font-mono { font-family: monospace; }

.dialog-form { display: flex; flex-direction: column; gap: 1rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-field { display: flex; flex-direction: column; gap: 0.4rem; }
.form-field label { font-size: 0.82rem; font-weight: 600; color: #475569; }
</style>
