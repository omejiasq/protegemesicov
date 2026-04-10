<template>
  <div class="datasync-view">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Integración y Carga de Datos</h2>
        <span class="page-subtitle">Importe vehículos y conductores desde Excel/CSV, configure su API o programe sincronizaciones automáticas</span>
      </div>
    </div>

    <!-- Tabs principales -->
    <TabView v-model:activeIndex="tabActivo" class="datasync-tabs">

      <!-- ══════════════════ TAB 1: IMPORTACIÓN MANUAL ══════════════════ -->
      <TabPanel header="📂  Importar desde archivo">
        <div class="tab-body">

          <!-- Selector de entidad -->
          <div class="entity-selector">
            <button class="entity-btn" :class="{ active: entidad === 'vehicles' }" @click="entidad = 'vehicles'; resetImport()">
              <i class="pi pi-car"></i> Vehículos
            </button>
            <button class="entity-btn" :class="{ active: entidad === 'drivers' }" @click="entidad = 'drivers'; resetImport()">
              <i class="pi pi-users"></i> Conductores
            </button>
          </div>

          <!-- Plantilla descargable -->
          <div class="template-bar">
            <i class="pi pi-info-circle text-blue-500"></i>
            <span>¿Primera vez? Descargue la plantilla de Excel con las columnas recomendadas:</span>
            <Button :label="`Plantilla ${entidad === 'vehicles' ? 'Vehículos' : 'Conductores'} (.xlsx)`"
              icon="pi pi-download" text size="small" @click="descargarPlantilla" />
          </div>

          <!-- Zona de carga de archivo -->
          <div v-if="paso === 0" class="drop-zone" :class="{ 'drop-active': dragging }"
            @dragover.prevent="dragging = true" @dragleave="dragging = false"
            @drop.prevent="onDrop" @click="fileInput?.click()">
            <i class="pi pi-upload drop-icon"></i>
            <span class="drop-title">Arrastre su archivo aquí o haga clic para seleccionar</span>
            <span class="drop-sub">Excel (.xlsx, .xls) o CSV · Máximo 20 MB</span>
            <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="onFileSelect" />
          </div>

          <!-- Paso 2: Mapeo de columnas -->
          <div v-if="paso === 1" class="mapping-section">
            <div class="mapping-header">
              <div>
                <span class="mapping-file">📄 {{ archivoNombre }}</span>
                <span class="mapping-info">{{ filaCols.length }} columnas detectadas · {{ filaTotalRows }} filas de datos</span>
              </div>
              <Button label="Cambiar archivo" icon="pi pi-times" text size="small" @click="resetImport" />
            </div>

            <h4 class="mapping-title">Mapeo de columnas — relacione las columnas de su archivo con los campos de ProtegeMe</h4>

            <div class="mapping-grid">
              <div v-for="campo in camposEntidad" :key="campo.key" class="mapping-row"
                :class="{ 'mapping-required': campo.required, 'mapping-mapped': !!mapeo[campo.key] }">
                <div class="campo-info">
                  <span class="campo-name">{{ campo.label }}</span>
                  <span v-if="campo.required" class="badge-req">Obligatorio</span>
                  <span class="campo-desc">{{ campo.desc }}</span>
                </div>
                <i class="pi pi-arrow-right map-arrow"></i>
                <Select v-model="mapeo[campo.key]" :options="['— Sin mapear —', ...filaCols]"
                  class="w-full map-select"
                  :class="{ 'select-mapped': !!mapeo[campo.key] && mapeo[campo.key] !== '— Sin mapear —' }"
                  @change="actualizarPreview" />
              </div>
            </div>

            <!-- Preview tabla -->
            <div v-if="previewRows.length" class="preview-section">
              <h4 class="preview-title">Preview — primeras {{ previewRows.length }} filas con el mapeo actual</h4>
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
                <Button label="Continuar e importar" icon="pi pi-arrow-right" iconPos="right"
                  :disabled="erroresMapeo.length > 0 || !mapeoValido"
                  @click="paso = 2; ejecutarImport()" />
              </div>
            </div>
          </div>

          <!-- Paso 3: Progreso y resultados -->
          <div v-if="paso === 2" class="import-result">
            <div v-if="importando" class="import-progress">
              <ProgressBar mode="indeterminate" style="height:6px" />
              <span class="import-msg">Importando {{ filaTotalRows }} registros...</span>
            </div>
            <div v-else-if="importResult" class="result-panel">
              <div class="result-kpis">
                <div class="result-kpi kpi-green">
                  <span class="kpi-n">{{ importResult.created }}</span>
                  <span class="kpi-l">Creados / Actualizados</span>
                </div>
                <div class="result-kpi kpi-red">
                  <span class="kpi-n">{{ importResult.errors }}</span>
                  <span class="kpi-l">Errores</span>
                </div>
                <div class="result-kpi kpi-blue">
                  <span class="kpi-n">{{ importResult.total }}</span>
                  <span class="kpi-l">Total procesados</span>
                </div>
              </div>

              <div v-if="importResult.errors > 0" class="errors-list">
                <h4>Registros con error:</h4>
                <div v-for="r in importResult.results.filter((r: any) => r.status === 'error').slice(0, 20)" :key="r.index"
                  class="error-row">
                  <span class="error-idx">Fila {{ r.index + 2 }}</span>
                  <span class="error-txt">{{ r.error }}</span>
                </div>
              </div>

              <div class="result-actions">
                <Button label="Nueva importación" icon="pi pi-refresh" outlined @click="resetImport" />
                <Button label="Ver vehículos" icon="pi pi-car" @click="$router.push('/vehicles')"
                  v-if="entidad === 'vehicles'" />
                <Button label="Ver conductores" icon="pi pi-users" @click="$router.push('/drivers')"
                  v-if="entidad === 'drivers'" />
              </div>
            </div>
          </div>

        </div>
      </TabPanel>

      <!-- ══════════════════ TAB 2: API DE INTEGRACIÓN ══════════════════ -->
      <TabPanel header="🔑  API de Integración">
        <div class="tab-body">

          <div class="api-intro">
            <h3>API Keys — Conecte su sistema con ProtegeMe</h3>
            <p>Genere una API Key y úsela para enviar vehículos y conductores desde su ERP, TMS o cualquier sistema externo. El sistema hace <strong>upsert automático</strong>: si el registro ya existe lo actualiza, si no existe lo crea.</p>
          </div>

          <!-- Lista de API Keys -->
          <div class="section-card">
            <div class="card-header-row">
              <h4 class="card-title">API Keys activas</h4>
              <Button label="Generar nueva API Key" icon="pi pi-plus" size="small" @click="nuevaKeyVisible = true" />
            </div>

            <div v-if="!apiKeys.length" class="empty-state">
              <i class="pi pi-key text-4xl text-slate-300"></i>
              <p>No hay API Keys generadas aún</p>
            </div>

            <div v-for="key in apiKeys" :key="key.id" class="key-card">
              <div class="key-info">
                <span class="key-name">{{ key.name }}</span>
                <Tag :value="key.active ? 'Activa' : 'Revocada'" :severity="key.active ? 'success' : 'danger'" />
                <span class="key-date">Creada: {{ formatFecha(key.createdAt) }}</span>
                <span v-if="key.lastUsedAt" class="key-date">Último uso: {{ formatFecha(key.lastUsedAt) }}</span>
              </div>
              <Button icon="pi pi-trash" text severity="danger" size="small"
                @click="revocarKey(key.id)" v-tooltip.top="'Revocar'" />
            </div>
          </div>

          <!-- Key recién creada -->
          <div v-if="nuevaKeyCreada" class="key-reveal">
            <i class="pi pi-exclamation-triangle key-warn-icon"></i>
            <div>
              <strong>Guarde esta clave ahora — no se volverá a mostrar:</strong>
              <div class="key-value-row">
                <code class="key-value">{{ nuevaKeyCreada }}</code>
                <Button icon="pi pi-copy" text size="small" @click="copiarKey" v-tooltip.top="'Copiar'" />
              </div>
            </div>
          </div>

          <!-- Documentación de la API -->
          <div class="section-card api-docs">
            <h4 class="card-title">Referencia de endpoints</h4>

            <div class="endpoint-block">
              <span class="method post">POST</span>
              <code class="endpoint-url">{{ baseUrl }}/external-api/vehicles</code>
              <span class="endpoint-desc">Crear o actualizar 1 vehículo (upsert por placa)</span>
            </div>
            <pre class="code-block">{{vehicleExample}}</pre>

            <div class="endpoint-block mt-3">
              <span class="method post">POST</span>
              <code class="endpoint-url">{{ baseUrl }}/external-api/vehicles/batch</code>
              <span class="endpoint-desc">Hasta 500 vehículos en una sola llamada</span>
            </div>

            <div class="endpoint-block mt-3">
              <span class="method post">POST</span>
              <code class="endpoint-url">{{ baseUrl }}/external-api/drivers</code>
              <span class="endpoint-desc">Crear o actualizar 1 conductor (upsert por documento)</span>
            </div>
            <pre class="code-block">{{driverExample}}</pre>

            <div class="endpoint-block mt-3">
              <span class="method post">POST</span>
              <code class="endpoint-url">{{ baseUrl }}/external-api/drivers/batch</code>
              <span class="endpoint-desc">Hasta 500 conductores en una sola llamada</span>
            </div>

            <div class="curl-example">
              <span class="curl-label">Ejemplo cURL — Vehículo:</span>
              <pre class="code-block">{{curlExample}}</pre>
              <Button label="Copiar cURL" icon="pi pi-copy" text size="small" @click="copiarCurl" />
            </div>
          </div>

        </div>
      </TabPanel>

      <!-- ══════════════════ TAB 3: SINCRONIZACIÓN PROGRAMADA ══════════════════ -->
      <TabPanel header="🔄  Sincronización Programada">
        <div class="tab-body">

          <div class="api-intro">
            <h3>Sincronizaciones Automáticas</h3>
            <p>Configure un endpoint de su sistema y ProtegeMe consultará periódicamente los datos actualizados. Ideal para mantener sincronizados vehículos y conductores sin intervención manual.</p>
          </div>

          <div class="section-card">
            <div class="card-header-row">
              <h4 class="card-title">Sincronizaciones configuradas</h4>
              <Button label="Nueva sincronización" icon="pi pi-plus" size="small" @click="nuevaSyncVisible = true; resetNuevaSync()" />
            </div>

            <div v-if="!syncs.length" class="empty-state">
              <i class="pi pi-sync text-4xl text-slate-300"></i>
              <p>No hay sincronizaciones configuradas</p>
            </div>

            <div v-for="sync in syncs" :key="sync._id" class="sync-card">
              <div class="sync-main">
                <div class="sync-status-dot" :class="sync.enabled ? 'dot-green' : 'dot-gray'"></div>
                <div class="sync-info">
                  <span class="sync-name">{{ sync.name }}</span>
                  <span class="sync-meta">
                    <Tag :value="sync.entityType" severity="secondary" class="text-xs" />
                    <span class="sync-cron">{{ sync.cronLabel || sync.cronExpression }}</span>
                    <span v-if="sync.lastRunAt" class="sync-last">
                      Última ejecución: {{ formatFecha(sync.lastRunAt) }} ·
                      <Tag :value="sync.lastRunStatus" :severity="sync.lastRunStatus === 'success' ? 'success' : 'danger'" class="text-xs" />
                    </span>
                  </span>
                  <span class="sync-url text-xs text-slate-400">{{ sync.sourceUrl }}</span>
                  <span v-if="sync.lastRunSummary" class="sync-summary">{{ sync.lastRunSummary }}</span>
                </div>
              </div>
              <div class="sync-actions">
                <Button icon="pi pi-play" text size="small" :loading="runningSync === sync._id"
                  @click="ejecutarSync(sync._id)" v-tooltip.top="'Ejecutar ahora'" />
                <ToggleButton v-model="sync.enabled" onIcon="pi pi-check" offIcon="pi pi-times"
                  onLabel="" offLabel="" size="small" @change="toggleSync(sync)" />
                <Button icon="pi pi-trash" text severity="danger" size="small" @click="eliminarSync(sync._id)" />
              </div>
            </div>
          </div>

          <!-- Referencia de expresiones cron -->
          <div class="section-card">
            <h4 class="card-title">Referencia — Expresiones de frecuencia</h4>
            <div class="cron-table">
              <div v-for="c in cronExamples" :key="c.expr" class="cron-row">
                <code class="cron-expr">{{ c.expr }}</code>
                <span class="cron-desc">{{ c.desc }}</span>
                <Button :label="'Usar'" text size="small" @click="usarCron(c)" />
              </div>
            </div>
          </div>

        </div>
      </TabPanel>

    </TabView>

    <!-- Modal: Nueva API Key -->
    <Dialog v-model:visible="nuevaKeyVisible" header="Generar nueva API Key" :style="{ width: '420px' }" modal>
      <div class="nueva-form">
        <div class="form-field">
          <label>Nombre descriptivo *</label>
          <InputText v-model="nuevaKey.name" class="w-full" placeholder="Ej: Integración ERP SAP" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="nuevaKeyVisible = false" />
        <Button label="Generar clave" icon="pi pi-key" @click="generarApiKey" :disabled="!nuevaKey.name" />
      </template>
    </Dialog>

    <!-- Modal: Nueva sincronización -->
    <Dialog v-model:visible="nuevaSyncVisible" header="Nueva sincronización automática" :style="{ width: '560px' }" modal>
      <div class="nueva-form">
        <div class="form-field">
          <label>Nombre *</label>
          <InputText v-model="nuevaSync.name" class="w-full" placeholder="Ej: Sync vehículos ERP - diario" />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Entidad *</label>
            <Select v-model="nuevaSync.entityType" :options="['vehicles','drivers','both']" class="w-full" />
          </div>
          <div class="form-field">
            <label>Frecuencia *</label>
            <Select v-model="nuevaSync.cronExpression" :options="cronOpciones" optionLabel="label" optionValue="expr" class="w-full"
              @change="nuevaSync.cronLabel = cronOpciones.find(c => c.expr === nuevaSync.cronExpression)?.label ?? ''" />
          </div>
        </div>
        <div class="form-field">
          <label>URL del endpoint externo *</label>
          <InputText v-model="nuevaSync.sourceUrl" class="w-full" placeholder="https://mi-erp.com/api/vehicles" />
        </div>
        <div class="form-field">
          <label>Tipo de autenticación</label>
          <Select v-model="nuevaSync.authType" :options="['none','bearer','api_key','basic']" class="w-full" />
        </div>
        <div v-if="nuevaSync.authType !== 'none'" class="form-field">
          <label>{{ nuevaSync.authType === 'api_key' ? 'Nombre del header' : 'Token / Credenciales' }}</label>
          <InputText v-if="nuevaSync.authType === 'api_key'" v-model="nuevaSync.authHeader" class="w-full" placeholder="X-Api-Key" />
          <InputText v-model="nuevaSync.authValue" class="w-full" :placeholder="authPlaceholder" />
        </div>
        <Message v-if="nuevaSync.sourceUrl" severity="info" class="text-xs">
          Su endpoint debe devolver un array JSON de {{ nuevaSync.entityType === 'vehicles' ? 'vehículos' : nuevaSync.entityType === 'drivers' ? 'conductores' : 'registros' }} con los campos requeridos (placa para vehículos, numeroIdentificacion para conductores).
        </Message>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="nuevaSyncVisible = false" />
        <Button label="Guardar" icon="pi pi-check" @click="guardarSync"
          :disabled="!nuevaSync.name || !nuevaSync.sourceUrl || !nuevaSync.entityType" />
      </template>
    </Dialog>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import Button from 'primevue/button'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import ProgressBar from 'primevue/progressbar'
import ToggleButton from 'primevue/togglebutton'
import Message from 'primevue/message'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { http } from '../../api/http'

const toast = useToast()
const BASE = import.meta.env.VITE_API_MAINTENANCE_URL as string
const baseUrl = BASE

// ═══════════════════ TAB 1: IMPORTAR ═══════════════════
const tabActivo   = ref(0)
const entidad     = ref<'vehicles' | 'drivers'>('vehicles')
const paso        = ref(0)
const dragging    = ref(false)
const fileInput   = ref<HTMLInputElement | null>(null)
const archivoNombre = ref('')
const filaCols    = ref<string[]>([])
const filaTotalRows = ref(0)
const filaRawData = ref<any[]>([])
const mapeo       = ref<Record<string, string>>({})
const previewRows = ref<any[]>([])
const importando  = ref(false)
const importResult = ref<any>(null)

const camposVehiculos = [
  { key: 'placa',      label: 'Placa',        required: true,  desc: 'Identificador único. Si existe: actualiza. Si no: crea.' },
  { key: 'clase',      label: 'Clase',        required: false, desc: 'Ej: CAMION, BUS, BUSETA' },
  { key: 'marca',      label: 'Marca',        required: false, desc: 'Ej: CHEVROLET, KENWORTH' },
  { key: 'Linea',      label: 'Línea/Modelo', required: false, desc: 'Ej: N300, T800' },
  { key: 'modelo',     label: 'Año modelo',   required: false, desc: 'Ej: 2019' },
  { key: 'color',      label: 'Color',        required: false, desc: 'Ej: BLANCO' },
  { key: 'combustible',label: 'Combustible',  required: false, desc: 'Ej: DIESEL, GASOLINA, GAS' },
  { key: 'no_interno', label: 'N.° interno',  required: false, desc: 'Código interno de la empresa' },
  { key: 'motor',      label: 'N.° motor',    required: false, desc: '' },
  { key: 'no_chasis',  label: 'N.° chasis',   required: false, desc: '' },
  { key: 'no_soat',    label: 'N.° SOAT',     required: false, desc: '' },
  { key: 'no_rtm',     label: 'N.° RTM',      required: false, desc: '' },
  { key: 'expiration_soat', label: 'Vencimiento SOAT', required: false, desc: 'Formato: YYYY-MM-DD' },
  { key: 'expiration_rtm',  label: 'Vencimiento RTM',  required: false, desc: 'Formato: YYYY-MM-DD' },
]
const camposConductores = [
  { key: 'numeroIdentificacion',         label: 'Número documento',   required: true,  desc: 'Cédula o pasaporte. Identificador único.' },
  { key: 'tipoIdentificacionPrincipal',  label: 'Tipo documento',     required: true,  desc: 'CC, CE, PA, NIT' },
  { key: 'primerNombrePrincipal',        label: 'Primer nombre',      required: true,  desc: '' },
  { key: 'segundoNombrePrincipal',       label: 'Segundo nombre',     required: false, desc: '' },
  { key: 'primerApellidoPrincipal',      label: 'Primer apellido',    required: true,  desc: '' },
  { key: 'segundoApellidoPrincipal',     label: 'Segundo apellido',   required: false, desc: '' },
  { key: 'licenciaConduccion',           label: 'N.° licencia',       required: false, desc: '' },
  { key: 'licenciaVencimiento',          label: 'Venc. licencia',     required: false, desc: 'Formato: YYYY-MM-DD' },
]

const camposEntidad = computed(() => entidad.value === 'vehicles' ? camposVehiculos : camposConductores)
const camposMapeados = computed(() => camposEntidad.value.filter(c => mapeo.value[c.key] && mapeo.value[c.key] !== '— Sin mapear —'))
const mapeoValido = computed(() => {
  const reqKey = entidad.value === 'vehicles' ? 'placa' : 'numeroIdentificacion'
  return !!mapeo.value[reqKey] && mapeo.value[reqKey] !== '— Sin mapear —'
})
const erroresMapeo = computed(() => {
  const errors: string[] = []
  const reqKey = entidad.value === 'vehicles' ? 'placa' : 'numeroIdentificacion'
  const reqLabel = entidad.value === 'vehicles' ? 'Placa' : 'Número documento'
  if (!mapeo.value[reqKey] || mapeo.value[reqKey] === '— Sin mapear —')
    errors.push(`El campo "${reqLabel}" es obligatorio y debe estar mapeado.`)
  return errors
})

function resetImport() {
  paso.value = 0; filaCols.value = []; filaRawData.value = []
  mapeo.value = {}; previewRows.value = []; importResult.value = null
  archivoNombre.value = ''; filaTotalRows.value = 0
  if (fileInput.value) fileInput.value.value = ''
}

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
    if (!rows.length) { toast.add({ severity: 'warn', summary: 'Archivo vacío', detail: 'El archivo no contiene datos', life: 3000 }); return }
    filaRawData.value = rows
    filaTotalRows.value = rows.length
    filaCols.value = Object.keys(rows[0])
    // Auto-mapeo inteligente
    autoMapear()
    actualizarPreview()
    paso.value = 1
  }
  reader.readAsArrayBuffer(file)
}

const autoMapeoVehiculos: Record<string, string[]> = {
  placa: ['placa','PLACA','Placa','plate','matricula'],
  clase: ['clase','CLASE','tipo','TIPO','Clase'],
  marca: ['marca','MARCA','Marca','brand'],
  Linea: ['linea','LINEA','Linea','modelo','line'],
  modelo:['año','AÑO','anio','year','Modelo','modelo'],
  color: ['color','COLOR','Color'],
  combustible:['combustible','COMBUSTIBLE','fuel'],
  no_interno:['interno','INTERNO','no_interno','codigo'],
  motor:['motor','MOTOR','Motor'],
  no_soat:['soat','SOAT','no_soat','poliza'],
  no_rtm: ['rtm','RTM','tecno','TECNO'],
}
const autoMapeoDrivers: Record<string, string[]> = {
  numeroIdentificacion:       ['cedula','CEDULA','documento','DOCUMENTO','CC','numero_doc','id'],
  tipoIdentificacionPrincipal:['tipo_doc','TIPO_DOC','tipo','TIPO','tipo_id'],
  primerNombrePrincipal:      ['nombre','NOMBRE','primer_nombre','firstname'],
  segundoNombrePrincipal:     ['segundo_nombre','nombre2'],
  primerApellidoPrincipal:    ['apellido','APELLIDO','primer_apellido','lastname'],
  segundoApellidoPrincipal:   ['segundo_apellido','apellido2'],
  licenciaConduccion:         ['licencia','LICENCIA','no_licencia'],
}

function autoMapear() {
  const autoMap = entidad.value === 'vehicles' ? autoMapeoVehiculos : autoMapeoDrivers
  const nuevoMapeo: Record<string, string> = {}
  for (const [campo, posibles] of Object.entries(autoMap)) {
    const encontrado = filaCols.value.find(col =>
      posibles.some(p => col.toLowerCase() === p.toLowerCase())
    )
    nuevoMapeo[campo] = encontrado ?? ''
  }
  mapeo.value = nuevoMapeo
}

function actualizarPreview() {
  const rows = filaRawData.value.slice(0, 5)
  previewRows.value = rows.map(row => {
    const out: Record<string, string> = {}
    for (const campo of camposEntidad.value) {
      const col = mapeo.value[campo.key]
      out[campo.key] = (col && col !== '— Sin mapear —') ? String(row[col] ?? '') : ''
    }
    return out
  })
}

async function ejecutarImport() {
  importando.value = true
  importResult.value = null

  // Construir mapeo limpio (sin vacíos)
  const mappingLimpio: Record<string, string> = {}
  for (const [k, v] of Object.entries(mapeo.value)) {
    if (v && v !== '— Sin mapear —') mappingLimpio[k] = v
  }

  // Subir archivo al backend
  const formData = new FormData()
  // Reconstituimos el archivo desde los datos raw como xlsx
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(filaRawData.value)
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  formData.append('file', blob, archivoNombre.value || 'import.xlsx')
  formData.append('mapping', JSON.stringify(mappingLimpio))
  formData.append('startRow', '2')

  try {
    const endpoint = entidad.value === 'vehicles'
      ? `${BASE}/external-api/import/vehicles`
      : `${BASE}/external-api/import/drivers`
    const res = await http.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })
    importResult.value = res.data
    toast.add({ severity: 'success', summary: 'Importación completada', detail: `${res.data.created} registros procesados`, life: 4000 })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error en importación', detail: err?.response?.data?.message ?? err.message, life: 5000 })
    paso.value = 1
  } finally {
    importando.value = false
  }
}

function descargarPlantilla() {
  const campos = camposEntidad.value
  const headers = Object.fromEntries(campos.map(c => [c.key, c.label + (c.required ? ' *' : '')]))
  const ejemplo = entidad.value === 'vehicles'
    ? { placa: 'ABC123', clase: 'CAMION', marca: 'KENWORTH', Linea: 'T800', modelo: '2021', color: 'BLANCO', combustible: 'DIESEL', no_interno: '001' }
    : { numeroIdentificacion: '80123456', tipoIdentificacionPrincipal: 'CC', primerNombrePrincipal: 'Juan', primerApellidoPrincipal: 'Pérez' }
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet([headers, ejemplo])
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
  XLSX.writeFile(wb, `Plantilla_${entidad.value}_ProtegeMe.xlsx`)
}

// ═══════════════════ TAB 2: API KEYS ═══════════════════
const apiKeys       = ref<any[]>([])
const nuevaKeyVisible = ref(false)
const nuevaKeyCreada  = ref('')
const nuevaKey = ref({ name: '' })

onMounted(() => { cargarApiKeys(); cargarSyncs() })

async function cargarApiKeys() {
  try { apiKeys.value = (await http.get(`${BASE}/external-api/keys`)).data } catch {}
}
async function generarApiKey() {
  try {
    const res = await http.post(`${BASE}/external-api/keys`, { name: nuevaKey.value.name })
    nuevaKeyCreada.value = res.data.apiKey
    nuevaKeyVisible.value = false
    nuevaKey.value = { name: '' }
    await cargarApiKeys()
    toast.add({ severity: 'success', summary: 'API Key generada', detail: 'Guarde la clave ahora — no se volverá a mostrar', life: 6000 })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.message ?? err.message, life: 4000 })
  }
}
async function revocarKey(id: string) {
  try {
    await http.delete(`${BASE}/external-api/keys/${id}`)
    await cargarApiKeys()
    toast.add({ severity: 'warn', summary: 'API Key revocada', detail: 'La clave ya no funcionará', life: 3000 })
  } catch {}
}
function copiarKey() {
  navigator.clipboard.writeText(nuevaKeyCreada.value)
  toast.add({ severity: 'info', summary: 'Copiado', life: 2000 })
}
function copiarCurl() {
  navigator.clipboard.writeText(curlExample)
  toast.add({ severity: 'info', summary: 'cURL copiado', life: 2000 })
}

const vehicleExample = `{
  "placa": "ABC123",
  "clase": "CAMION",
  "marca": "KENWORTH",
  "Linea": "T800",
  "modelo": "2021",
  "color": "BLANCO",
  "combustible": "DIESEL"
}`
const driverExample = `{
  "numeroIdentificacion": "80123456",
  "tipoIdentificacionPrincipal": "CC",
  "primerNombrePrincipal": "Juan",
  "primerApellidoPrincipal": "Pérez",
  "licenciaConduccion": "80123456"
}`
const curlExample = `curl -X POST ${BASE}/external-api/vehicles \\
  -H "X-Api-Key: su_api_key_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{"placa":"ABC123","clase":"CAMION","marca":"KENWORTH"}'`

// ═══════════════════ TAB 3: SYNCS ═══════════════════
const syncs           = ref<any[]>([])
const nuevaSyncVisible = ref(false)
const runningSync     = ref<string | null>(null)
const nuevaSync = ref<any>({})

const cronOpciones = [
  { label: 'Cada hora',           expr: '0 * * * *' },
  { label: 'Cada 6 horas',        expr: '0 */6 * * *' },
  { label: 'Cada 12 horas',       expr: '0 */12 * * *' },
  { label: 'Diario a las 6am',    expr: '0 6 * * *' },
  { label: 'Diario a las 12pm',   expr: '0 12 * * *' },
  { label: 'Diario a las 11pm',   expr: '0 23 * * *' },
  { label: 'Lunes a viernes 7am', expr: '0 7 * * 1-5' },
  { label: 'Semanal (lunes 6am)', expr: '0 6 * * 1' },
]
const cronExamples = cronOpciones

const authPlaceholder = computed(() => {
  if (nuevaSync.value.authType === 'bearer')  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  if (nuevaSync.value.authType === 'api_key') return 'su_api_key_aqui'
  if (nuevaSync.value.authType === 'basic')   return 'usuario:contraseña'
  return ''
})

function resetNuevaSync() {
  nuevaSync.value = { name: '', entityType: 'vehicles', cronExpression: '0 6 * * *', cronLabel: 'Diario a las 6am', sourceUrl: '', authType: 'none', authValue: '', authHeader: 'X-Api-Key', enabled: true }
}

async function cargarSyncs() {
  try { syncs.value = (await http.get(`${BASE}/external-api/sync-schedules`)).data } catch {}
}
async function guardarSync() {
  try {
    await http.post(`${BASE}/external-api/sync-schedules`, nuevaSync.value)
    nuevaSyncVisible.value = false
    await cargarSyncs()
    toast.add({ severity: 'success', summary: 'Sincronización guardada', life: 3000 })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.message ?? err.message, life: 4000 })
  }
}
async function eliminarSync(id: string) {
  try {
    await http.delete(`${BASE}/external-api/sync-schedules/${id}`)
    await cargarSyncs()
    toast.add({ severity: 'warn', summary: 'Sincronización eliminada', life: 3000 })
  } catch {}
}
async function ejecutarSync(id: string) {
  runningSync.value = id
  try {
    const res = await http.post(`${BASE}/external-api/sync-schedules/${id}/run`)
    toast.add({ severity: 'success', summary: 'Sincronización completada', detail: res.data.summary, life: 4000 })
    await cargarSyncs()
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Error en sync', detail: err?.response?.data?.message ?? err.message, life: 4000 })
  } finally {
    runningSync.value = null
  }
}
async function toggleSync(sync: any) {
  try {
    await http.patch(`${BASE}/external-api/sync-schedules/${sync._id}`, { enabled: sync.enabled })
  } catch {}
}
function usarCron(c: { expr: string; label: string }) {
  nuevaSync.value.cronExpression = c.expr
  nuevaSync.value.cronLabel = c.label
}

function formatFecha(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.datasync-view { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
.page-title { font-size: 1.4rem; font-weight: 700; color: #1e3a5f; margin: 0; }
.page-subtitle { font-size: 0.85rem; color: #64748b; }
:deep(.datasync-tabs .p-tabview-panels) { padding: 0 !important; }
.tab-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

/* Entity selector */
.entity-selector { display: flex; gap: 0.75rem; }
.entity-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.4rem; border: 2px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; font-size: 0.9rem; color: #475569; font-weight: 600; transition: all 0.15s; }
.entity-btn.active { border-color: #1e3a5f; background: #1e3a5f; color: white; }

/* Template bar */
.template-bar { display: flex; align-items: center; gap: 0.75rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.6rem 1rem; font-size: 0.85rem; color: #1e40af; }

/* Drop zone */
.drop-zone { border: 2px dashed #cbd5e1; border-radius: 12px; padding: 3rem; text-align: center; cursor: pointer; transition: all 0.2s; background: #f8fafc; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.drop-zone:hover, .drop-active { border-color: #3b82f6; background: #eff6ff; }
.drop-icon { font-size: 2.5rem; color: #94a3b8; }
.drop-title { font-size: 1rem; font-weight: 600; color: #334155; }
.drop-sub { font-size: 0.82rem; color: #94a3b8; }
.hidden { display: none; }

/* Mapping */
.mapping-header { display: flex; justify-content: space-between; align-items: flex-start; }
.mapping-file { display: block; font-size: 0.9rem; font-weight: 600; color: #1e293b; }
.mapping-info { display: block; font-size: 0.8rem; color: #64748b; }
.mapping-title { font-size: 0.95rem; font-weight: 600; color: #1e3a5f; margin: 0.5rem 0; }
.mapping-grid { display: flex; flex-direction: column; gap: 0.5rem; max-height: 380px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; }
.mapping-row { display: grid; grid-template-columns: 1fr auto 1fr; gap: 0.75rem; align-items: center; padding: 0.5rem 0.75rem; border-radius: 6px; background: #f8fafc; }
.mapping-required { border-left: 3px solid #f59e0b; }
.mapping-mapped { background: #f0fdf4; }
.campo-info { display: flex; flex-direction: column; gap: 2px; }
.campo-name { font-size: 0.85rem; font-weight: 600; color: #334155; }
.campo-desc { font-size: 0.72rem; color: #94a3b8; }
.badge-req { font-size: 0.65rem; background: #fef3c7; color: #92400e; padding: 1px 6px; border-radius: 8px; width: fit-content; }
.map-arrow { color: #94a3b8; }
:deep(.map-select.select-mapped .p-select) { border-color: #22c55e !important; }

/* Preview */
.preview-section { margin-top: 1rem; }
.preview-title { font-size: 0.9rem; font-weight: 600; color: #1e3a5f; margin-bottom: 0.75rem; }
.preview-scroll { overflow-x: auto; }
.preview-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.preview-table th { background: #1e3a5f; color: white; padding: 0.5rem 0.75rem; text-align: left; white-space: nowrap; }
.preview-table td { padding: 0.4rem 0.75rem; border-bottom: 1px solid #f1f5f9; }
.preview-table tr:nth-child(even) td { background: #f8fafc; }
.cell-error { background: #fff1f2 !important; color: #ef4444; }
.preview-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; }
.error-msg { font-size: 0.82rem; color: #ef4444; display: flex; align-items: center; gap: 0.4rem; }

/* Import result */
.import-progress { display: flex; flex-direction: column; gap: 0.75rem; align-items: center; padding: 2rem; }
.import-msg { font-size: 0.9rem; color: #64748b; }
.result-panel { display: flex; flex-direction: column; gap: 1.5rem; }
.result-kpis { display: flex; gap: 1rem; }
.result-kpi { flex: 1; border-radius: 10px; padding: 1.2rem; text-align: center; }
.kpi-green { background: #dcfce7; }
.kpi-red   { background: #fee2e2; }
.kpi-blue  { background: #dbeafe; }
.kpi-n { display: block; font-size: 2rem; font-weight: 900; color: #1e293b; }
.kpi-l { font-size: 0.8rem; color: #64748b; }
.errors-list { background: #fff1f2; border-radius: 8px; padding: 1rem; max-height: 200px; overflow-y: auto; }
.errors-list h4 { margin: 0 0 0.75rem; font-size: 0.9rem; color: #991b1b; }
.error-row { display: flex; gap: 0.75rem; font-size: 0.82rem; padding: 0.3rem 0; border-bottom: 1px solid #fecaca; }
.error-idx { font-weight: 700; color: #ef4444; white-space: nowrap; }
.result-actions { display: flex; gap: 0.75rem; }

/* API Keys */
.api-intro h3 { font-size: 1.1rem; font-weight: 700; color: #1e3a5f; margin: 0 0 0.4rem; }
.api-intro p  { font-size: 0.88rem; color: #475569; margin: 0; }
.section-card { background: white; border-radius: 12px; padding: 1.4rem; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
.card-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.card-title { font-size: 1rem; font-weight: 600; color: #1e3a5f; margin: 0; }
.empty-state { text-align: center; padding: 2rem; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.key-card { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid #f1f5f9; }
.key-info { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.key-name { font-weight: 600; font-size: 0.9rem; color: #1e293b; }
.key-date { font-size: 0.78rem; color: #94a3b8; }
.key-reveal { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 10px; padding: 1rem 1.2rem; display: flex; gap: 1rem; align-items: flex-start; }
.key-warn-icon { font-size: 1.5rem; color: #f59e0b; flex-shrink: 0; }
.key-value-row { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.4rem; }
.key-value { background: #1e293b; color: #4ade80; padding: 0.4rem 0.75rem; border-radius: 6px; font-size: 0.82rem; word-break: break-all; }
.api-docs { display: flex; flex-direction: column; gap: 0.75rem; }
.endpoint-block { display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; }
.method { padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
.method.post { background: #dcfce7; color: #166534; }
.endpoint-url { font-size: 0.82rem; font-weight: 600; color: #1e293b; word-break: break-all; }
.endpoint-desc { font-size: 0.78rem; color: #64748b; }
.code-block { background: #1e293b; color: #7dd3fc; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.78rem; overflow-x: auto; margin: 0.25rem 0; white-space: pre; }
.curl-example { display: flex; flex-direction: column; gap: 0.3rem; }
.curl-label { font-size: 0.82rem; font-weight: 600; color: #475569; }
.mt-3 { margin-top: 0.75rem; }

/* Sync */
.sync-card { display: flex; justify-content: space-between; align-items: flex-start; padding: 0.9rem 0; border-bottom: 1px solid #f1f5f9; }
.sync-main { display: flex; gap: 0.75rem; flex: 1; }
.sync-status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
.dot-green { background: #22c55e; }
.dot-gray  { background: #94a3b8; }
.sync-info { display: flex; flex-direction: column; gap: 3px; }
.sync-name { font-size: 0.9rem; font-weight: 600; color: #1e293b; }
.sync-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-size: 0.8rem; color: #64748b; }
.sync-cron { background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-family: monospace; font-size: 0.75rem; }
.sync-last { font-size: 0.78rem; color: #94a3b8; }
.sync-url { display: block; }
.sync-summary { font-size: 0.78rem; color: #64748b; }
.sync-actions { display: flex; align-items: center; gap: 0.25rem; }
.cron-table { display: flex; flex-direction: column; gap: 0.4rem; }
.cron-row { display: flex; align-items: center; gap: 1rem; padding: 0.4rem 0; border-bottom: 1px solid #f1f5f9; }
.cron-expr { background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; min-width: 120px; }
.cron-desc { flex: 1; font-size: 0.85rem; color: #475569; }

/* Forms */
.nueva-form { display: flex; flex-direction: column; gap: 1rem; }
.form-field { display: flex; flex-direction: column; gap: 0.35rem; }
.form-field label { font-size: 0.85rem; font-weight: 600; color: #475569; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
</style>
