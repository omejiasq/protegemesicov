<template>
  <div class="breathalyzer-log">
    <div class="page-header">
      <div>
        <h2 class="page-title">Registro de Alcoholemia Preventiva</h2>
        <span class="page-subtitle">Pruebas BLE realizadas · Evidencia de cumplimiento PESV</span>
      </div>
      <div class="header-actions">
        <Select v-model="mes" :options="meses" optionLabel="label" optionValue="value" class="w-12rem" />
        <Button label="Exportar evidencia" icon="pi pi-file-pdf" severity="danger" @click="exportar" />
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-blue">
        <i class="pi pi-heart kpi-icon"></i>
        <div><span class="kpi-value">{{ registros.length }}</span><span class="kpi-label">Pruebas realizadas</span></div>
      </div>
      <div class="kpi-card kpi-green">
        <i class="pi pi-check-circle kpi-icon"></i>
        <div><span class="kpi-value">{{ negativos }}</span><span class="kpi-label">Resultados negativos</span></div>
      </div>
      <div class="kpi-card kpi-red">
        <i class="pi pi-times-circle kpi-icon"></i>
        <div><span class="kpi-value">{{ positivos }}</span><span class="kpi-label">Resultados positivos</span></div>
      </div>
      <div class="kpi-card kpi-purple">
        <i class="pi pi-percentage kpi-icon"></i>
        <div><span class="kpi-value">{{ Math.round((negativos / registros.length) * 100) }}%</span><span class="kpi-label">Tasa de aprobación</span></div>
      </div>
    </div>

    <!-- Alerta resultado positivo -->
    <div v-if="positivos > 0" class="alerta-positivo">
      <i class="pi pi-exclamation-triangle alerta-icon"></i>
      <div>
        <strong>{{ positivos }} prueba(s) con resultado positivo registrada(s) en el período</strong>
        <p>El turno fue bloqueado automáticamente y se notificó al coordinador PESV. Ver detalle en la tabla.</p>
      </div>
    </div>

    <!-- Tabla de registros -->
    <div class="section-card">
      <div class="table-header">
        <h3 class="section-title"><i class="pi pi-table mr-2"></i>Historial de Pruebas — {{ mesLabel }}</h3>
        <span class="filter-row">
          <ToggleButton v-model="soloPositivos" onLabel="Solo positivos" offLabel="Todos" onIcon="pi pi-filter" offIcon="pi pi-filter-slash" />
        </span>
      </div>
      <DataTable :value="registrosFiltrados" stripedRows size="small" paginator :rows="15" :rowClass="rowClass">
        <Column header="Conductor" style="min-width:160px">
          <template #body="{ data }">
            <div class="conductor-cell">
              <span class="conductor-avatar" :style="{ background: data.color }">{{ data.conductor[0] }}</span>
              <div>
                <span class="block font-semibold text-sm">{{ data.conductor }}</span>
                <span class="text-xs text-slate-400">{{ data.documento }}</span>
              </div>
            </div>
          </template>
        </Column>
        <Column field="fecha" header="Fecha" style="width:100px" />
        <Column field="hora" header="Hora" style="width:80px" bodyClass="text-center" />
        <Column field="vehiculo" header="Vehículo" style="width:90px" bodyClass="text-center" />
        <Column field="grado" header="Resultado (g/L)" style="width:130px" bodyClass="text-center">
          <template #body="{ data }">
            <span :class="data.grado > 0 ? 'text-red-600 font-bold text-lg' : 'text-green-600 font-bold'">
              {{ data.grado.toFixed(2) }}
            </span>
          </template>
        </Column>
        <Column header="Estado" style="width:110px" bodyClass="text-center">
          <template #body="{ data }">
            <Tag :value="data.grado > 0 ? 'POSITIVO' : 'Negativo'"
              :severity="data.grado > 0 ? 'danger' : 'success'" />
          </template>
        </Column>
        <Column header="Turno" style="width:110px" bodyClass="text-center">
          <template #body="{ data }">
            <Tag :value="data.grado > 0 ? 'BLOQUEADO' : 'Habilitado'"
              :severity="data.grado > 0 ? 'danger' : 'success'" />
          </template>
        </Column>
        <Column header="Evidencia" style="width:100px" bodyClass="text-center">
          <template #body="{ data }">
            <Button icon="pi pi-image" text size="small" @click="verFoto(data)"
              v-tooltip.top="'Ver foto de evidencia'" />
          </template>
        </Column>
        <Column field="gps" header="Ubicación" style="width:120px">
          <template #body="{ data }">
            <a class="text-blue-500 text-xs" href="#">{{ data.gps }}</a>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Modal foto evidencia (simulado) -->
    <Dialog v-model:visible="fotoVisible" :header="`Evidencia — ${fotoActual?.conductor}`" :style="{ width: '340px' }" modal>
      <div class="foto-modal">
        <div class="foto-placeholder">
          <i class="pi pi-camera text-5xl text-slate-300"></i>
          <p class="text-sm text-slate-400 mt-2">Foto capturada en el momento de la prueba</p>
          <p class="text-xs text-slate-300">{{ fotoActual?.fecha }} {{ fotoActual?.hora }}</p>
        </div>
        <div class="foto-datos">
          <div class="dato-row"><span>Conductor:</span><strong>{{ fotoActual?.conductor }}</strong></div>
          <div class="dato-row"><span>Resultado:</span>
            <strong :class="fotoActual?.grado ?? 0 > 0 ? 'text-red-500' : 'text-green-600'">
              {{ fotoActual?.grado?.toFixed(2) }} g/L {{ fotoActual?.grado ?? 0 > 0 ? '— POSITIVO' : '— Negativo' }}
            </strong>
          </div>
          <div class="dato-row"><span>Dispositivo BLE:</span><strong>BT-Alco-Pro #{{ fotoActual?.dispositivo }}</strong></div>
          <div class="dato-row"><span>GPS:</span><strong>{{ fotoActual?.gps }}</strong></div>
        </div>
      </div>
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
import ToggleButton from 'primevue/togglebutton'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const meses = [
  { label: 'Marzo 2026', value: '2026-03' },
  { label: 'Febrero 2026', value: '2026-02' },
]
const mes = ref('2026-03')
const mesLabel = computed(() => meses.find(m => m.value === mes.value)?.label ?? '')
const soloPositivos = ref(false)
const fotoVisible = ref(false)
const fotoActual = ref<any>(null)

const registros = [
  { conductor: 'Carlos Rodríguez', documento: 'CC 80412345', color: '#3b82f6', fecha: '28 Mar', hora: '05:58', vehiculo: 'ABC-123', grado: 0.00, gps: 'Bogotá Norte', dispositivo: '007' },
  { conductor: 'Juan Pérez',       documento: 'CC 71234567', color: '#22c55e', fecha: '28 Mar', hora: '06:45', vehiculo: 'DEF-456', grado: 0.00, gps: 'Bogotá Sur',  dispositivo: '003' },
  { conductor: 'María González',   documento: 'CC 52345678', color: '#a855f7', fecha: '28 Mar', hora: '07:55', vehiculo: 'GHI-789', grado: 0.00, gps: 'Bogotá Cen.', dispositivo: '005' },
  { conductor: 'Pedro Vargas',     documento: 'CC 79876543', color: '#ef4444', fecha: '26 Mar', hora: '06:10', vehiculo: 'PQR-678', grado: 0.48, gps: 'Bogotá Sur',  dispositivo: '001' },
  { conductor: 'Luis Martínez',    documento: 'CC 80654321', color: '#f59e0b', fecha: '25 Mar', hora: '04:52', vehiculo: 'JKL-012', grado: 0.00, gps: 'Bogotá Occ.', dispositivo: '002' },
  { conductor: 'Ana Suárez',       documento: 'CC 40234567', color: '#06b6d4', fecha: '24 Mar', hora: '08:30', vehiculo: 'MNO-345', grado: 0.00, gps: 'Bogotá Este', dispositivo: '006' },
  { conductor: 'Carlos Rodríguez', documento: 'CC 80412345', color: '#3b82f6', fecha: '24 Mar', hora: '05:55', vehiculo: 'ABC-123', grado: 0.00, gps: 'Bogotá Norte', dispositivo: '007' },
  { conductor: 'Juan Pérez',       documento: 'CC 71234567', color: '#22c55e', fecha: '21 Mar', hora: '06:40', vehiculo: 'DEF-456', grado: 0.00, gps: 'Bogotá Sur',  dispositivo: '003' },
  { conductor: 'Pedro Vargas',     documento: 'CC 79876543', color: '#ef4444', fecha: '20 Mar', hora: '06:05', vehiculo: 'PQR-678', grado: 0.00, gps: 'Bogotá Sur',  dispositivo: '001' },
  { conductor: 'Luis Martínez',    documento: 'CC 80654321', color: '#f59e0b', fecha: '18 Mar', hora: '04:50', vehiculo: 'JKL-012', grado: 0.00, gps: 'Bogotá Occ.', dispositivo: '002' },
]

const registrosFiltrados = computed(() => soloPositivos.value ? registros.filter(r => r.grado > 0) : registros)
const negativos = computed(() => registros.filter(r => r.grado === 0).length)
const positivos = computed(() => registros.filter(r => r.grado > 0).length)

function rowClass(data: any) { return data.grado > 0 ? 'row-danger' : '' }
function verFoto(data: any) { fotoActual.value = data; fotoVisible.value = true }
function exportar() {
  toast.add({ severity: 'success', summary: 'Evidencia generada', detail: 'PDF de alcoholemia Marzo 2026 listo para descargar', life: 3000 })
}
</script>

<style scoped>
.breathalyzer-log { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
.page-title { font-size: 1.4rem; font-weight: 700; color: #1e3a5f; margin: 0; }
.page-subtitle { font-size: 0.85rem; color: #64748b; }
.header-actions { display: flex; gap: 0.75rem; align-items: center; }

.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; }
.kpi-card { background: white; border-radius: 12px; padding: 1rem 1.2rem; display: flex; align-items: center; gap: 0.9rem; box-shadow: 0 1px 6px rgba(0,0,0,0.08); border-left: 4px solid transparent; }
.kpi-blue   { border-left-color: #3b82f6; } .kpi-blue .kpi-icon   { color: #3b82f6; }
.kpi-green  { border-left-color: #22c55e; } .kpi-green .kpi-icon  { color: #22c55e; }
.kpi-red    { border-left-color: #ef4444; } .kpi-red .kpi-icon    { color: #ef4444; }
.kpi-purple { border-left-color: #a855f7; } .kpi-purple .kpi-icon { color: #a855f7; }
.kpi-icon { font-size: 1.6rem; }
.kpi-value { display: block; font-size: 1.6rem; font-weight: 700; color: #1e293b; }
.kpi-label { font-size: 0.75rem; color: #64748b; }

.alerta-positivo {
  background: #fee2e2; border: 1px solid #fca5a5; border-radius: 10px;
  padding: 1rem 1.2rem; display: flex; gap: 1rem; align-items: flex-start; color: #991b1b;
}
.alerta-positivo p { margin: 0.3rem 0 0; font-size: 0.85rem; }
.alerta-icon { font-size: 1.5rem; flex-shrink: 0; margin-top: 2px; }

.section-card { background: white; border-radius: 12px; padding: 1.4rem; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; }
.section-title { font-size: 1rem; font-weight: 600; color: #1e3a5f; margin: 0; display: flex; align-items: center; }
.conductor-cell { display: flex; align-items: center; gap: 0.6rem; }
.conductor-avatar { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.85rem; font-weight: 700; flex-shrink: 0; }
:deep(.row-danger td) { background: #fff1f2 !important; }

.foto-modal { display: flex; flex-direction: column; gap: 1rem; }
.foto-placeholder { background: #f8fafc; border-radius: 8px; height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px dashed #e2e8f0; }
.foto-datos { display: flex; flex-direction: column; gap: 0.5rem; }
.dato-row { display: flex; justify-content: space-between; font-size: 0.85rem; padding: 0.3rem 0; border-bottom: 1px solid #f1f5f9; }
.dato-row span { color: #64748b; }
</style>
