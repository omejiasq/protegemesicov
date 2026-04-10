<template>
  <div class="pesv-incidents">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Siniestros Viales y Costos</h2>
        <span class="page-subtitle">
          Indicadores PESV N°1 (Var. 1–5) y N°2 (Var. 6–13) · Resolución 40595 Art. 20
        </span>
      </div>
      <div class="header-actions">
        <Select v-model="trimestreSeleccionado" :options="trimestres" optionLabel="label" optionValue="value"
          class="w-12rem" />
        <Button label="Registrar siniestro" icon="pi pi-plus" @click="nuevoVisible = true" />
        <Button label="Exportar F2" icon="pi pi-file-pdf" outlined severity="danger" @click="exportarF2" />
      </div>
    </div>

    <!-- Banner Fase 2 -->
    <div class="fase2-banner">
      <i class="pi pi-info-circle"></i>
      <div>
        <strong>Módulo activo — Fase 1 Demo.</strong>
        En Fase 2 este módulo se conectará directamente a la API SINST-VIGÍA de Supertransporte
        para enviar los indicadores 1 y 2 sin intervención manual. Por ahora puede registrar sus
        siniestros y generar el reporte PDF para carga manual.
      </div>
    </div>

    <!-- KPIs indicador 1 -->
    <div class="section-card">
      <h3 class="section-title"><i class="pi pi-car-crash mr-2"></i>Indicador 1 — Tasa de Siniestros · {{ trimestreLabel }}</h3>
      <div class="kpi-grid">
        <div class="kpi-card kpi-red">
          <i class="pi pi-heart-fill kpi-icon"></i>
          <div>
            <span class="kpi-value">{{ conteo('fatalidad') }}</span>
            <span class="kpi-label">Fatalidades (Var. 1)</span>
          </div>
        </div>
        <div class="kpi-card kpi-orange">
          <i class="pi pi-exclamation-circle kpi-icon"></i>
          <div>
            <span class="kpi-value">{{ conteo('herido_grave') }}</span>
            <span class="kpi-label">Heridos graves (Var. 2)</span>
          </div>
        </div>
        <div class="kpi-card kpi-yellow">
          <i class="pi pi-exclamation-triangle kpi-icon"></i>
          <div>
            <span class="kpi-value">{{ conteo('herido_leve') }}</span>
            <span class="kpi-label">Heridos leves (Var. 3)</span>
          </div>
        </div>
        <div class="kpi-card kpi-blue">
          <i class="pi pi-wrench kpi-icon"></i>
          <div>
            <span class="kpi-value">{{ conteo('choque_simple') }}</span>
            <span class="kpi-label">Choques simples (Var. 4)</span>
          </div>
        </div>
        <div class="kpi-card kpi-purple">
          <i class="pi pi-map kpi-icon"></i>
          <div>
            <span class="kpi-value">{{ totalKmStr }} km</span>
            <span class="kpi-label">Km recorridos (Var. 5)</span>
          </div>
        </div>
        <div class="kpi-card kpi-green">
          <i class="pi pi-chart-line kpi-icon"></i>
          <div>
            <span class="kpi-value">{{ tasaSiniestralidad }}</span>
            <span class="kpi-label">Tasa siniestros / 100k km</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Costos indicador 2 -->
    <div class="section-card">
      <h3 class="section-title"><i class="pi pi-dollar-sign mr-2"></i>Indicador 2 — Costos de Siniestros · {{ trimestreLabel }}</h3>
      <DataTable :value="costosTabla" stripedRows size="small">
        <Column field="nivel" header="Nivel de pérdida" style="min-width:160px">
          <template #body="{ data }">
            <Tag :value="data.nivel"
              :severity="data.nivel.includes('Fatalidad') ? 'danger' : data.nivel.includes('Grave') ? 'warn' : 'secondary'" />
          </template>
        </Column>
        <Column field="costoDirecto" header="Costo directo (Var.)" bodyClass="text-right">
          <template #body="{ data }">
            <span class="font-semibold">{{ formatCOP(data.costoDirecto) }}</span>
          </template>
        </Column>
        <Column field="costoIndirecto" header="Costo indirecto (Var.)" bodyClass="text-right">
          <template #body="{ data }">{{ formatCOP(data.costoIndirecto) }}</template>
        </Column>
        <Column field="total" header="Total" bodyClass="text-right font-bold">
          <template #body="{ data }">
            <span class="text-red-600">{{ formatCOP(data.costoDirecto + data.costoIndirecto) }}</span>
          </template>
        </Column>
      </DataTable>
      <div class="costo-total-row">
        <span>Costo total siniestros {{ trimestreLabel }}</span>
        <span class="costo-total-valor">{{ formatCOP(costoTotalGeneral) }}</span>
      </div>
    </div>

    <!-- Tabla de siniestros registrados -->
    <div class="section-card">
      <h3 class="section-title"><i class="pi pi-list mr-2"></i>Registro de Siniestros</h3>
      <DataTable :value="siniestrosFiltrados" stripedRows size="small" :paginator="true" :rows="6"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink">
        <Column field="fecha" header="Fecha" style="width:110px" />
        <Column field="placa" header="Placa">
          <template #body="{ data }">
            <Tag :value="data.placa" severity="secondary" class="font-mono" />
          </template>
        </Column>
        <Column field="tipo" header="Tipo">
          <template #body="{ data }">
            <Tag :value="labelTipo(data.tipo)"
              :severity="data.tipo === 'fatalidad' ? 'danger' : data.tipo === 'herido_grave' ? 'warn' : data.tipo === 'herido_leve' ? 'warn' : 'secondary'" />
          </template>
        </Column>
        <Column field="lugar" header="Lugar" />
        <Column field="conductor" header="Conductor" />
        <Column field="costoDirecto" header="Costo directo" bodyClass="text-right">
          <template #body="{ data }">{{ formatCOP(data.costoDirecto) }}</template>
        </Column>
        <Column field="ipat" header="IPAT">
          <template #body="{ data }">
            <Tag :value="data.ipat ? 'Adjunto' : 'Pendiente'" :severity="data.ipat ? 'success' : 'warn'" />
          </template>
        </Column>
        <Column header="Acc." style="width:60px" bodyClass="text-center">
          <template #body="{ data }">
            <Button icon="pi pi-eye" text size="small" @click="verSiniestro(data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Dialog nuevo siniestro -->
    <Dialog v-model:visible="nuevoVisible" header="Registrar Siniestro Vial" :modal="true" style="width:560px">
      <div class="dialog-form">
        <div class="form-row">
          <div class="form-field">
            <label>Tipo de siniestro *</label>
            <Select v-model="nuevoForm.tipo" :options="tipoOpciones" optionLabel="label" optionValue="value"
              placeholder="Seleccione tipo" class="w-full" />
          </div>
          <div class="form-field">
            <label>Fecha del accidente *</label>
            <DatePicker v-model="nuevoForm.fecha" dateFormat="dd/mm/yy" class="w-full" showIcon />
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Placa del vehículo *</label>
            <Select v-model="nuevoForm.placa" :options="placasFlota" placeholder="Placa" class="w-full" />
          </div>
          <div class="form-field">
            <label>Conductor</label>
            <InputText v-model="nuevoForm.conductor" placeholder="Nombre del conductor" class="w-full" />
          </div>
        </div>
        <div class="form-field">
          <label>Lugar del accidente *</label>
          <InputText v-model="nuevoForm.lugar" placeholder="Municipio, departamento o dirección" class="w-full" />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Costo directo estimado (COP)</label>
            <InputNumber v-model="nuevoForm.costoDirecto" :min="0" mode="currency" currency="COP" locale="es-CO"
              class="w-full" />
          </div>
          <div class="form-field">
            <label>Costo indirecto estimado (COP)</label>
            <InputNumber v-model="nuevoForm.costoIndirecto" :min="0" mode="currency" currency="COP" locale="es-CO"
              class="w-full" />
          </div>
        </div>
        <div class="form-field">
          <label>Descripción / observaciones</label>
          <Textarea v-model="nuevoForm.descripcion" rows="2" class="w-full" placeholder="Descripción del evento…" />
        </div>
        <div class="form-field-check">
          <Checkbox v-model="nuevoForm.ipat" :binary="true" inputId="ipat" />
          <label for="ipat">IPAT adjunto (Informe Policial de Accidentes de Tránsito)</label>
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="nuevoVisible = false" />
        <Button label="Registrar siniestro" icon="pi pi-save" @click="guardarSiniestro" />
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
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'
import Checkbox from 'primevue/checkbox'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const nuevoVisible = ref(false)

const trimestres = [
  { label: 'Q1 2026 (Ene–Mar)', value: 'Q1-2026' },
  { label: 'Q4 2025 (Oct–Dic)', value: 'Q4-2025' },
  { label: 'Q3 2025 (Jul–Sep)', value: 'Q3-2025' },
]
const trimestreSeleccionado = ref('Q1-2026')
const trimestreLabel = computed(() => trimestres.find(t => t.value === trimestreSeleccionado.value)?.label ?? '')

const tipoOpciones = [
  { label: 'Fatalidad', value: 'fatalidad' },
  { label: 'Herido grave', value: 'herido_grave' },
  { label: 'Herido leve', value: 'herido_leve' },
  { label: 'Choque simple (solo daños materiales)', value: 'choque_simple' },
]
const placasFlota = ['ABC-123', 'DEF-456', 'GHI-789', 'JKL-012', 'MNO-345', 'PQR-678']

const siniestros = ref([
  { id: 1, fecha: '15/01/2026', placa: 'DEF-456', tipo: 'choque_simple',  lugar: 'Bogotá — Cll 26 × Av. 68',       conductor: 'Ramírez, J.',    costoDirecto: 1800000,  costoIndirecto: 500000,  ipat: true,  trimestre: 'Q1-2026', descripcion: 'Choque trasero en semáforo, sin lesionados' },
  { id: 2, fecha: '04/02/2026', placa: 'GHI-789', tipo: 'herido_leve',    lugar: 'Soacha — Autopista Sur km 3',    conductor: 'Martínez, C.',   costoDirecto: 3500000,  costoIndirecto: 1200000, ipat: true,  trimestre: 'Q1-2026', descripcion: 'Colisión lateral, conductor con contusiones leves' },
  { id: 3, fecha: '19/02/2026', placa: 'ABC-123', tipo: 'choque_simple',  lugar: 'Cota — Vía Siberia km 8',        conductor: 'López, A.',      costoDirecto: 900000,   costoIndirecto: 250000,  ipat: false, trimestre: 'Q1-2026', descripcion: 'Daños en parachoque, sin lesionados' },
  { id: 4, fecha: '22/11/2025', placa: 'MNO-345', tipo: 'herido_grave',   lugar: 'Mosquera — Variante km 12',      conductor: 'Gómez, R.',      costoDirecto: 12000000, costoIndirecto: 8000000, ipat: true,  trimestre: 'Q4-2025', descripcion: 'Volcamiento, conductor con fractura — incapacidad 35 días' },
  { id: 5, fecha: '08/10/2025', placa: 'PQR-678', tipo: 'choque_simple',  lugar: 'Madrid (Cund.) — Cll 5 N°2-30', conductor: 'Torres, F.',     costoDirecto: 2100000,  costoIndirecto: 600000,  ipat: true,  trimestre: 'Q4-2025', descripcion: 'Colisión con poste, daños en carrocería frontal' },
])

const siniestrosFiltrados = computed(() =>
  siniestros.value.filter(s => s.trimestre === trimestreSeleccionado.value)
)

function conteo(tipo: string) {
  return siniestrosFiltrados.value.filter(s => s.tipo === tipo).length
}

const totalKmStr = '24.100'
const tasaSiniestralidad = computed(() => {
  const total = siniestrosFiltrados.value.length
  return ((total / 24100) * 100000).toFixed(1)
})

const costosTabla = computed(() => {
  const s = siniestrosFiltrados.value
  const fatalidades = s.filter(x => x.tipo === 'fatalidad')
  const graves = s.filter(x => x.tipo === 'herido_grave')
  const leves = s.filter(x => x.tipo === 'herido_leve')
  const simples = s.filter(x => x.tipo === 'choque_simple')
  const sum = (arr: any[], k: keyof typeof arr[0]) => arr.reduce((a, b) => a + (b[k] as number), 0)
  return [
    { nivel: 'Fatalidades', costoDirecto: sum(fatalidades, 'costoDirecto'), costoIndirecto: sum(fatalidades, 'costoIndirecto') },
    { nivel: 'Heridos graves', costoDirecto: sum(graves, 'costoDirecto'),  costoIndirecto: sum(graves, 'costoIndirecto') },
    { nivel: 'Heridos leves', costoDirecto: sum(leves, 'costoDirecto'),   costoIndirecto: sum(leves, 'costoIndirecto') },
    { nivel: 'Choques simples', costoDirecto: sum(simples, 'costoDirecto'), costoIndirecto: sum(simples, 'costoIndirecto') },
  ]
})

const costoTotalGeneral = computed(() =>
  costosTabla.value.reduce((a, b) => a + b.costoDirecto + b.costoIndirecto, 0)
)

function formatCOP(v: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
}

function labelTipo(t: string) {
  return tipoOpciones.find(o => o.value === t)?.label ?? t
}

const nuevoForm = ref({
  tipo: '', fecha: null as Date | null, placa: '', conductor: '',
  lugar: '', costoDirecto: null as number | null, costoIndirecto: null as number | null,
  descripcion: '', ipat: false,
})

function guardarSiniestro() {
  if (!nuevoForm.value.tipo || !nuevoForm.value.placa || !nuevoForm.value.lugar) {
    toast.add({ severity: 'warn', summary: 'Datos incompletos', detail: 'Complete tipo, placa y lugar', life: 3000 })
    return
  }
  siniestros.value.unshift({
    id: siniestros.value.length + 1,
    fecha: nuevoForm.value.fecha ? new Date(nuevoForm.value.fecha).toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO'),
    placa: nuevoForm.value.placa,
    tipo: nuevoForm.value.tipo,
    lugar: nuevoForm.value.lugar,
    conductor: nuevoForm.value.conductor,
    costoDirecto: nuevoForm.value.costoDirecto ?? 0,
    costoIndirecto: nuevoForm.value.costoIndirecto ?? 0,
    ipat: nuevoForm.value.ipat,
    trimestre: trimestreSeleccionado.value,
    descripcion: nuevoForm.value.descripcion,
  })
  toast.add({ severity: 'success', summary: 'Siniestro registrado', detail: 'El evento quedó registrado en el sistema para el reporte F2', life: 4000 })
  nuevoVisible.value = false
  nuevoForm.value = { tipo: '', fecha: null, placa: '', conductor: '', lugar: '', costoDirecto: null, costoIndirecto: null, descripcion: '', ipat: false }
}

function verSiniestro(data: any) {
  toast.add({ severity: 'info', summary: `Siniestro ${data.fecha} · ${data.placa}`, detail: data.descripcion, life: 5000 })
}

function exportarF2() {
  toast.add({ severity: 'success', summary: 'F2 generado', detail: 'Indicadores 1 y 2 exportados en PDF para Supertransporte', life: 4000 })
}
</script>

<style scoped>
.pesv-incidents { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
.page-title { font-size: 1.4rem; font-weight: 700; color: #1e3a5f; margin: 0; }
.page-subtitle { font-size: 0.82rem; color: #64748b; }
.header-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }

.fase2-banner {
  background: #fefce8; border: 1px solid #fde68a; border-radius: 10px;
  padding: 1rem 1.2rem; display: flex; gap: 0.75rem; align-items: flex-start;
  font-size: 0.85rem; color: #92400e;
}
.fase2-banner i { font-size: 1.1rem; margin-top: 2px; flex-shrink: 0; }

.section-card { background: white; border-radius: 12px; padding: 1.4rem; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
.section-title { font-size: 1rem; font-weight: 600; color: #1e3a5f; margin: 0 0 1.2rem; display: flex; align-items: center; }

.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; }
.kpi-card {
  background: #f8fafc; border-radius: 10px; padding: 1rem 1.1rem;
  display: flex; align-items: center; gap: 0.8rem;
  border-left: 4px solid transparent;
}
.kpi-red    { border-left-color: #ef4444; }
.kpi-orange { border-left-color: #f97316; }
.kpi-yellow { border-left-color: #f59e0b; }
.kpi-blue   { border-left-color: #3b82f6; }
.kpi-purple { border-left-color: #a855f7; }
.kpi-green  { border-left-color: #22c55e; }
.kpi-icon { font-size: 1.5rem; opacity: 0.45; }
.kpi-value { display: block; font-size: 1.5rem; font-weight: 700; color: #1e293b; }
.kpi-label { font-size: 0.7rem; color: #64748b; }

.costo-total-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 0.75rem; padding-top: 0.75rem; border-top: 2px solid #e2e8f0;
  font-size: 0.9rem; font-weight: 600; color: #1e293b;
}
.costo-total-valor { font-size: 1.1rem; color: #dc2626; }

.font-mono { font-family: monospace; }

.dialog-form { display: flex; flex-direction: column; gap: 1rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-field { display: flex; flex-direction: column; gap: 0.4rem; }
.form-field label { font-size: 0.82rem; font-weight: 600; color: #475569; }
.form-field-check { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #475569; }
</style>
