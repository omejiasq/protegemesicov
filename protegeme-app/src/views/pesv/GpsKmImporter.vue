<template>
  <div class="km-importer">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Kilometraje GPS de Flota</h2>
        <span class="page-subtitle">
          Indicador PESV N°1 · Variable 5 — Km recorridos · Reporte trimestral a SISI-PESV · Res. 40595
        </span>
      </div>
      <div class="header-actions">
        <Select v-model="trimestreVer" :options="trimestres" optionLabel="label" optionValue="value"
          class="w-12rem" />
        <Button label="Exportar reporte" icon="pi pi-file-pdf" outlined @click="exportarReporte" />
      </div>
    </div>

    <!-- Banner aclaratorio -->
    <div class="info-banner">
      <i class="pi pi-info-circle"></i>
      <div>
        <strong>¿Qué datos necesita cargar?</strong>
        Supertransporte exige reportar los km recorridos por la flota <em>trimestralmente</em> (var. 5, ind. 1).
        Puede cargar lecturas <strong>mensuales por vehículo</strong> — el sistema consolida automáticamente el
        total trimestral. Solo necesita: <strong>placa · km · fecha</strong>.
        Cada empresa tiene su propia columna o nombre — el asistente de mapeo le ayuda a relacionar las columnas
        de su archivo GPS o ERP con los campos de ProtegeMe.
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-blue">
        <i class="pi pi-map kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ totalKmTrimestreStr }}</span>
          <span class="kpi-label">Km totales {{ trimestreLabel }}</span>
        </div>
      </div>
      <div class="kpi-card kpi-green">
        <i class="pi pi-car kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ vehiculosConDatos }}</span>
          <span class="kpi-label">Vehículos con datos</span>
        </div>
      </div>
      <div class="kpi-card kpi-purple">
        <i class="pi pi-chart-line kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ promedioKmStr }}</span>
          <span class="kpi-label">Km promedio / vehículo</span>
        </div>
      </div>
      <div class="kpi-card" :class="lecturasPendientes > 0 ? 'kpi-orange' : 'kpi-green'">
        <i class="pi pi-exclamation-circle kpi-icon"></i>
        <div>
          <span class="kpi-value">{{ lecturasPendientes }}</span>
          <span class="kpi-label">Vehículos sin lectura</span>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <TabView v-model:activeIndex="tabActivo" class="km-tabs">

      <!-- ═══ TAB 1: IMPORTAR CON ASISTENTE ═══ -->
      <TabPanel header="📂  Importar con asistente">
        <div class="tab-body">

          <!-- PASO 0: Selector de tipo + drop zone -->
          <div v-if="paso === 0">
            <!-- Tipo de dato -->
            <div class="tipo-selector">
              <button class="tipo-btn" :class="{ active: tipoLectura === 'acumulado' }"
                @click="tipoLectura = 'acumulado'">
                <i class="pi pi-gauge"></i>
                <span class="tipo-title">Lectura de odómetro (acumulado)</span>
                <span class="tipo-desc">Su archivo tiene el km total registrado en el odómetro a una fecha. El sistema calcula los km del período automáticamente.</span>
              </button>
              <button class="tipo-btn" :class="{ active: tipoLectura === 'periodo' }"
                @click="tipoLectura = 'periodo'">
                <i class="pi pi-chart-line"></i>
                <span class="tipo-title">Km del período (reporte GPS)</span>
                <span class="tipo-desc">Su archivo ya trae directamente los km recorridos en el período (mes o trimestre). Los km se cargan tal como vienen.</span>
              </button>
            </div>

            <div class="template-bar">
              <i class="pi pi-info-circle text-blue-500"></i>
              <span>¿No sabe el formato? Descargue la plantilla de ejemplo con los campos requeridos:</span>
              <Button :label="`Descargar plantilla (${tipoLectura === 'acumulado' ? 'odómetro' : 'km-período'}).xlsx`"
                icon="pi pi-download" text size="small" @click="descargarPlantilla" />
            </div>

            <div class="drop-zone" :class="{ 'drop-active': dragging }"
              @dragover.prevent="dragging = true" @dragleave="dragging = false"
              @drop.prevent="onDrop" @click="fileInput?.click()">
              <i class="pi pi-upload drop-icon"></i>
              <span class="drop-title">Arrastre aquí su archivo GPS / ERP o haga clic para seleccionar</span>
              <span class="drop-sub">
                Cualquier formato de columnas · Excel (.xlsx, .xls) o CSV · Máx. 20 MB<br/>
                <em>El asistente le ayudará a relacionar sus columnas con las de ProtegeMe</em>
              </span>
              <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="onFileSelect" />
            </div>
          </div>

          <!-- PASO 1: ASISTENTE DE MAPEO DE COLUMNAS -->
          <div v-if="paso === 1" class="mapping-section">
            <div class="mapping-header">
              <div>
                <span class="mapping-file">📄 {{ archivoNombre }}</span>
                <span class="mapping-info">
                  {{ filaCols.length }} columnas detectadas · {{ filaTotalRows }} filas de datos
                </span>
              </div>
              <Button label="Cambiar archivo" icon="pi pi-times" text size="small" @click="resetImport" />
            </div>

            <!-- Asistente visual -->
            <div class="asistente-banner">
              <i class="pi pi-magic-wand text-purple-600 text-xl"></i>
              <div>
                <strong>Asistente de mapeo</strong> — Relacione las columnas de su archivo con los campos de ProtegeMe.
                El sistema intentó hacer la correspondencia automáticamente. Revise y corrija si es necesario.
              </div>
            </div>

            <div class="mapping-grid">
              <div v-for="campo in camposKm" :key="campo.key" class="mapping-row"
                :class="{ 'mapping-required': campo.required, 'mapping-mapped': isMapped(campo.key) }">

                <!-- Campo destino ProtegeMe -->
                <div class="campo-info">
                  <div class="campo-name-row">
                    <span class="campo-name">{{ campo.label }}</span>
                    <span v-if="campo.required" class="badge-req">Obligatorio</span>
                    <span v-else class="badge-opt">Opcional</span>
                  </div>
                  <span class="campo-desc">{{ campo.desc }}</span>
                  <!-- Preview de valores de la columna mapeada -->
                  <div v-if="isMapped(campo.key)" class="campo-preview-vals">
                    <span v-for="(v, i) in previewColValues(campo.key)" :key="i" class="preview-chip">{{ v }}</span>
                  </div>
                </div>

                <!-- Flecha -->
                <div class="map-arrow-col">
                  <i class="pi pi-arrow-right map-arrow" :class="isMapped(campo.key) ? 'arrow-ok' : 'arrow-idle'"></i>
                  <span v-if="isMapped(campo.key)" class="pi pi-check-circle arrow-check"></span>
                </div>

                <!-- Columna del archivo (selector) -->
                <div class="map-select-col">
                  <Select v-model="mapeo[campo.key]"
                    :options="['— Sin mapear —', ...filaCols]"
                    class="w-full"
                    :class="{ 'select-mapped': isMapped(campo.key), 'select-error': campo.required && !isMapped(campo.key) }"
                    @change="actualizarPreview" />
                  <span class="map-hint">columna en su archivo</span>
                </div>
              </div>
            </div>

            <!-- Preview tabla -->
            <div v-if="previewRows.length" class="preview-section">
              <div class="preview-title-row">
                <h4 class="preview-title">
                  <i class="pi pi-eye mr-1"></i> Preview — primeras {{ previewRows.length }} filas con el mapeo actual
                </h4>
                <Tag v-if="erroresMapeo.length === 0 && mapeoValido" value="✓ Mapeo válido" severity="success" />
                <Tag v-else-if="erroresMapeo.length" :value="`${erroresMapeo.length} problema(s)`" severity="danger" />
              </div>
              <div class="preview-scroll">
                <table class="preview-table">
                  <thead>
                    <tr>
                      <th v-for="campo in camposMapeados" :key="campo.key">{{ campo.label }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in previewRows" :key="i">
                      <td v-for="campo in camposMapeados" :key="campo.key"
                        :class="campo.required && !row[campo.key] ? 'cell-error' : ''">
                        {{ row[campo.key] || '—' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="preview-footer">
                <span v-if="erroresMapeo.length" class="error-msg">
                  <i class="pi pi-exclamation-triangle"></i> {{ erroresMapeo[0] }}
                </span>
                <Button label="Importar datos" icon="pi pi-cloud-upload" iconPos="right"
                  :disabled="erroresMapeo.length > 0 || !mapeoValido"
                  @click="ejecutarImport" />
              </div>
            </div>
          </div>

          <!-- PASO 2: RESULTADO -->
          <div v-if="paso === 2" class="import-result">
            <div v-if="importando" class="import-progress">
              <ProgressBar mode="indeterminate" style="height:6px" />
              <span class="import-msg">Procesando {{ filaTotalRows }} lecturas de kilometraje…</span>
            </div>
            <div v-else class="result-panel">
              <div class="result-kpis">
                <div class="result-kpi kpi-green">
                  <span class="kpi-n">{{ resultImport.created }}</span>
                  <span class="kpi-l">Lecturas registradas</span>
                </div>
                <div class="result-kpi kpi-red">
                  <span class="kpi-n">{{ resultImport.errors }}</span>
                  <span class="kpi-l">Filas con error</span>
                </div>
                <div class="result-kpi kpi-blue">
                  <span class="kpi-n">{{ formatKm(resultImport.kmTotal) }}</span>
                  <span class="kpi-l">Km totales cargados</span>
                </div>
              </div>
              <div v-if="resultImport.errors > 0" class="errors-list">
                <h4>Filas con problemas:</h4>
                <div v-for="e in resultImport.errorRows" :key="e.fila" class="error-row">
                  <span class="error-idx">Fila {{ e.fila }}</span>
                  <span class="error-txt">{{ e.msg }}</span>
                </div>
              </div>
              <div class="result-actions">
                <Button label="Nueva importación" icon="pi pi-refresh" outlined @click="resetImport" />
                <Button label="Ver historial" icon="pi pi-list" @click="tabActivo = 2" />
              </div>
            </div>
          </div>

        </div>
      </TabPanel>

      <!-- ═══ TAB 2: REGISTRO MANUAL ═══ -->
      <TabPanel header="✏️  Registro manual">
        <div class="tab-body">
          <div class="template-bar">
            <i class="pi pi-info-circle text-blue-500"></i>
            <span>Use esta opción para registrar la lectura de un vehículo individual o corregir un dato.</span>
          </div>
          <div class="manual-form-grid">
            <div class="form-field">
              <label>Placa del vehículo *</label>
              <Select v-model="manualForm.placa" :options="placasFlota" placeholder="Seleccione placa" class="w-full" />
            </div>
            <div class="form-field">
              <label>
                {{ tipoLectura === 'acumulado' ? 'Km en odómetro (total acumulado) *' : 'Km recorridos en el período *' }}
              </label>
              <InputNumber v-model="manualForm.km" :min="0" :max="9999999"
                suffix=" km" class="w-full" placeholder="Ej: 125.430" />
            </div>
            <div class="form-field">
              <label>Fecha de la lectura *</label>
              <DatePicker v-model="manualForm.fecha" dateFormat="dd/mm/yy" class="w-full" showIcon />
            </div>
            <div class="form-field">
              <label>Mes de reporte</label>
              <Select v-model="manualForm.mes" :options="mesesOpciones" optionLabel="label" optionValue="value"
                class="w-full" />
            </div>
            <div class="form-field">
              <label>Fuente del dato</label>
              <Select v-model="manualForm.fuente" :options="fuenteOpciones" class="w-full" />
            </div>
          </div>
          <div class="form-actions">
            <Button label="Registrar lectura" icon="pi pi-plus" @click="registrarManual" />
          </div>
        </div>
      </TabPanel>

      <!-- ═══ TAB 3: HISTORIAL MENSUAL ═══ -->
      <TabPanel header="📋  Historial mensual">
        <div class="tab-body">
          <div class="table-header-row">
            <div class="flex gap-2">
              <Select v-model="filtroMes" :options="mesesOpciones" optionLabel="label" optionValue="value"
                placeholder="Todos los meses" class="w-12rem" />
              <Select v-model="filtroPlaca" :options="['Todos', ...placasFlota]"
                placeholder="Todas las placas" class="w-9rem" />
            </div>
            <Button label="Exportar CSV" icon="pi pi-download" outlined size="small" @click="exportarCSV" />
          </div>

          <DataTable :value="historialFiltrado" stripedRows size="small" :paginator="true" :rows="10"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink">
            <Column field="placa" header="Placa" style="width:100px">
              <template #body="{ data }">
                <Tag :value="data.placa" severity="secondary" class="font-mono" />
              </template>
            </Column>
            <Column field="mes" header="Mes" style="width:120px" />
            <Column field="fechaLectura" header="Fecha lectura" style="width:120px" />
            <Column field="kmOdometro" header="Km odómetro" bodyClass="text-right">
              <template #body="{ data }">
                <span v-if="data.kmOdometro">{{ formatKm(data.kmOdometro) }}</span>
                <span v-else class="text-slate-400 text-xs">—</span>
              </template>
            </Column>
            <Column field="kmPeriodo" header="Km del período" bodyClass="text-right font-semibold">
              <template #body="{ data }">
                <span class="text-blue-700">{{ formatKm(data.kmPeriodo) }}</span>
              </template>
            </Column>
            <Column field="fuente" header="Fuente">
              <template #body="{ data }">
                <Tag :value="data.fuente" :severity="data.fuente === 'GPS Automático' ? 'success' : 'secondary'" />
              </template>
            </Column>
            <Column field="trimestre" header="Trimestre" style="width:90px">
              <template #body="{ data }">
                <span class="font-bold text-slate-500">{{ data.trimestre }}</span>
              </template>
            </Column>
            <Column header="" style="width:50px" bodyClass="text-center">
              <template #body>
                <Button icon="pi pi-trash" severity="danger" text size="small" @click="toast.add({severity:'warn',summary:'Demo',detail:'Eliminar disponible en producción',life:2500})" />
              </template>
            </Column>
          </DataTable>

          <!-- Resumen por vehículo del trimestre -->
          <div class="section-card mt-4">
            <h3 class="section-title"><i class="pi pi-car mr-2"></i>Resumen trimestral por vehículo — {{ trimestreLabel }}</h3>
            <DataTable :value="resumenPorVehiculo" stripedRows size="small">
              <Column field="placa" header="Placa">
                <template #body="{ data }">
                  <Tag :value="data.placa" severity="secondary" class="font-mono" />
                </template>
              </Column>
              <Column field="mesesCon" header="Meses con datos" bodyClass="text-center" />
              <Column field="kmTrimestre" header="Km trimestre" bodyClass="text-right font-bold">
                <template #body="{ data }">
                  <span class="text-blue-800">{{ formatKm(data.kmTrimestre) }}</span>
                </template>
              </Column>
              <Column field="fuente" header="Fuente predominante" />
              <Column header="Completitud" style="width:140px">
                <template #body="{ data }">
                  <div class="completitud-bar">
                    <div class="comp-fill" :style="{ width: `${(data.mesesCon / 3) * 100}%` }"
                      :class="data.mesesCon === 3 ? 'comp-ok' : 'comp-warn'"></div>
                  </div>
                  <span class="comp-label">{{ data.mesesCon }}/3 meses</span>
                </template>
              </Column>
            </DataTable>
          </div>
        </div>
      </TabPanel>

      <!-- ═══ TAB 4: REPORTE SISI-PESV ═══ -->
      <TabPanel header="📊  Reporte SISI-PESV">
        <div class="tab-body">
          <div class="sisi-banner">
            <i class="pi pi-send text-blue-600 text-2xl"></i>
            <div>
              <strong>Formulario 2 — Indicador 1 · Variable 5: Kilómetros recorridos</strong>
              <p class="text-sm text-slate-500 mt-1">
                Este reporte consolida los km totales de <em>toda la flota</em> por trimestre
                en el formato que exige el SISI-PESV. Reporte trimestral acumulativo.
                Exporte en PDF o copie al portal de Supertransporte cuando lo requiera.
              </p>
            </div>
          </div>

          <DataTable :value="reporteSisi" stripedRows size="small" class="mt-3">
            <Column field="trimestre" header="Período" />
            <Column field="kmTotales" header="Km totales flota (Var. 5)" bodyClass="text-right font-bold">
              <template #body="{ data }">{{ formatKm(data.kmTotales) }}</template>
            </Column>
            <Column field="kmAcumulado" header="Km acumulado año" bodyClass="text-right">
              <template #body="{ data }">{{ formatKm(data.kmAcumulado) }}</template>
            </Column>
            <Column field="vehiculos" header="Vehículos" bodyClass="text-center" />
            <Column field="promedio" header="Km / vehículo" bodyClass="text-right">
              <template #body="{ data }">{{ formatKm(data.promedio) }}</template>
            </Column>
            <Column field="estado" header="Estado SISI">
              <template #body="{ data }">
                <Tag :value="data.estado"
                  :severity="data.estado === 'Reportado' ? 'success' : data.estado === 'Listo para reportar' ? 'warn' : 'secondary'" />
              </template>
            </Column>
          </DataTable>

          <div class="sisi-totales">
            <span>Total km acumulado {{ anioActual }}:</span>
            <strong class="text-blue-800 text-lg">{{ formatKm(totalKmAnio) }} km</strong>
          </div>

          <div class="mt-3 flex gap-2 justify-end flex-wrap">
            <Button label="Exportar PDF Supertransporte" icon="pi pi-file-pdf" severity="danger" @click="exportarPDF" />
            <Button label="Copiar datos al portapapeles" icon="pi pi-copy" outlined @click="copiarDatos" />
          </div>
        </div>
      </TabPanel>

    </TabView>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'
import Button from 'primevue/button'
import Select from 'primevue/select'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import ProgressBar from 'primevue/progressbar'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const tabActivo = ref(0)
const dragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const tipoLectura = ref<'acumulado' | 'periodo'>('acumulado')
const anioActual = '2026'

// ─── Wizard de importación ────────────────────────────────────────────────────
const paso = ref(0)
const archivoNombre = ref('')
const filaCols = ref<string[]>([])
const filaTotalRows = ref(0)
const filaRawData = ref<any[]>([])
const mapeo = ref<Record<string, string>>({})
const previewRows = ref<any[]>([])
const importando = ref(false)
const resultImport = ref({ created: 0, errors: 0, kmTotal: 0, errorRows: [] as {fila:number,msg:string}[] })

// ─── Campos que espera ProtegeMe ─────────────────────────────────────────────
const camposKm = [
  { key: 'placa',     label: 'Placa',             required: true,  desc: 'Placa del vehículo (identificador único). Ej: ABC-123, ABC123' },
  { key: 'km',        label: 'Km / odómetro',     required: true,  desc: tipoLectura.value === 'acumulado' ? 'Lectura total del odómetro. Ej: 125430' : 'Km recorridos en el período. Ej: 4120' },
  { key: 'fecha',     label: 'Fecha de lectura',  required: true,  desc: 'Fecha en cualquier formato. Ej: 31/03/2026, 2026-03-31, 31-03-26' },
  { key: 'mes',       label: 'Mes de reporte',    required: false, desc: 'Ej: Marzo 2026, 2026-03. Si no existe, se deduce de la fecha.' },
  { key: 'fuente',    label: 'Fuente GPS',        required: false, desc: 'Nombre del sistema GPS o proveedor. Ej: Geotab, Wialon, Traccar' },
]

// Auto-mapeo inteligente — detecta columnas por nombre similar
const autoMapeoKm: Record<string, string[]> = {
  placa:  ['placa', 'PLACA', 'Placa', 'plate', 'matricula', 'vehiculo', 'VEHICULO', 'vehicle_id', 'fleet_id'],
  km:     ['km', 'KM', 'kilometraje', 'KILOMETRAJE', 'odometro', 'ODOMETRO', 'mileage', 'km_total', 'km_periodo', 'distancia', 'kms'],
  fecha:  ['fecha', 'FECHA', 'date', 'DATE', 'fecha_lectura', 'reading_date', 'periodo', 'mes_fecha'],
  mes:    ['mes', 'MES', 'month', 'periodo', 'PERIODO', 'trimestre'],
  fuente: ['fuente', 'FUENTE', 'source', 'gps', 'GPS', 'proveedor', 'sistema'],
}

function autoMapear() {
  const nuevoMapeo: Record<string, string> = {}
  for (const [campo, posibles] of Object.entries(autoMapeoKm)) {
    const encontrado = filaCols.value.find(col =>
      posibles.some(p => col.toLowerCase().trim() === p.toLowerCase())
    ) ?? filaCols.value.find(col =>
      posibles.some(p => col.toLowerCase().includes(p.toLowerCase()))
    )
    nuevoMapeo[campo] = encontrado ?? ''
  }
  mapeo.value = nuevoMapeo
}

function isMapped(key: string): boolean {
  return !!mapeo.value[key] && mapeo.value[key] !== '— Sin mapear —'
}

function previewColValues(key: string): string[] {
  const col = mapeo.value[key]
  if (!col || col === '— Sin mapear —') return []
  return filaRawData.value.slice(0, 3).map(r => String(r[col] ?? '—'))
}

function actualizarPreview() {
  const rows = filaRawData.value.slice(0, 5)
  previewRows.value = rows.map(row => {
    const out: Record<string, string> = {}
    for (const campo of camposKm) {
      const col = mapeo.value[campo.key]
      out[campo.key] = (col && col !== '— Sin mapear —') ? String(row[col] ?? '') : ''
    }
    return out
  })
}

const camposMapeados = computed(() => camposKm.filter(c => isMapped(c.key)))

const mapeoValido = computed(() => isMapped('placa') && isMapped('km') && isMapped('fecha'))

const erroresMapeo = computed(() => {
  const errors: string[] = []
  if (!isMapped('placa')) errors.push('El campo "Placa" es obligatorio.')
  if (!isMapped('km'))    errors.push('El campo "Km / odómetro" es obligatorio.')
  if (!isMapped('fecha')) errors.push('El campo "Fecha de lectura" es obligatorio.')
  return errors
})

// ─── Procesamiento de archivo ─────────────────────────────────────────────────
function onDrop(e: DragEvent) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) procesarArchivo(file)
}
function onFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) procesarArchivo(file)
}
function procesarArchivo(file: File) {
  archivoNombre.value = file.name
  const reader = new FileReader()
  reader.onload = (e) => {
    const data = new Uint8Array(e.target!.result as ArrayBuffer)
    const wb = XLSX.read(data, { type: 'array', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false })
    if (!rows.length) {
      toast.add({ severity: 'warn', summary: 'Archivo vacío', detail: 'El archivo no contiene datos', life: 3000 })
      return
    }
    filaRawData.value = rows
    filaTotalRows.value = rows.length
    filaCols.value = Object.keys(rows[0])
    autoMapear()
    actualizarPreview()
    paso.value = 1
  }
  reader.readAsArrayBuffer(file)
}

function resetImport() {
  paso.value = 0; filaCols.value = []; filaRawData.value = []
  mapeo.value = {}; previewRows.value = []; archivoNombre.value = ''
  filaTotalRows.value = 0; importando.value = false
  if (fileInput.value) fileInput.value.value = ''
}

async function ejecutarImport() {
  paso.value = 2
  importando.value = true
  resultImport.value = { created: 0, errors: 0, kmTotal: 0, errorRows: [] }

  await new Promise(r => setTimeout(r, 1400)) // simular procesamiento

  // Procesar filas mapeadas
  let created = 0, errors = 0, kmTotal = 0
  const errorRows: {fila: number, msg: string}[] = []

  filaRawData.value.forEach((row, i) => {
    const placa = String(row[mapeo.value['placa']] ?? '').trim()
    const kmRaw = row[mapeo.value['km']]
    const km = parseFloat(String(kmRaw).replace(/[.,](?=\d{3})/g, '').replace(',', '.'))
    const fecha = String(row[mapeo.value['fecha']] ?? '').trim()

    if (!placa) { errorRows.push({ fila: i + 2, msg: 'Placa vacía' }); errors++; return }
    if (isNaN(km) || km < 0) { errorRows.push({ fila: i + 2, msg: `Km inválido: "${kmRaw}"` }); errors++; return }
    if (!fecha) { errorRows.push({ fila: i + 2, msg: 'Fecha vacía' }); errors++; return }

    // Agregar al historial demo
    const fuente = isMapped('fuente') ? String(row[mapeo.value['fuente']] ?? 'Importado') : 'Importado'
    const mes = isMapped('mes') ? String(row[mapeo.value['mes']] ?? '') : deducirMes(fecha)
    const trimestre = deducirTrimestre(mes || fecha)

    lecturasHistorial.value.unshift({
      placa, fechaLectura: fecha, mes: mes || deducirMes(fecha),
      kmOdometro: tipoLectura.value === 'acumulado' ? km : undefined,
      kmPeriodo: tipoLectura.value === 'periodo' ? km : Math.round(km * 0.03),
      fuente, trimestre,
    })
    kmTotal += tipoLectura.value === 'periodo' ? km : Math.round(km * 0.03)
    created++
  })

  importando.value = false
  resultImport.value = { created, errors, kmTotal, errorRows }

  if (created > 0) {
    toast.add({ severity: 'success', summary: 'Importación completada', detail: `${created} lecturas de km registradas — ${formatKm(kmTotal)} km totales`, life: 5000 })
  }
}

function deducirMes(fecha: string): string {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const mesesNombre = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  // intentar parsear
  const partes = fecha.split(/[-/]/)
  if (partes.length >= 2) {
    const mes = parseInt(partes[1]) - 1
    const anio = partes[2]?.length === 4 ? partes[2] : partes[0]?.length === 4 ? partes[0] : '2026'
    if (mes >= 0 && mes < 12) return `${mesesNombre[mes]} ${anio}`
  }
  return fecha
}

function deducirTrimestre(ref: string): string {
  const lower = ref.toLowerCase()
  if (lower.includes('ene') || lower.includes('feb') || lower.includes('mar') || lower.includes('-01') || lower.includes('-02') || lower.includes('-03')) return 'Q1-2026'
  if (lower.includes('abr') || lower.includes('may') || lower.includes('jun') || lower.includes('-04') || lower.includes('-05') || lower.includes('-06')) return 'Q2-2026'
  if (lower.includes('jul') || lower.includes('ago') || lower.includes('sep') || lower.includes('-07') || lower.includes('-08') || lower.includes('-09')) return 'Q3-2026'
  return 'Q4-2026'
}

// ─── Descarga de plantilla real XLSX ─────────────────────────────────────────
function descargarPlantilla() {
  const wb = XLSX.utils.book_new()

  if (tipoLectura.value === 'acumulado') {
    const datos = [
      { 'placa (*)': '', 'km_odometro (*) — lectura total': '', 'fecha_lectura (*)': '', 'mes_reporte': '', 'fuente_gps': '' },
      { 'placa (*)': 'ABC-123', 'km_odometro (*) — lectura total': 125430, 'fecha_lectura (*)': '31/03/2026', 'mes_reporte': 'Marzo 2026', 'fuente_gps': 'Geotab' },
      { 'placa (*)': 'DEF-456', 'km_odometro (*) — lectura total': 87650,  'fecha_lectura (*)': '31/03/2026', 'mes_reporte': 'Marzo 2026', 'fuente_gps': 'GPS Manual' },
      { 'placa (*)': 'GHI-789', 'km_odometro (*) — lectura total': 203100, 'fecha_lectura (*)': '28/02/2026', 'mes_reporte': 'Febrero 2026', 'fuente_gps': 'Wialon' },
    ]
    const ws = XLSX.utils.json_to_sheet(datos)
    ws['!cols'] = [{ wch: 14 }, { wch: 38 }, { wch: 22 }, { wch: 18 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Km_Odómetro')

    // Hoja de instrucciones
    const instrucciones = [
      { 'INSTRUCCIONES': '(*) = campo obligatorio' },
      { 'INSTRUCCIONES': 'placa: use el mismo formato de placa que está en ProtegeMe (con o sin guión)' },
      { 'INSTRUCCIONES': 'km_odometro: lectura total del cuentakilómetros. El sistema calcula el km del período restando la lectura anterior.' },
      { 'INSTRUCCIONES': 'fecha_lectura: puede usar DD/MM/AAAA, AAAA-MM-DD, o cualquier formato reconocible.' },
      { 'INSTRUCCIONES': 'mes_reporte: opcional. Si no lo pone, se deduce de la fecha.' },
      { 'INSTRUCCIONES': 'Reporte a Supertransporte: trimestral acumulativo (var. 5 del indicador 1 — Res. 40595/2022).' },
    ]
    const ws2 = XLSX.utils.json_to_sheet(instrucciones)
    ws2['!cols'] = [{ wch: 80 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Instrucciones')

    XLSX.writeFile(wb, 'ProtegeMe_Plantilla_Km_Odometro.xlsx')
  } else {
    const datos = [
      { 'placa (*)': '', 'km_periodo (*) — km en el mes': '', 'fecha_cierre_mes (*)': '', 'mes_reporte': '', 'fuente_gps': '' },
      { 'placa (*)': 'ABC-123', 'km_periodo (*) — km en el mes': 4120, 'fecha_cierre_mes (*)': '31/03/2026', 'mes_reporte': 'Marzo 2026', 'fuente_gps': 'Geotab' },
      { 'placa (*)': 'DEF-456', 'km_periodo (*) — km en el mes': 3850, 'fecha_cierre_mes (*)': '31/03/2026', 'mes_reporte': 'Marzo 2026', 'fuente_gps': 'GPS Manual' },
      { 'placa (*)': 'GHI-789', 'km_periodo (*) — km en el mes': 5210, 'fecha_cierre_mes (*)': '28/02/2026', 'mes_reporte': 'Febrero 2026', 'fuente_gps': 'Wialon' },
    ]
    const ws = XLSX.utils.json_to_sheet(datos)
    ws['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 24 }, { wch: 18 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Km_Periodo')
    XLSX.writeFile(wb, 'ProtegeMe_Plantilla_Km_Periodo.xlsx')
  }

  toast.add({ severity: 'success', summary: 'Plantilla descargada', detail: `ProtegeMe_Plantilla_Km_${tipoLectura.value === 'acumulado' ? 'Odometro' : 'Periodo'}.xlsx`, life: 3500 })
}

// ─── Datos de demo (historial) ────────────────────────────────────────────────
const placasFlota = ['ABC-123', 'DEF-456', 'GHI-789', 'JKL-012', 'MNO-345', 'PQR-678']
const fuenteOpciones = ['GPS Automático', 'App ProtegeMe', 'Geotab', 'Wialon', 'Traccar', 'Manual']
const mesesOpciones = [
  { label: 'Marzo 2026',    value: 'Marzo 2026' },
  { label: 'Febrero 2026',  value: 'Febrero 2026' },
  { label: 'Enero 2026',    value: 'Enero 2026' },
  { label: 'Diciembre 2025', value: 'Diciembre 2025' },
  { label: 'Noviembre 2025', value: 'Noviembre 2025' },
  { label: 'Octubre 2025',  value: 'Octubre 2025' },
]

const lecturasHistorial = ref([
  // Q1-2026 — Marzo
  { placa: 'ABC-123', fechaLectura: '31/03/2026', mes: 'Marzo 2026',    kmOdometro: 125430, kmPeriodo: 1380, fuente: 'GPS Automático', trimestre: 'Q1-2026' },
  { placa: 'DEF-456', fechaLectura: '31/03/2026', mes: 'Marzo 2026',    kmOdometro: 87650,  kmPeriodo: 1250, fuente: 'GPS Automático', trimestre: 'Q1-2026' },
  { placa: 'GHI-789', fechaLectura: '31/03/2026', mes: 'Marzo 2026',    kmOdometro: 203100, kmPeriodo: 1720, fuente: 'App ProtegeMe',  trimestre: 'Q1-2026' },
  { placa: 'JKL-012', fechaLectura: '31/03/2026', mes: 'Marzo 2026',    kmOdometro: 64200,  kmPeriodo: 980,  fuente: 'Manual',         trimestre: 'Q1-2026' },
  { placa: 'MNO-345', fechaLectura: '31/03/2026', mes: 'Marzo 2026',    kmOdometro: 155800, kmPeriodo: 1560, fuente: 'GPS Automático', trimestre: 'Q1-2026' },
  { placa: 'PQR-678', fechaLectura: '31/03/2026', mes: 'Marzo 2026',    kmOdometro: 98700,  kmPeriodo: 1100, fuente: 'App ProtegeMe',  trimestre: 'Q1-2026' },
  // Q1-2026 — Febrero
  { placa: 'ABC-123', fechaLectura: '28/02/2026', mes: 'Febrero 2026',  kmOdometro: 124050, kmPeriodo: 1380, fuente: 'GPS Automático', trimestre: 'Q1-2026' },
  { placa: 'DEF-456', fechaLectura: '28/02/2026', mes: 'Febrero 2026',  kmOdometro: 86400,  kmPeriodo: 1250, fuente: 'GPS Automático', trimestre: 'Q1-2026' },
  { placa: 'GHI-789', fechaLectura: '28/02/2026', mes: 'Febrero 2026',  kmOdometro: 201380, kmPeriodo: 1680, fuente: 'App ProtegeMe',  trimestre: 'Q1-2026' },
  { placa: 'JKL-012', fechaLectura: '28/02/2026', mes: 'Febrero 2026',  kmOdometro: 63220,  kmPeriodo: 980,  fuente: 'Manual',         trimestre: 'Q1-2026' },
  { placa: 'MNO-345', fechaLectura: '28/02/2026', mes: 'Febrero 2026',  kmOdometro: 154240, kmPeriodo: 1560, fuente: 'GPS Automático', trimestre: 'Q1-2026' },
  { placa: 'PQR-678', fechaLectura: '28/02/2026', mes: 'Febrero 2026',  kmOdometro: 97600,  kmPeriodo: 1100, fuente: 'App ProtegeMe',  trimestre: 'Q1-2026' },
  // Q1-2026 — Enero
  { placa: 'ABC-123', fechaLectura: '31/01/2026', mes: 'Enero 2026',    kmOdometro: 122670, kmPeriodo: 1360, fuente: 'GPS Automático', trimestre: 'Q1-2026' },
  { placa: 'DEF-456', fechaLectura: '31/01/2026', mes: 'Enero 2026',    kmOdometro: 85150,  kmPeriodo: 1350, fuente: 'GPS Automático', trimestre: 'Q1-2026' },
  { placa: 'GHI-789', fechaLectura: '31/01/2026', mes: 'Enero 2026',    kmOdometro: 199700, kmPeriodo: 1810, fuente: 'App ProtegeMe',  trimestre: 'Q1-2026' },
  { placa: 'JKL-012', fechaLectura: '31/01/2026', mes: 'Enero 2026',    kmOdometro: 62240,  kmPeriodo: 980,  fuente: 'Manual',         trimestre: 'Q1-2026' },
  { placa: 'MNO-345', fechaLectura: '31/01/2026', mes: 'Enero 2026',    kmOdometro: 152680, kmPeriodo: 1560, fuente: 'GPS Automático', trimestre: 'Q1-2026' },
  { placa: 'PQR-678', fechaLectura: '31/01/2026', mes: 'Enero 2026',    kmOdometro: 96500,  kmPeriodo: 1100, fuente: 'App ProtegeMe',  trimestre: 'Q1-2026' },
  // Q4-2025
  { placa: 'ABC-123', fechaLectura: '31/12/2025', mes: 'Diciembre 2025', kmOdometro: 121310, kmPeriodo: 1290, fuente: 'GPS Automático', trimestre: 'Q4-2025' },
  { placa: 'DEF-456', fechaLectura: '31/12/2025', mes: 'Diciembre 2025', kmOdometro: 83800,  kmPeriodo: 1170, fuente: 'GPS Automático', trimestre: 'Q4-2025' },
  { placa: 'GHI-789', fechaLectura: '31/12/2025', mes: 'Diciembre 2025', kmOdometro: 197890, kmPeriodo: 1640, fuente: 'App ProtegeMe',  trimestre: 'Q4-2025' },
])

// ─── Filtros de historial ─────────────────────────────────────────────────────
const filtroMes = ref('')
const filtroPlaca = ref('Todos')
const historialFiltrado = computed(() => {
  return lecturasHistorial.value.filter(l => {
    const okMes = !filtroMes.value || l.mes === filtroMes.value
    const okPlaca = filtroPlaca.value === 'Todos' || l.placa === filtroPlaca.value
    return okMes && okPlaca
  })
})

// ─── KPIs trimestre ───────────────────────────────────────────────────────────
const trimestres = [
  { label: 'Q1 2026 (Ene–Mar)', value: 'Q1-2026' },
  { label: 'Q4 2025 (Oct–Dic)', value: 'Q4-2025' },
  { label: 'Q3 2025 (Jul–Sep)', value: 'Q3-2025' },
]
const trimestreVer = ref('Q1-2026')
const trimestreLabel = computed(() => trimestres.find(t => t.value === trimestreVer.value)?.label ?? '')

const lecturasActuales = computed(() => lecturasHistorial.value.filter(l => l.trimestre === trimestreVer.value))
const totalKmTrimestre = computed(() => lecturasActuales.value.reduce((s, l) => s + l.kmPeriodo, 0))
const totalKmTrimestreStr = computed(() => formatKm(totalKmTrimestre.value) + ' km')
const vehiculosConDatos = computed(() => new Set(lecturasActuales.value.map(l => l.placa)).size)
const lecturasPendientes = computed(() => Math.max(0, 6 - vehiculosConDatos.value))
const promedioKmStr = computed(() =>
  vehiculosConDatos.value > 0 ? formatKm(Math.round(totalKmTrimestre.value / vehiculosConDatos.value)) : '0'
)

// ─── Resumen por vehículo ─────────────────────────────────────────────────────
const resumenPorVehiculo = computed(() => {
  const map: Record<string, { placa: string, mesesCon: number, kmTrimestre: number, fuente: string }> = {}
  for (const l of lecturasActuales.value) {
    if (!map[l.placa]) map[l.placa] = { placa: l.placa, mesesCon: 0, kmTrimestre: 0, fuente: l.fuente }
    map[l.placa].mesesCon++
    map[l.placa].kmTrimestre += l.kmPeriodo
  }
  return Object.values(map).sort((a, b) => b.kmTrimestre - a.kmTrimestre)
})

// ─── Reporte SISI-PESV ────────────────────────────────────────────────────────
const reporteSisi = [
  { trimestre: 'Q1 2026 (Ene–Mar)', kmTotales: 24100, kmAcumulado: 24100, vehiculos: 6, promedio: 4017, estado: 'Listo para reportar' },
  { trimestre: 'Q4 2025 (Oct–Dic)', kmTotales: 21500, kmAcumulado: 45600, vehiculos: 6, promedio: 3583, estado: 'Reportado' },
  { trimestre: 'Q3 2025 (Jul–Sep)', kmTotales: 19800, kmAcumulado: 24100, vehiculos: 6, promedio: 3300, estado: 'Reportado' },
  { trimestre: 'Q2 2025 (Abr–Jun)', kmTotales: 22300, kmAcumulado: 4300,  vehiculos: 6, promedio: 3717, estado: 'Reportado' },
]
const totalKmAnio = 24100 + 21500

// ─── Registro manual ──────────────────────────────────────────────────────────
const manualForm = ref({ placa: '', km: null as number | null, fecha: null as Date | null, mes: '', fuente: 'Manual' })

function registrarManual() {
  if (!manualForm.value.placa || !manualForm.value.km) {
    toast.add({ severity: 'warn', summary: 'Datos incompletos', detail: 'Ingrese placa y km', life: 3000 })
    return
  }
  const fechaStr = manualForm.value.fecha
    ? new Date(manualForm.value.fecha).toLocaleDateString('es-CO')
    : new Date().toLocaleDateString('es-CO')
  lecturasHistorial.value.unshift({
    placa: manualForm.value.placa,
    fechaLectura: fechaStr,
    mes: manualForm.value.mes || deducirMes(fechaStr),
    kmOdometro: tipoLectura.value === 'acumulado' ? manualForm.value.km! : undefined,
    kmPeriodo: tipoLectura.value === 'periodo' ? manualForm.value.km! : Math.round(manualForm.value.km! * 0.03),
    fuente: manualForm.value.fuente,
    trimestre: deducirTrimestre(manualForm.value.mes || fechaStr),
  })
  toast.add({ severity: 'success', summary: 'Lectura registrada', detail: `Km de ${manualForm.value.placa} guardados`, life: 3000 })
  manualForm.value = { placa: '', km: null, fecha: null, mes: '', fuente: 'Manual' }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatKm(v: number | undefined): string {
  if (v === undefined || v === null) return '—'
  return v.toLocaleString('es-CO') + ' km'
}
function exportarCSV() {
  const ws = XLSX.utils.json_to_sheet(historialFiltrado.value)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Kilometraje')
  XLSX.writeFile(wb, 'ProtegeMe_Kilometraje.xlsx')
  toast.add({ severity: 'success', summary: 'Exportado', detail: 'ProtegeMe_Kilometraje.xlsx descargado', life: 3000 })
}
function exportarReporte() {
  toast.add({ severity: 'success', summary: 'Exportando', detail: 'Reporte indicador 1 var.5 generándose...', life: 3000 })
}
function exportarPDF() {
  toast.add({ severity: 'success', summary: 'PDF generado', detail: 'Reporte trimestral listo para Supertransporte', life: 3500 })
}
function copiarDatos() {
  const lineas = reporteSisi.map(r => `${r.trimestre}\t${r.kmTotales}\t${r.vehiculos}`).join('\n')
  navigator.clipboard?.writeText(lineas).catch(() => {})
  toast.add({ severity: 'info', summary: 'Copiado', detail: 'Datos copiados al portapapeles', life: 2000 })
}
</script>

<style scoped>
.km-importer { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
.page-title { font-size: 1.4rem; font-weight: 700; color: #1e3a5f; margin: 0; }
.page-subtitle { font-size: 0.82rem; color: #64748b; }
.header-actions { display: flex; gap: 0.75rem; align-items: center; }

.info-banner {
  background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;
  padding: 1rem 1.2rem; display: flex; gap: 0.75rem; align-items: flex-start;
  font-size: 0.85rem; color: #1e40af; line-height: 1.5;
}
.info-banner i { font-size: 1.1rem; margin-top: 2px; flex-shrink: 0; }

.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem; }
.kpi-card {
  background: white; border-radius: 12px; padding: 1.1rem 1.2rem;
  display: flex; align-items: center; gap: 0.9rem;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08); border-left: 4px solid transparent;
}
.kpi-blue   { border-left-color: #3b82f6; }
.kpi-green  { border-left-color: #22c55e; }
.kpi-purple { border-left-color: #a855f7; }
.kpi-orange { border-left-color: #f97316; }
.kpi-icon { font-size: 1.6rem; opacity: 0.45; }
.kpi-value { display: block; font-size: 1.5rem; font-weight: 700; color: #1e293b; }
.kpi-label { font-size: 0.72rem; color: #64748b; }

.km-tabs { background: white; border-radius: 12px; box-shadow: 0 1px 6px rgba(0,0,0,0.08); overflow: hidden; }
.tab-body { padding: 1.2rem; display: flex; flex-direction: column; gap: 1rem; }

/* Tipo de lectura */
.tipo-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.tipo-btn {
  background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px;
  padding: 1rem 1.2rem; cursor: pointer; text-align: left;
  display: flex; flex-direction: column; gap: 0.35rem; transition: all 0.2s;
}
.tipo-btn:hover { border-color: #93c5fd; background: #eff6ff; }
.tipo-btn.active { border-color: #3b82f6; background: #eff6ff; }
.tipo-btn i { font-size: 1.4rem; color: #3b82f6; }
.tipo-title { font-weight: 700; font-size: 0.9rem; color: #1e293b; }
.tipo-desc { font-size: 0.78rem; color: #64748b; line-height: 1.4; }

.template-bar {
  background: #f0f9ff; border: 1px dashed #7dd3fc; border-radius: 8px;
  padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.6rem;
  font-size: 0.85rem; color: #0369a1; flex-wrap: wrap;
}

.drop-zone {
  border: 2px dashed #cbd5e1; border-radius: 12px;
  padding: 2.5rem; text-align: center; cursor: pointer;
  transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
}
.drop-zone:hover, .drop-active { border-color: #3b82f6; background: #eff6ff; }
.drop-icon { font-size: 2.5rem; color: #94a3b8; }
.drop-title { font-size: 1rem; font-weight: 600; color: #334155; }
.drop-sub { font-size: 0.82rem; color: #94a3b8; line-height: 1.5; }
.hidden { display: none; }

/* Mapping */
.mapping-section { display: flex; flex-direction: column; gap: 1rem; }
.mapping-header {
  display: flex; justify-content: space-between; align-items: center;
  background: #f8fafc; border-radius: 8px; padding: 0.75rem 1rem;
}
.mapping-file { font-weight: 700; color: #1e3a5f; font-size: 0.9rem; display: block; }
.mapping-info { font-size: 0.75rem; color: #64748b; }

.asistente-banner {
  background: #faf5ff; border: 1px solid #d8b4fe; border-radius: 10px;
  padding: 0.9rem 1.1rem; display: flex; gap: 0.75rem; align-items: flex-start;
  font-size: 0.85rem; color: #6b21a8;
}

.mapping-grid { display: flex; flex-direction: column; gap: 0.75rem; }
.mapping-row {
  display: grid; grid-template-columns: 1fr 50px 1fr; gap: 0.75rem; align-items: center;
  background: #f8fafc; border-radius: 10px; padding: 0.85rem 1rem;
  border: 1px solid #e2e8f0; transition: all 0.2s;
}
.mapping-row.mapping-mapped { background: #f0fdf4; border-color: #bbf7d0; }
.mapping-row.mapping-required:not(.mapping-mapped) { border-color: #fca5a5; background: #fff5f5; }

.campo-info { display: flex; flex-direction: column; gap: 0.2rem; }
.campo-name-row { display: flex; align-items: center; gap: 0.4rem; }
.campo-name { font-weight: 700; font-size: 0.88rem; color: #1e293b; }
.badge-req { background: #fef2f2; color: #dc2626; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 6px; border: 1px solid #fca5a5; }
.badge-opt { background: #f1f5f9; color: #64748b; font-size: 0.65rem; font-weight: 600; padding: 1px 6px; border-radius: 6px; }
.campo-desc { font-size: 0.75rem; color: #94a3b8; line-height: 1.3; }
.campo-preview-vals { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px; }
.preview-chip { background: #e0f2fe; color: #0369a1; font-size: 0.68rem; padding: 1px 7px; border-radius: 10px; font-family: monospace; }

.map-arrow-col { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.map-arrow { font-size: 1rem; transition: color 0.2s; }
.arrow-ok { color: #16a34a; }
.arrow-idle { color: #cbd5e1; }
.arrow-check { color: #16a34a; font-size: 0.75rem; }

.map-select-col { display: flex; flex-direction: column; gap: 3px; }
.map-hint { font-size: 0.68rem; color: #94a3b8; }
:deep(.select-mapped .p-select) { border-color: #86efac !important; background: #f0fdf4 !important; }
:deep(.select-error .p-select) { border-color: #fca5a5 !important; }

.preview-section { background: #f8fafc; border-radius: 10px; padding: 1rem; border: 1px solid #e2e8f0; }
.preview-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.preview-title { font-size: 0.88rem; font-weight: 600; color: #334155; margin: 0; }
.preview-scroll { overflow-x: auto; }
.preview-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.preview-table th { background: #e2e8f0; padding: 6px 10px; text-align: left; font-weight: 700; white-space: nowrap; }
.preview-table td { padding: 5px 10px; border-bottom: 1px solid #f1f5f9; }
.cell-error { background: #fef2f2 !important; color: #dc2626; }
.preview-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; }
.error-msg { font-size: 0.82rem; color: #dc2626; display: flex; align-items: center; gap: 0.4rem; }

/* Result */
.import-result { padding: 1rem; }
.import-progress { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; text-align: center; }
.import-msg { font-size: 0.9rem; color: #64748b; }
.result-panel { display: flex; flex-direction: column; gap: 1rem; }
.result-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.result-kpi { background: white; border-radius: 10px; padding: 1rem; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.kpi-n { display: block; font-size: 1.8rem; font-weight: 700; }
.kpi-l { font-size: 0.75rem; color: #64748b; }
.errors-list { background: #fef2f2; border-radius: 8px; padding: 1rem; }
.errors-list h4 { font-size: 0.85rem; font-weight: 700; color: #dc2626; margin: 0 0 0.5rem; }
.error-row { display: flex; gap: 0.75rem; font-size: 0.8rem; padding: 3px 0; }
.error-idx { font-weight: 700; color: #dc2626; min-width: 50px; }
.error-txt { color: #7f1d1d; }
.result-actions { display: flex; gap: 0.75rem; }

/* Manual form */
.manual-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
.form-field { display: flex; flex-direction: column; gap: 0.4rem; }
.form-field label { font-size: 0.82rem; font-weight: 600; color: #475569; }
.form-actions { display: flex; justify-content: flex-end; }

/* Historial */
.table-header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
.font-mono { font-family: monospace; }

.completitud-bar { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-bottom: 2px; }
.comp-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }
.comp-ok   { background: #22c55e; }
.comp-warn { background: #f59e0b; }
.comp-label { font-size: 0.68rem; color: #64748b; }

.section-card { background: white; border-radius: 12px; padding: 1.4rem; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
.section-title { font-size: 1rem; font-weight: 600; color: #1e3a5f; margin: 0 0 1rem; display: flex; align-items: center; }
.mt-4 { margin-top: 1rem; }

/* SISI */
.sisi-banner {
  background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;
  padding: 1rem 1.2rem; display: flex; gap: 1rem; align-items: flex-start;
}
.sisi-totales {
  margin-top: 0.75rem; padding: 0.75rem 1rem;
  background: #f0f9ff; border-radius: 8px;
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.9rem; font-weight: 600; color: #334155;
}
</style>
