<template>
  <div class="evidence-view">
    <div class="page-header">
      <div>
        <h2 class="page-title">Evidencias Formulario 2</h2>
        <span class="page-subtitle">Consolidado de cumplimiento para reporte a Supertransporte</span>
      </div>
      <div class="header-actions">
        <Select v-model="mes" :options="meses" optionLabel="label" optionValue="value" class="w-12rem" />
        <Button label="Generar F2 PDF" icon="pi pi-file-pdf" severity="danger" @click="generarF2" :loading="generando" />
      </div>
    </div>

    <!-- Progreso global -->
    <div class="progress-banner">
      <div class="progress-banner-left">
        <span class="progress-pct-big">{{ pctGlobal }}%</span>
        <div>
          <span class="progress-label-big">Cumplimiento Formulario 2 — {{ mesLabel }}</span>
          <span class="progress-sub">{{ indicadoresCumplen }} de {{ indicadores.length }} indicadores cumplen la meta</span>
        </div>
      </div>
      <div class="progress-bar-wrap">
        <ProgressBar :value="pctGlobal" :class="pctGlobal >= 90 ? 'pb-green' : pctGlobal >= 60 ? 'pb-yellow' : 'pb-red'" style="height:18px;border-radius:9px" />
      </div>
      <Tag :value="pctGlobal >= 90 ? 'CUMPLE' : pctGlobal >= 60 ? 'EN RIESGO' : 'INCUMPLE'"
        :severity="pctGlobal >= 90 ? 'success' : pctGlobal >= 60 ? 'warn' : 'danger'"
        style="font-size:1rem;padding:0.5rem 1rem" />
    </div>

    <!-- Tabla de evidencias por indicador -->
    <div class="section-card">
      <h3 class="section-title"><i class="pi pi-clipboard mr-2"></i>Indicadores F2 — Evidencias Adjuntas</h3>
      <DataTable :value="indicadores" stripedRows size="small" dataKey="indicador" v-model:expandedRows="expanded">
        <Column expander style="width:3rem" />
        <Column field="linea" header="Línea de Acción" style="width:180px">
          <template #body="{ data }">
            <Tag :value="data.linea" severity="secondary" class="text-xs" />
          </template>
        </Column>
        <Column field="indicador" header="Indicador" style="min-width:220px" />
        <Column field="meta" header="Meta" style="width:80px" bodyClass="text-center" />
        <Column field="valor" header="Valor" style="width:90px" bodyClass="text-center">
          <template #body="{ data }">
            <span :class="data.valor >= data.meta ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
              {{ data.valor }}{{ data.unidad }}
            </span>
          </template>
        </Column>
        <Column header="Estado" style="width:110px" bodyClass="text-center">
          <template #body="{ data }">
            <Tag :value="data.valor >= data.meta ? 'Cumple' : 'No cumple'"
              :severity="data.valor >= data.meta ? 'success' : 'danger'" />
          </template>
        </Column>
        <Column header="Evidencias" style="min-width:200px">
          <template #body="{ data }">
            <div class="evidencias-chips">
              <Chip v-for="ev in data.evidencias" :key="ev.tipo" :label="ev.tipo" :icon="`pi ${ev.icon}`" class="chip-sm" />
            </div>
          </template>
        </Column>
        <Column header="" style="width:80px" bodyClass="text-center">
          <template #body="{ data }">
            <Button icon="pi pi-download" text size="small" @click="descargarEvidencia(data)" v-tooltip.top="'Descargar evidencia'" />
          </template>
        </Column>
        <template #expansion="{ data }">
          <div class="expansion-detail">
            <strong>Fuente de datos:</strong> {{ data.fuente }}
            <br />
            <strong>Observaciones:</strong> {{ data.obs }}
          </div>
        </template>
      </DataTable>
    </div>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Chip from 'primevue/chip'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressBar from 'primevue/progressbar'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const meses = [
  { label: 'Marzo 2026', value: '2026-03' },
  { label: 'Febrero 2026', value: '2026-02' },
]
const mes = ref('2026-03')
const mesLabel = computed(() => meses.find(m => m.value === mes.value)?.label ?? '')
const generando = ref(false)
const expanded = ref({})

const indicadores = [
  {
    linea: 'Gestión inst.', indicador: 'Alistamientos diarios completados (%)', meta: 95, valor: 98, unidad: '%',
    fuente: 'Módulo Alistamiento — protegemesicov', obs: 'Los 2 registros faltantes corresponden a un vehículo en taller.',
    evidencias: [{ tipo: 'PDF Alistamientos', icon: 'pi-file-pdf' }, { tipo: 'Firmas digitales', icon: 'pi-pen-to-square' }],
  },
  {
    linea: 'Gestión inst.', indicador: 'Mantenimientos preventivos ejecutados (%)', meta: 90, valor: 93, unidad: '%',
    fuente: 'Módulo Mantenimiento — protegemesicov', obs: 'Todos los vehículos tienen OT de mantenimiento al día.',
    evidencias: [{ tipo: 'OT digitales', icon: 'pi-wrench' }, { tipo: 'Fotos', icon: 'pi-camera' }],
  },
  {
    linea: 'Comp. humano', indicador: 'Conductores con prueba alcoholemia (%)', meta: 100, valor: 100, unidad: '%',
    fuente: 'Registro BLE — App Móvil + protegemesicov', obs: 'Se realizaron 10 pruebas. 1 resultado positivo con bloqueo automático.',
    evidencias: [{ tipo: 'Log BLE', icon: 'pi-list' }, { tipo: 'Fotos evidencia', icon: 'pi-camera' }],
  },
  {
    linea: 'Comp. humano', indicador: 'Conductores con score hábitos ≥ 70 (%)', meta: 80, valor: 67, unidad: '%',
    fuente: 'App Tracking — backend_protegos / api-driver-safety', obs: '2 conductores con score < 70. Capacitación programada.',
    evidencias: [{ tipo: 'Reporte score', icon: 'pi-chart-bar' }],
  },
  {
    linea: 'Comp. humano', indicador: 'Capacitaciones en seguridad vial realizadas', meta: 2, valor: 1, unidad: '',
    fuente: 'Módulo Capacitaciones — protegemesicov', obs: 'Se realizó 1 de 2 capacitaciones planificadas. La segunda está programada para el 15 de abril.',
    evidencias: [{ tipo: 'Acta PDF', icon: 'pi-file-pdf' }, { tipo: 'Asistencia', icon: 'pi-users' }],
  },
  {
    linea: 'Vehículos', indicador: 'Vehículos con documentación vigente (%)', meta: 100, valor: 100, unidad: '%',
    fuente: 'Gestión Vehículos — protegemesicov', obs: 'SOAT, RTM y tarjeta de propiedad vigentes para todos los vehículos.',
    evidencias: [{ tipo: 'SOAT', icon: 'pi-shield' }, { tipo: 'RTM', icon: 'pi-wrench' }],
  },
  {
    linea: 'Vehículos', indicador: 'Horas conducción dentro del límite legal (%)', meta: 100, valor: 96, unidad: '%',
    fuente: 'Control Turno — App Móvil + protegemesicov', obs: '1 conductor presentó 2 jornadas con exceso de 30 min. Notificado.',
    evidencias: [{ tipo: 'Log turnos', icon: 'pi-clock' }],
  },
  {
    linea: 'Incidentes', indicador: 'Incidentes reportados con acta ARL', meta: 100, valor: 100, unidad: '%',
    fuente: 'Módulo Incidentes — protegemesicov', obs: 'No se registraron incidentes en el período. Indicador cumplido por omisión.',
    evidencias: [{ tipo: 'Sin incidentes', icon: 'pi-check-circle' }],
  },
]

const indicadoresCumplen = computed(() => indicadores.filter(i => i.valor >= i.meta).length)
const pctGlobal = computed(() => Math.round((indicadoresCumplen.value / indicadores.length) * 100))

function descargarEvidencia(data: any) {
  toast.add({ severity: 'info', summary: 'Descargando', detail: `Evidencia de "${data.indicador}" generada`, life: 2500 })
}
async function generarF2() {
  generando.value = true
  await new Promise(r => setTimeout(r, 1800))
  generando.value = false
  toast.add({ severity: 'success', summary: 'Formulario 2 generado', detail: `F2 de ${mesLabel.value} listo para enviar a Supertransporte`, life: 4000 })
}
</script>

<style scoped>
.evidence-view { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
.page-title { font-size: 1.4rem; font-weight: 700; color: #1e3a5f; margin: 0; }
.page-subtitle { font-size: 0.85rem; color: #64748b; }
.header-actions { display: flex; gap: 0.75rem; align-items: center; }

.progress-banner {
  background: white; border-radius: 12px; padding: 1.4rem 1.5rem;
  display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08);
}
.progress-banner-left { display: flex; align-items: center; gap: 1rem; }
.progress-pct-big { font-size: 3rem; font-weight: 900; color: #1e293b; line-height: 1; }
.progress-label-big { display: block; font-size: 1rem; font-weight: 700; color: #1e3a5f; }
.progress-sub { font-size: 0.82rem; color: #64748b; }
.progress-bar-wrap { flex: 1; min-width: 200px; }
:deep(.pb-green .p-progressbar-value)  { background: #22c55e !important; }
:deep(.pb-yellow .p-progressbar-value) { background: #f59e0b !important; }
:deep(.pb-red .p-progressbar-value)    { background: #ef4444 !important; }

.section-card { background: white; border-radius: 12px; padding: 1.4rem; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
.section-title { font-size: 1rem; font-weight: 600; color: #1e3a5f; margin: 0 0 1.2rem; display: flex; align-items: center; }
.evidencias-chips { display: flex; gap: 0.3rem; flex-wrap: wrap; }
:deep(.chip-sm.p-chip) { font-size: 0.72rem; padding: 0.15rem 0.5rem; }
.expansion-detail { padding: 0.75rem 1rem; background: #f8fafc; border-radius: 6px; font-size: 0.85rem; color: #475569; line-height: 1.6; }
</style>
