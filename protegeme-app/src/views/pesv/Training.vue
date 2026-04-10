<template>
  <div class="training-view">
    <div class="page-header">
      <div>
        <h2 class="page-title">Capacitaciones en Seguridad Vial</h2>
        <span class="page-subtitle">Registro de formación · Evidencia PESV Línea 2 — Comportamiento Humano</span>
      </div>
      <Button label="Registrar capacitación" icon="pi pi-plus" @click="nuevaVisible = true" />
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-blue">
        <i class="pi pi-book kpi-icon"></i>
        <div><span class="kpi-value">{{ capacitaciones.length }}</span><span class="kpi-label">Capacitaciones registradas</span></div>
      </div>
      <div class="kpi-card kpi-green">
        <i class="pi pi-users kpi-icon"></i>
        <div><span class="kpi-value">{{ totalAsistentes }}</span><span class="kpi-label">Asistencias totales</span></div>
      </div>
      <div class="kpi-card kpi-purple">
        <i class="pi pi-clock kpi-icon"></i>
        <div><span class="kpi-value">{{ totalHoras }} h</span><span class="kpi-label">Horas de formación</span></div>
      </div>
      <div class="kpi-card" :class="metaCumplida ? 'kpi-green' : 'kpi-yellow'">
        <i class="pi pi-chart-bar kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ capacitaciones.length }}/2</span>
          <span class="kpi-label">Meta mensual {{ metaCumplida ? '✅' : '⚠️' }}</span>
        </div>
      </div>
    </div>

    <!-- Lista de capacitaciones -->
    <div class="section-card">
      <h3 class="section-title"><i class="pi pi-list mr-2"></i>Historial de Capacitaciones</h3>
      <DataTable :value="capacitaciones" stripedRows size="small">
        <Column field="fecha" header="Fecha" style="width:100px" />
        <Column field="tema" header="Tema" style="min-width:220px">
          <template #body="{ data }">
            <div>
              <span class="font-semibold text-sm">{{ data.tema }}</span>
              <span class="block text-xs text-slate-400">{{ data.modalidad }}</span>
            </div>
          </template>
        </Column>
        <Column field="instructor" header="Instructor" />
        <Column field="duracion" header="Duración" bodyClass="text-center">
          <template #body="{ data }">{{ data.duracion }} h</template>
        </Column>
        <Column header="Asistentes" bodyClass="text-center">
          <template #body="{ data }">
            <div class="asistentes-cell">
              <span class="asistentes-count">{{ data.asistentes.length }}</span>
              <Button icon="pi pi-eye" text size="small" @click="verAsistentes(data)" v-tooltip.top="'Ver lista'" />
            </div>
          </template>
        </Column>
        <Column header="% Cobertura" style="width:140px">
          <template #body="{ data }">
            <div class="progress-cell">
              <ProgressBar :value="Math.round((data.asistentes.length / 6) * 100)" style="height:8px"
                :class="Math.round((data.asistentes.length / 6) * 100) >= 80 ? 'pb-green' : 'pb-yellow'" />
              <span class="text-xs text-slate-500">{{ Math.round((data.asistentes.length / 6) * 100) }}%</span>
            </div>
          </template>
        </Column>
        <Column header="Evidencia" bodyClass="text-center">
          <template #body="{ data }">
            <div class="evidencia-pills">
              <Tag v-if="data.acta" value="Acta" severity="success" class="text-xs" />
              <Tag v-if="data.fotos" value="Fotos" severity="info" class="text-xs" />
              <Tag v-if="data.evaluacion" value="Evaluación" severity="secondary" class="text-xs" />
            </div>
          </template>
        </Column>
        <Column header="" style="width:80px" bodyClass="text-center">
          <template #body="{ data }">
            <Button icon="pi pi-file-pdf" text size="small" @click="descargar(data)" v-tooltip.top="'Descargar acta PDF'" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Dialog asistentes -->
    <Dialog v-model:visible="asistentesVisible" :header="`Asistentes — ${capSeleccionada?.tema}`" :style="{ width: '400px' }" modal>
      <div class="asistentes-list">
        <div v-for="(a, i) in capSeleccionada?.asistentes" :key="i" class="asistente-item">
          <span class="asistente-num">{{ i + 1 }}</span>
          <span class="asistente-nombre">{{ a }}</span>
          <i class="pi pi-check-circle text-green-500"></i>
        </div>
      </div>
    </Dialog>

    <!-- Dialog nueva capacitación (simulado) -->
    <Dialog v-model:visible="nuevaVisible" header="Registrar Capacitación" :style="{ width: '450px' }" modal>
      <div class="nueva-form">
        <div class="form-field">
          <label>Tema</label>
          <InputText v-model="nueva.tema" class="w-full" placeholder="Ej: Manejo defensivo en autopistas" />
        </div>
        <div class="form-field">
          <label>Instructor</label>
          <InputText v-model="nueva.instructor" class="w-full" />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Fecha</label>
            <InputText v-model="nueva.fecha" class="w-full" placeholder="DD/MM/AAAA" />
          </div>
          <div class="form-field">
            <label>Duración (horas)</label>
            <InputText v-model="nueva.duracion" class="w-full" type="number" />
          </div>
        </div>
        <div class="form-field">
          <label>Modalidad</label>
          <Select v-model="nueva.modalidad" :options="['Presencial', 'Virtual', 'E-learning']" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="nuevaVisible = false" />
        <Button label="Guardar y generar acta" icon="pi pi-check" @click="guardar" />
      </template>
    </Dialog>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import ProgressBar from 'primevue/progressbar'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const asistentesVisible = ref(false)
const nuevaVisible = ref(false)
const capSeleccionada = ref<any>(null)
const nueva = ref({ tema: '', instructor: '', fecha: '', duracion: '', modalidad: 'Presencial' })

const capacitaciones = [
  {
    fecha: '15 Mar 2026', tema: 'Manejo defensivo y anticipación de riesgos', modalidad: 'Presencial',
    instructor: 'Ing. Roberto Cárdenas', duracion: 4, acta: true, fotos: true, evaluacion: true,
    asistentes: ['Carlos Rodríguez', 'Juan Pérez', 'María González', 'Luis Martínez', 'Ana Suárez'],
  },
  {
    fecha: '05 Feb 2026', tema: 'Normas de tránsito y responsabilidad vial', modalidad: 'Virtual',
    instructor: 'SENA Virtual', duracion: 2, acta: true, fotos: false, evaluacion: true,
    asistentes: ['Carlos Rodríguez', 'Juan Pérez', 'María González', 'Luis Martínez', 'Ana Suárez', 'Pedro Vargas'],
  },
  {
    fecha: '20 Ene 2026', tema: 'Primeros auxilios en accidentes de tránsito', modalidad: 'Presencial',
    instructor: 'Cruz Roja Colombiana', duracion: 6, acta: true, fotos: true, evaluacion: false,
    asistentes: ['Carlos Rodríguez', 'María González', 'Luis Martínez', 'Pedro Vargas'],
  },
]

const totalAsistentes = computed(() => capacitaciones.reduce((s, c) => s + c.asistentes.length, 0))
const totalHoras = computed(() => capacitaciones.reduce((s, c) => s + c.duracion, 0))
const metaCumplida = computed(() => {
  const marzoCount = capacitaciones.filter(c => c.fecha.includes('Mar 2026')).length
  return marzoCount >= 2
})

function verAsistentes(cap: any) { capSeleccionada.value = cap; asistentesVisible.value = true }
function descargar(cap: any) {
  toast.add({ severity: 'success', summary: 'Acta generada', detail: `PDF de "${cap.tema}" listo para descargar`, life: 3000 })
}
function guardar() {
  nuevaVisible.value = false
  toast.add({ severity: 'success', summary: 'Capacitación registrada', detail: 'Acta generada automáticamente', life: 3000 })
}
</script>

<style scoped>
.training-view { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
.page-title { font-size: 1.4rem; font-weight: 700; color: #1e3a5f; margin: 0; }
.page-subtitle { font-size: 0.85rem; color: #64748b; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; }
.kpi-card { background: white; border-radius: 12px; padding: 1rem 1.2rem; display: flex; align-items: center; gap: 0.9rem; box-shadow: 0 1px 6px rgba(0,0,0,0.08); border-left: 4px solid transparent; }
.kpi-blue   { border-left-color: #3b82f6; } .kpi-blue .kpi-icon   { color: #3b82f6; }
.kpi-green  { border-left-color: #22c55e; } .kpi-green .kpi-icon  { color: #22c55e; }
.kpi-purple { border-left-color: #a855f7; } .kpi-purple .kpi-icon { color: #a855f7; }
.kpi-yellow { border-left-color: #f59e0b; } .kpi-yellow .kpi-icon { color: #f59e0b; }
.kpi-icon { font-size: 1.6rem; }
.kpi-value { display: block; font-size: 1.6rem; font-weight: 700; color: #1e293b; }
.kpi-label { font-size: 0.75rem; color: #64748b; }
.section-card { background: white; border-radius: 12px; padding: 1.4rem; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
.section-title { font-size: 1rem; font-weight: 600; color: #1e3a5f; margin: 0 0 1.2rem; display: flex; align-items: center; }
.asistentes-cell { display: flex; align-items: center; gap: 0.3rem; justify-content: center; }
.asistentes-count { font-weight: 700; font-size: 1rem; color: #1e293b; }
.evidencia-pills { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.progress-cell { display: flex; align-items: center; gap: 0.4rem; }
:deep(.pb-green .p-progressbar-value)  { background: #22c55e !important; }
:deep(.pb-yellow .p-progressbar-value) { background: #f59e0b !important; }
.asistentes-list { display: flex; flex-direction: column; gap: 0.5rem; }
.asistente-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
.asistente-num { width: 22px; height: 22px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; flex-shrink: 0; }
.asistente-nombre { flex: 1; font-size: 0.9rem; }
.nueva-form { display: flex; flex-direction: column; gap: 1rem; }
.form-field { display: flex; flex-direction: column; gap: 0.35rem; }
.form-field label { font-size: 0.85rem; font-weight: 600; color: #475569; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
</style>
