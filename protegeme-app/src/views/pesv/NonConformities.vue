<template>
  <div class="ncac-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">No Conformidades — NCAC</h2>
        <span class="page-subtitle">
          Indicador PESV N°13 · Seguimiento de auditorías internas de seguridad vial · Resolución 40595 Art. 20
        </span>
      </div>
      <div class="header-actions">
        <Select v-model="anioSeleccionado" :options="anios" optionLabel="label" optionValue="value" class="w-10rem" />
        <Button label="Nueva NC" icon="pi pi-plus" @click="nuevaVisible = true" />
      </div>
    </div>

    <!-- KPIs (variables 40 y 41 del PESV) -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-blue">
        <i class="pi pi-list kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ ncIdentificadas }}</span>
          <span class="kpi-label">NC identificadas (Var. 40)</span>
        </div>
      </div>
      <div class="kpi-card kpi-green">
        <i class="pi pi-check-circle kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ ncCerradas }}</span>
          <span class="kpi-label">NC gestionadas y cerradas (Var. 41)</span>
        </div>
      </div>
      <div class="kpi-card" :class="pctGestion >= 90 ? 'kpi-green' : pctGestion >= 60 ? 'kpi-yellow' : 'kpi-red'">
        <i class="pi pi-chart-pie kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ pctGestion }}%</span>
          <span class="kpi-label">% NCAC gestionado (Ind. 13)</span>
        </div>
      </div>
      <div class="kpi-card kpi-orange">
        <i class="pi pi-clock kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ ncAbiertas }}</span>
          <span class="kpi-label">NC abiertas / en proceso</span>
        </div>
      </div>
    </div>

    <!-- Semáforo PESV -->
    <div class="section-card">
      <h3 class="section-title"><i class="pi pi-traffic-cone mr-2"></i>Indicador 13 — NCAC · {{ anioLabel }}</h3>
      <div class="semaforo-row">
        <div class="semaforo-meta">
          <span class="semaforo-label">Meta anual: ≥ 80% de NC gestionadas y cerradas</span>
          <Tag :value="`${pctGestion}%`" :severity="pctGestion >= 80 ? 'success' : pctGestion >= 50 ? 'warn' : 'danger'" />
        </div>
        <ProgressBar :value="pctGestion" :class="`progress-${pctGestion >= 80 ? 'green' : pctGestion >= 50 ? 'yellow' : 'red'}`" style="height: 12px" />
        <span class="semaforo-detalle">
          {{ ncCerradas }} de {{ ncIdentificadas }} no conformidades cerradas
          {{ pctGestion >= 80 ? '· ✅ Cumple meta Supertransporte' : '· ⚠️ Por debajo de la meta' }}
        </span>
      </div>
    </div>

    <!-- Tabla NC -->
    <div class="section-card">
      <div class="table-header">
        <h3 class="section-title"><i class="pi pi-table mr-2"></i>Registro de No Conformidades</h3>
        <div class="table-filters">
          <Select v-model="filtroEstado" :options="['Todos', 'Abierta', 'En proceso', 'Cerrada']"
            placeholder="Estado" class="w-9rem" />
        </div>
      </div>

      <DataTable :value="ncFiltradas" stripedRows size="small" :paginator="true" :rows="8"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink">
        <Column field="codigo" header="Código" style="width:90px">
          <template #body="{ data }">
            <span class="font-mono text-sm font-bold text-slate-600">{{ data.codigo }}</span>
          </template>
        </Column>
        <Column field="tipo" header="Tipo" style="width:110px">
          <template #body="{ data }">
            <Tag :value="data.tipo" :severity="data.tipo === 'Mayor' ? 'danger' : data.tipo === 'Menor' ? 'warn' : 'secondary'" />
          </template>
        </Column>
        <Column field="descripcion" header="Descripción" style="min-width:220px">
          <template #body="{ data }">
            <div>
              <span class="font-semibold text-sm">{{ data.descripcion }}</span>
              <span class="block text-xs text-slate-400">{{ data.linea }}</span>
            </div>
          </template>
        </Column>
        <Column field="origen" header="Origen auditoría" />
        <Column field="fechaDeteccion" header="Detección" style="width:110px" />
        <Column field="responsable" header="Responsable" />
        <Column field="fechaCierre" header="Cierre" style="width:110px">
          <template #body="{ data }">
            <span v-if="data.fechaCierre" class="text-green-600">{{ data.fechaCierre }}</span>
            <span v-else class="text-slate-400 text-xs">Pendiente</span>
          </template>
        </Column>
        <Column field="estado" header="Estado" style="width:100px">
          <template #body="{ data }">
            <Tag :value="data.estado"
              :severity="data.estado === 'Cerrada' ? 'success' : data.estado === 'En proceso' ? 'warn' : 'danger'" />
          </template>
        </Column>
        <Column header="Acc." style="width:80px" bodyClass="text-center">
          <template #body="{ data }">
            <div class="flex gap-1 justify-center">
              <Button icon="pi pi-eye" text size="small" @click="verDetalle(data)" />
              <Button v-if="data.estado !== 'Cerrada'" icon="pi pi-check" text size="small" severity="success"
                @click="cerrarNC(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Tendencia anual -->
    <div class="section-card">
      <h3 class="section-title"><i class="pi pi-chart-bar mr-2"></i>Evolución NCAC — Seguimiento mensual</h3>
      <div class="chart-scroll">
        <div class="chart-bars">
          <div v-for="mes in tendenciaMes" :key="mes.mes" class="bar-group">
            <div class="bar-wrap">
              <div class="bar bar-total" :style="{ height: `${mes.total * 8}px` }">
                <span class="bar-val">{{ mes.total }}</span>
              </div>
              <div class="bar bar-cerrada" :style="{ height: `${mes.cerradas * 8}px` }">
                <span class="bar-val">{{ mes.cerradas }}</span>
              </div>
            </div>
            <span class="bar-label">{{ mes.mes }}</span>
          </div>
        </div>
        <div class="chart-legend">
          <span class="leg-item"><span class="dot dot-blue"></span> NC identificadas</span>
          <span class="leg-item"><span class="dot dot-green"></span> NC cerradas</span>
        </div>
      </div>
    </div>

    <!-- Dialog nueva NC -->
    <Dialog v-model:visible="nuevaVisible" header="Registrar No Conformidad" :modal="true" style="width:520px">
      <div class="dialog-form">
        <div class="form-field">
          <label>Tipo *</label>
          <Select v-model="nuevaNc.tipo" :options="['Mayor', 'Menor', 'Observación']" placeholder="Tipo NC" class="w-full" />
        </div>
        <div class="form-field">
          <label>Descripción *</label>
          <Textarea v-model="nuevaNc.descripcion" rows="3" class="w-full" placeholder="Describa la no conformidad identificada…" />
        </div>
        <div class="form-field">
          <label>Línea PESV afectada</label>
          <Select v-model="nuevaNc.linea" :options="lineasPesv" placeholder="Seleccione línea" class="w-full" />
        </div>
        <div class="form-field">
          <label>Origen / Auditoría</label>
          <InputText v-model="nuevaNc.origen" placeholder="Ej: Auditoría interna Q1 2026" class="w-full" />
        </div>
        <div class="form-field">
          <label>Responsable cierre</label>
          <Select v-model="nuevaNc.responsable" :options="responsables" placeholder="Asignar responsable" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="nuevaVisible = false" />
        <Button label="Registrar NC" icon="pi pi-plus" @click="guardarNuevaNc" />
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
import Textarea from 'primevue/textarea'
import InputText from 'primevue/inputtext'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const nuevaVisible = ref(false)
const filtroEstado = ref('Todos')

const anios = [
  { label: '2026', value: '2026' },
  { label: '2025', value: '2025' },
]
const anioSeleccionado = ref('2026')
const anioLabel = computed(() => anioSeleccionado.value)

const lineasPesv = [
  '1. Gestión institucional',
  '2. Comportamiento humano',
  '3. Vehículos seguros',
  '4. Infraestructura segura',
  '5. Atención a víctimas',
]

const responsables = ['Carlos Méndez (PESV)', 'Laura Gómez (Operaciones)', 'Andrés Torres (Mantenimiento)', 'María Ruiz (RRHH)']

const ncs = ref([
  { id: 1, codigo: 'NC-001', tipo: 'Mayor',      descripcion: 'Conductor sin registro alcoholemia en 3 turnos consecutivos', linea: '2. Comportamiento humano',  origen: 'Auditoría interna Q4 2025', fechaDeteccion: '10/01/2026', responsable: 'Carlos Méndez (PESV)',        fechaCierre: '28/02/2026', estado: 'Cerrada' },
  { id: 2, codigo: 'NC-002', tipo: 'Menor',      descripcion: 'Alistamiento diario incompleto — vehículo GHI-789',           linea: '3. Vehículos seguros',        origen: 'Auditoría interna Q4 2025', fechaDeteccion: '15/01/2026', responsable: 'Andrés Torres (Mantenimiento)', fechaCierre: '20/01/2026', estado: 'Cerrada' },
  { id: 3, codigo: 'NC-003', tipo: 'Mayor',      descripcion: 'Exceso de jornada diaria sin alerta — conductor DEF-456',     linea: '2. Comportamiento humano',  origen: 'Revisión interna febrero',  fechaDeteccion: '03/02/2026', responsable: 'Carlos Méndez (PESV)',        fechaCierre: '18/03/2026', estado: 'Cerrada' },
  { id: 4, codigo: 'NC-004', tipo: 'Observación', descripcion: 'Falta evidencia fotográfica en capacitación de enero',        linea: '2. Comportamiento humano',  origen: 'Revisión documental PESV',  fechaDeteccion: '12/02/2026', responsable: 'María Ruiz (RRHH)',            fechaCierre: '01/03/2026', estado: 'Cerrada' },
  { id: 5, codigo: 'NC-005', tipo: 'Mayor',      descripcion: 'SOAT vencido vehículo JKL-012 sin alerta temprana',           linea: '3. Vehículos seguros',        origen: 'Control documentos marzo',  fechaDeteccion: '08/03/2026', responsable: 'Andrés Torres (Mantenimiento)', fechaCierre: null,         estado: 'En proceso' },
  { id: 6, codigo: 'NC-006', tipo: 'Menor',      descripcion: 'Capacitación Q1 con < 80% de asistencia requerida',           linea: '2. Comportamiento humano',  origen: 'Auditoría interna Q1 2026', fechaDeteccion: '25/03/2026', responsable: 'María Ruiz (RRHH)',            fechaCierre: null,         estado: 'Abierta' },
  { id: 7, codigo: 'NC-007', tipo: 'Observación', descripcion: 'Ruta sin evaluación de infraestructura (Bogotá–Girardot)',    linea: '4. Infraestructura segura', origen: 'Auditoría interna Q1 2026', fechaDeteccion: '26/03/2026', responsable: 'Laura Gómez (Operaciones)',     fechaCierre: null,         estado: 'Abierta' },
])

const ncFiltradas = computed(() => {
  if (filtroEstado.value === 'Todos') return ncs.value
  return ncs.value.filter(n => n.estado === filtroEstado.value)
})

const ncIdentificadas = computed(() => ncs.value.length)
const ncCerradas = computed(() => ncs.value.filter(n => n.estado === 'Cerrada').length)
const ncAbiertas = computed(() => ncs.value.filter(n => n.estado !== 'Cerrada').length)
const pctGestion = computed(() => Math.round((ncCerradas.value / ncIdentificadas.value) * 100))

const tendenciaMes = [
  { mes: 'Oct', total: 1, cerradas: 0 },
  { mes: 'Nov', total: 2, cerradas: 1 },
  { mes: 'Dic', total: 3, cerradas: 2 },
  { mes: 'Ene', total: 2, cerradas: 2 },
  { mes: 'Feb', total: 3, cerradas: 3 },
  { mes: 'Mar', total: 2, cerradas: 0 },
]

const nuevaNc = ref({ tipo: '', descripcion: '', linea: '', origen: '', responsable: '' })

function guardarNuevaNc() {
  if (!nuevaNc.value.tipo || !nuevaNc.value.descripcion) {
    toast.add({ severity: 'warn', summary: 'Datos incompletos', detail: 'Complete tipo y descripción', life: 3000 })
    return
  }
  const id = ncs.value.length + 1
  ncs.value.push({
    id,
    codigo: `NC-${String(id).padStart(3, '0')}`,
    tipo: nuevaNc.value.tipo,
    descripcion: nuevaNc.value.descripcion,
    linea: nuevaNc.value.linea || '1. Gestión institucional',
    origen: nuevaNc.value.origen || 'Registro manual',
    fechaDeteccion: new Date().toLocaleDateString('es-CO'),
    responsable: nuevaNc.value.responsable || 'Sin asignar',
    fechaCierre: null,
    estado: 'Abierta',
  })
  toast.add({ severity: 'success', summary: 'NC registrada', detail: `${ncs.value[ncs.value.length-1].codigo} creada correctamente`, life: 3500 })
  nuevaVisible.value = false
  nuevaNc.value = { tipo: '', descripcion: '', linea: '', origen: '', responsable: '' }
}

function cerrarNC(data: any) {
  const idx = ncs.value.findIndex(n => n.id === data.id)
  if (idx >= 0) {
    ncs.value[idx].estado = 'Cerrada'
    ncs.value[idx].fechaCierre = new Date().toLocaleDateString('es-CO')
    toast.add({ severity: 'success', summary: 'NC cerrada', detail: `${data.codigo} marcada como gestionada y cerrada`, life: 3500 })
  }
}

function verDetalle(data: any) {
  toast.add({ severity: 'info', summary: data.codigo, detail: data.descripcion, life: 4000 })
}
</script>

<style scoped>
.ncac-view { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
.page-title { font-size: 1.4rem; font-weight: 700; color: #1e3a5f; margin: 0; }
.page-subtitle { font-size: 0.82rem; color: #64748b; }
.header-actions { display: flex; gap: 0.75rem; align-items: center; }

.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem; }
.kpi-card {
  background: white; border-radius: 12px; padding: 1.1rem 1.2rem;
  display: flex; align-items: center; gap: 0.9rem;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08); border-left: 4px solid transparent;
}
.kpi-blue   { border-left-color: #3b82f6; }
.kpi-green  { border-left-color: #22c55e; }
.kpi-yellow { border-left-color: #f59e0b; }
.kpi-red    { border-left-color: #ef4444; }
.kpi-orange { border-left-color: #f97316; }
.kpi-icon { font-size: 1.6rem; opacity: 0.45; }
.kpi-value { display: block; font-size: 1.5rem; font-weight: 700; color: #1e293b; }
.kpi-label { font-size: 0.72rem; color: #64748b; }

.section-card { background: white; border-radius: 12px; padding: 1.4rem; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
.section-title { font-size: 1rem; font-weight: 600; color: #1e3a5f; margin: 0 0 1.2rem; display: flex; align-items: center; }

.semaforo-row { display: flex; flex-direction: column; gap: 0.6rem; }
.semaforo-meta { display: flex; justify-content: space-between; align-items: center; }
.semaforo-label { font-size: 0.85rem; color: #475569; font-weight: 600; }
.semaforo-detalle { font-size: 0.78rem; color: #94a3b8; }
:deep(.progress-green .p-progressbar-value) { background: #22c55e !important; }
:deep(.progress-yellow .p-progressbar-value) { background: #f59e0b !important; }
:deep(.progress-red .p-progressbar-value) { background: #ef4444 !important; }

.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.table-header .section-title { margin: 0; }
.table-filters { display: flex; gap: 0.5rem; }

.font-mono { font-family: monospace; }

.chart-scroll { overflow-x: auto; }
.chart-bars { display: flex; align-items: flex-end; gap: 1.5rem; height: 140px; padding: 0 0.5rem; min-width: 400px; }
.bar-group { display: flex; flex-direction: column; align-items: center; flex: 1; }
.bar-wrap { display: flex; align-items: flex-end; gap: 4px; height: 120px; }
.bar { width: 28px; border-radius: 4px 4px 0 0; position: relative; display: flex; align-items: flex-start; justify-content: center; }
.bar-total  { background: #3b82f6; }
.bar-cerrada{ background: #22c55e; }
.bar-val { font-size: 0.65rem; font-weight: 700; color: white; padding-top: 3px; }
.bar-label { font-size: 0.78rem; color: #64748b; margin-top: 0.3rem; }
.chart-legend { display: flex; gap: 1.5rem; justify-content: center; margin-top: 0.75rem; }
.leg-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: #64748b; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.dot-blue  { background: #3b82f6; }
.dot-green { background: #22c55e; }

.dialog-form { display: flex; flex-direction: column; gap: 1rem; }
.form-field { display: flex; flex-direction: column; gap: 0.4rem; }
.form-field label { font-size: 0.82rem; font-weight: 600; color: #475569; }
</style>
