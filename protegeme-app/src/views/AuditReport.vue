<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">Reporte de Auditoría SICOV</h2>
      <button
        class="p-button p-button-outlined p-button-sm text-xs"
        @click="runMigrate"
        :disabled="migrating"
        title="Corregir registros históricos sin empresa asignada"
      >
        <i class="pi pi-database mr-1"></i>
        {{ migrating ? 'Migrando...' : 'Corregir registros históricos' }}
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-5 border-b border-gray-200">
      <button
        v-for="tab in tabs" :key="tab.key"
        @click="activeTab = tab.key"
        class="px-4 py-2 text-sm font-medium rounded-t transition-colors"
        :class="activeTab === tab.key
          ? 'bg-white border border-b-white border-gray-200 -mb-px text-blue-700'
          : 'text-gray-500 hover:text-gray-700'"
      >
        <i :class="tab.icon + ' mr-1'"></i>{{ tab.label }}
      </button>
    </div>

    <!-- ═══════════════════════════════════════════════════ -->
    <!-- TAB 2: ESTADÍSTICA RUNT (Req. 8) -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'runt'">
      <div class="flex flex-wrap gap-3 items-end mb-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Año</label>
          <select v-model="runtYear" class="p-inputtext p-component">
            <option v-for="y in runtYears" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Mes</label>
          <select v-model="runtMonth" class="p-inputtext p-component">
            <option v-for="m in 12" :key="m" :value="m">
              {{ new Date(2000, m-1, 1).toLocaleString('es-CO', { month: 'long' }) }}
            </option>
          </select>
        </div>
        <button class="p-button p-component" :disabled="runtLoading" @click="loadRuntStats">
          <i class="pi pi-chart-bar mr-2"></i>Generar
        </button>
        <button
          v-if="runtRows.length"
          class="p-button p-button-outlined p-button-success"
          @click="exportRuntCsv"
        >
          <i class="pi pi-download mr-2"></i>Exportar CSV
        </button>
      </div>

      <!-- Info box -->
      <div class="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800 mb-4">
        <i class="pi pi-info-circle mr-1"></i>
        <strong>Estadística RUNT (Req. 8):</strong> Muestra los 8 campos exigidos por la Superintendencia de Transporte,
        agrupados por empresa, módulo y mes. Generado desde la colección <code class="bg-blue-100 px-1 rounded">audits</code>.
      </div>

      <div v-if="runtLoading" class="text-center py-8 text-gray-500">
        <i class="pi pi-spin pi-spinner text-2xl"></i>
      </div>
      <div v-else-if="runtRows.length === 0" class="text-center py-8 text-gray-400">
        Seleccione año y mes, luego pulse Generar.
      </div>
      <div v-else class="overflow-x-auto rounded border">
        <table class="min-w-full text-sm">
          <thead class="bg-indigo-700 text-white">
            <tr>
              <th class="text-left px-3 py-2 whitespace-nowrap">NIT</th>
              <th class="text-left px-3 py-2 whitespace-nowrap">Razón Social</th>
              <th class="text-left px-3 py-2">Módulo</th>
              <th class="text-center px-3 py-2">Vigencia</th>
              <th class="text-center px-3 py-2">Mes</th>
              <th class="text-right px-3 py-2">N° Consultas</th>
              <th class="text-right px-3 py-2">Exitosas</th>
              <th class="text-right px-3 py-2">Fallidas</th>
              <th class="text-right px-3 py-2">T. Promedio</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in runtRows" :key="i"
              class="border-t"
              :class="i % 2 === 0 ? 'bg-white' : 'bg-gray-50'"
            >
              <td class="px-3 py-2 font-mono text-xs">{{ row.nit }}</td>
              <td class="px-3 py-2 text-xs font-medium">{{ row.razonSocial }}</td>
              <td class="px-3 py-2 text-xs">{{ row.modulo }}</td>
              <td class="px-3 py-2 text-center text-xs">{{ row.vigencia }}</td>
              <td class="px-3 py-2 text-center text-xs">{{ row.mes }}</td>
              <td class="px-3 py-2 text-right font-semibold">{{ row.totalConsultas }}</td>
              <td class="px-3 py-2 text-right text-green-700">{{ row.exitosas }}</td>
              <td class="px-3 py-2 text-right" :class="row.fallidas > 0 ? 'text-red-700 font-semibold' : 'text-gray-400'">{{ row.fallidas }}</td>
              <td class="px-3 py-2 text-right text-gray-500 text-xs">{{ row.tiempoPromedioMs }} ms</td>
            </tr>
          </tbody>
          <tfoot class="bg-gray-100 font-semibold">
            <tr>
              <td class="px-3 py-2 text-xs" colspan="5">TOTAL</td>
              <td class="px-3 py-2 text-right">{{ runtTotals.totalConsultas }}</td>
              <td class="px-3 py-2 text-right text-green-700">{{ runtTotals.exitosas }}</td>
              <td class="px-3 py-2 text-right" :class="runtTotals.fallidas > 0 ? 'text-red-700' : ''">{{ runtTotals.fallidas }}</td>
              <td class="px-3 py-2 text-right text-gray-500 text-xs">{{ runtTotals.avgMs }} ms</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════ -->
    <!-- TAB 3: DETALLE DE CONSUMO (Req. 7 Anexo Técnico) -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'req7'">
      <!-- Filtros -->
      <div class="flex flex-wrap gap-3 items-end mb-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Desde</label>
          <input type="date" v-model="req7Filters.from" class="p-inputtext p-component" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Hasta</label>
          <input type="date" v-model="req7Filters.to" class="p-inputtext p-component" />
        </div>
        <button class="p-button p-component" :disabled="req7Loading" @click="loadReq7(1)">
          <i class="pi pi-search mr-2"></i>Buscar
        </button>
        <button
          v-if="req7Total > 0"
          class="p-button p-button-outlined p-button-success"
          :disabled="req7Exporting"
          @click="exportReq7Excel"
        >
          <i class="pi pi-file-excel mr-2"></i>
          {{ req7Exporting ? 'Generando Excel...' : `Exportar Excel (${req7Total} filas)` }}
        </button>
      </div>

      <!-- Info box -->
      <div class="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800 mb-4">
        <i class="pi pi-info-circle mr-1"></i>
        <strong>Requisito 7 – Detalle de consumo de servicios web.</strong>
        Incluye: Código Operador, Tipo y N° Identificación del sujeto obligado, Módulo,
        Fecha, Parámetros de entrada y Resultado de cada llamada.
        <span v-if="req7CodigoOperador" class="ml-2 font-mono bg-amber-100 px-1 rounded">
          Cód. Operador: {{ req7CodigoOperador }}
        </span>
      </div>

      <!-- Tabla paginada -->
      <div v-if="req7Loading" class="text-center py-8 text-gray-500">
        <i class="pi pi-spin pi-spinner text-2xl"></i>
      </div>
      <div v-else-if="req7Items.length === 0" class="text-center py-8 text-gray-400">
        Seleccione un rango de fechas y pulse Buscar.
      </div>
      <div v-else class="overflow-x-auto rounded border">
        <table class="min-w-full text-xs">
          <thead class="bg-amber-700 text-white">
            <tr>
              <th class="px-3 py-2 text-left whitespace-nowrap">Cód. Operador</th>
              <th class="px-3 py-2 text-left whitespace-nowrap">Tipo ID</th>
              <th class="px-3 py-2 text-left whitespace-nowrap">N° Identificación</th>
              <th class="px-3 py-2 text-left whitespace-nowrap">Razón Social</th>
              <th class="px-3 py-2 text-left">Módulo</th>
              <th class="px-3 py-2 text-center whitespace-nowrap">Fecha</th>
              <th class="px-3 py-2 text-center">Resultado</th>
              <th class="px-3 py-2 text-left" style="max-width:220px">Parámetros Entrada</th>
              <th class="px-3 py-2 text-left" style="max-width:220px">Respuesta</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in req7Items" :key="i"
              class="border-t"
              :class="i % 2 === 0 ? 'bg-white' : 'bg-gray-50'"
            >
              <td class="px-3 py-1 font-mono">{{ row.codigoOperador }}</td>
              <td class="px-3 py-1">{{ row.tipoIdentificacion }}</td>
              <td class="px-3 py-1 font-mono">{{ row.numeroIdentificacion }}</td>
              <td class="px-3 py-1">{{ row.razonSocial }}</td>
              <td class="px-3 py-1">{{ row.modulo }}</td>
              <td class="px-3 py-1 text-center whitespace-nowrap">{{ row.fechaConsumo }}</td>
              <td class="px-3 py-1 text-center">
                <span :class="row.resultado === 'EXITOSO'
                  ? 'bg-green-100 text-green-700 px-2 py-0.5 rounded'
                  : 'bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold'">
                  {{ row.resultado }}
                </span>
              </td>
              <td class="px-3 py-1 text-gray-600 truncate" style="max-width:220px" :title="row.parametrosEntrada">
                {{ row.parametrosEntrada }}
              </td>
              <td class="px-3 py-1 text-gray-600 truncate" style="max-width:220px" :title="row.respuesta">
                {{ row.respuesta }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación Req7 -->
      <div v-if="req7Pages > 1" class="flex justify-center gap-2 mt-4">
        <button class="p-button p-button-outlined p-button-sm" :disabled="req7Page <= 1" @click="loadReq7(req7Page - 1)">
          <i class="pi pi-chevron-left"></i>
        </button>
        <span class="flex items-center text-sm px-2">
          Página {{ req7Page }} de {{ req7Pages }} ({{ req7Total }} registros)
        </span>
        <button class="p-button p-button-outlined p-button-sm" :disabled="req7Page >= req7Pages" @click="loadReq7(req7Page + 1)">
          <i class="pi pi-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════ -->
    <!-- TAB 1: AUDITORÍA DETALLADA (contenido original) -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'detail'">

    <!-- Filtros -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Desde</label>
        <input type="date" v-model="filters.from" class="p-inputtext p-component w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Hasta</label>
        <input type="date" v-model="filters.to" class="p-inputtext p-component w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Operación</label>
        <select v-model="filters.operation" class="p-inputtext p-component w-full">
          <option value="">Todas</option>
          <option v-for="op in availableOperations" :key="op" :value="op">{{ op }}</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Estado</label>
        <select v-model="filters.success" class="p-inputtext p-component w-full">
          <option value="">Todos</option>
          <option value="true">Exitosos</option>
          <option value="false">Con error</option>
        </select>
      </div>
      <div class="flex items-end">
        <button
          class="p-button p-component w-full"
          :disabled="loading"
          @click="loadReport(1)"
        >
          <i class="pi pi-search mr-2"></i>Buscar
        </button>
      </div>
    </div>

    <!-- Estadísticas -->
    <div v-if="stats" class="grid grid-cols-3 gap-3 mb-4">
      <div class="bg-green-50 border border-green-200 rounded p-3 text-center">
        <div class="text-2xl font-bold text-green-700">{{ stats.totalSuccess }}</div>
        <div class="text-sm text-green-600">Exitosos</div>
      </div>
      <div class="bg-red-50 border border-red-200 rounded p-3 text-center">
        <div class="text-2xl font-bold text-red-700">{{ stats.totalFailed }}</div>
        <div class="text-sm text-red-600">Con error</div>
      </div>
      <div class="bg-blue-50 border border-blue-200 rounded p-3 text-center">
        <div class="text-2xl font-bold text-blue-700">{{ stats.total }}</div>
        <div class="text-sm text-blue-600">Total</div>
      </div>
    </div>

    <!-- Resumen por operación -->
    <div v-if="stats && Object.keys(stats.byOperation).length" class="mb-4">
      <h3 class="font-semibold text-sm mb-2 text-gray-600">RESUMEN POR OPERACIÓN</h3>
      <div class="overflow-x-auto rounded border">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-100">
            <tr>
              <th class="text-left px-3 py-2">Operación</th>
              <th class="text-right px-3 py-2">Total</th>
              <th class="text-right px-3 py-2">Exitosos</th>
              <th class="text-right px-3 py-2">Errores</th>
              <th class="text-right px-3 py-2">T. promedio</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, op) in stats.byOperation"
              :key="op"
              class="border-t hover:bg-gray-50 cursor-pointer"
              @click="filters.operation = String(op); loadReport(1)"
            >
              <td class="px-3 py-2 font-mono text-xs">{{ op }}</td>
              <td class="px-3 py-2 text-right">{{ row.total }}</td>
              <td class="px-3 py-2 text-right text-green-700">{{ row.success }}</td>
              <td class="px-3 py-2 text-right" :class="row.failed > 0 ? 'text-red-700 font-semibold' : ''">
                {{ row.failed }}
              </td>
              <td class="px-3 py-2 text-right text-gray-500">{{ row.avgMs }} ms</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tabla de registros -->
    <div v-if="loading" class="text-center py-8 text-gray-500">
      <i class="pi pi-spin pi-spinner text-2xl"></i>
    </div>
    <div v-else-if="items.length === 0" class="text-center py-8 text-gray-400">
      No hay registros para los filtros seleccionados.
    </div>
    <div v-else class="overflow-x-auto rounded border">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-100">
          <tr>
            <th class="text-left px-3 py-2 whitespace-nowrap">Fecha</th>
            <th class="text-left px-3 py-2">Operación</th>
            <th class="text-center px-3 py-2">HTTP</th>
            <th class="text-center px-3 py-2">Estado</th>
            <th class="text-right px-3 py-2">Tiempo</th>
            <th class="text-left px-3 py-2">Mensaje Supertransporte</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item._id" class="border-t hover:bg-gray-50">
            <td class="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
              {{ formatDate(item.createdAt) }}
            </td>
            <td class="px-3 py-2 font-mono text-xs">{{ item.operation }}</td>
            <td class="px-3 py-2 text-center">
              <span :class="statusBadge(item.responseStatus)">{{ item.responseStatus }}</span>
            </td>
            <td class="px-3 py-2 text-center">
              <span :class="item.success
                ? 'bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs'
                : 'bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-semibold'">
                {{ item.success ? 'OK' : 'ERROR' }}
              </span>
            </td>
            <td class="px-3 py-2 text-right text-gray-500 text-xs">{{ item.durationMs }} ms</td>
            <td class="px-3 py-2 text-xs max-w-xs" :class="!item.success ? 'text-red-700' : 'text-gray-700'">
              {{ mensajeConPlaca(item) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paginación -->
    <div v-if="totalPages > 1" class="flex justify-center gap-2 mt-4">
      <button class="p-button p-button-outlined p-button-sm" :disabled="currentPage <= 1" @click="loadReport(currentPage - 1)">
        <i class="pi pi-chevron-left"></i>
      </button>
      <span class="flex items-center text-sm px-2">
        Página {{ currentPage }} de {{ totalPages }} ({{ total }} registros)
      </span>
      <button class="p-button p-button-outlined p-button-sm" :disabled="currentPage >= totalPages" @click="loadReport(currentPage + 1)">
        <i class="pi pi-chevron-right"></i>
      </button>
    </div>

    </div><!-- /tab detail -->

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { http } from '../api/http'
import { useAuthStore } from '../stores/authStore'
import * as XLSX from 'xlsx'

const baseURL = import.meta.env.VITE_API_MAINTENANCE_URL
const auth = useAuthStore()

// ── Tabs: RUNT y Req7 solo visibles al superadmin
const tabs = computed(() => [
  { key: 'detail', label: 'Auditoría detallada', icon: 'pi pi-list' },
  ...(auth.isSuperAdmin
    ? [
        { key: 'runt', label: 'Estadística RUNT (Req. 8)', icon: 'pi pi-chart-bar' },
        { key: 'req7', label: 'Detalle Consumo (Req. 7)', icon: 'pi pi-table' },
      ]
    : []),
])
const activeTab = ref<'detail' | 'runt' | 'req7'>('detail')

// ── Tab 1: auditoría detallada (código original)
const filters = ref({ from: '', to: '', operation: '', success: '' })
const loading        = ref(false)
const migrating      = ref(false)
const items          = ref<any[]>([])
const stats          = ref<any>(null)
const total          = ref(0)
const totalPages     = ref(0)
const currentPage    = ref(1)
const availableOperations = ref<string[]>([])

async function loadReport(page = 1) {
  loading.value = true
  currentPage.value = page
  try {
    const params: Record<string, string> = { page: String(page), limit: '50' }
    if (filters.value.from)           params.from      = filters.value.from
    if (filters.value.to)             params.to        = filters.value.to
    if (filters.value.operation)      params.operation = filters.value.operation
    if (filters.value.success !== '') params.success   = filters.value.success

    const res = await http.get(`${baseURL}/audit-report`, { params })
    items.value      = res.data.items
    stats.value      = res.data.stats
    total.value      = res.data.total
    totalPages.value = res.data.pages
  } finally {
    loading.value = false
  }
}

async function runMigrate() {
  migrating.value = true
  try {
    const res = await http.post(`${baseURL}/audit-report/migrate`, {})
    alert(`Migración completada: ${res.data.updated} registros actualizados.`)
    await loadReport(1)
  } catch { /* ignore */ }
  finally { migrating.value = false }
}

function formatDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

function mensajeConPlaca(item: any): string {
  const msg = item.responseBody?.mensaje || '—'
  if (item.operation === 'guardarMantenimiento' && item.requestPayload?.placa) {
    return `${msg} | Placa: ${item.requestPayload.placa}`
  }
  return msg
}

function statusBadge(status: number) {
  if (status >= 200 && status < 300) return 'bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs'
  if (status >= 400) return 'bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs font-bold'
  return 'bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-xs'
}

// ── Tab 2: estadística RUNT
const now = new Date()
const runtYear  = ref(now.getFullYear())
const runtMonth = ref(now.getMonth() + 1)
const runtYears = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i)
const runtLoading = ref(false)
const runtRows    = ref<any[]>([])

const runtTotals = computed(() => {
  const total   = runtRows.value.reduce((a, r) => a + r.totalConsultas, 0)
  const exitosas = runtRows.value.reduce((a, r) => a + r.exitosas, 0)
  const fallidas = runtRows.value.reduce((a, r) => a + r.fallidas, 0)
  const avgMs   = runtRows.value.length
    ? Math.round(runtRows.value.reduce((a, r) => a + r.tiempoPromedioMs, 0) / runtRows.value.length)
    : 0
  return { totalConsultas: total, exitosas, fallidas, avgMs }
})

async function loadRuntStats() {
  runtLoading.value = true
  try {
    const res = await http.get(`${baseURL}/audit-report/stats-runt`, {
      params: { year: runtYear.value, month: runtMonth.value },
    })
    runtRows.value = res.data
  } catch { runtRows.value = [] }
  finally { runtLoading.value = false }
}

function exportRuntCsv() {
  const headers = ['NIT','Razón Social','Módulo','Vigencia','Mes','N° Consultas','Exitosas','Fallidas','T. Promedio (ms)']
  const rows = runtRows.value.map(r => [
    r.nit, r.razonSocial, r.modulo, r.vigencia, r.mes,
    r.totalConsultas, r.exitosas, r.fallidas, r.tiempoPromedioMs,
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `estadistica-runt-${runtYear.value}-${String(runtMonth.value).padStart(2,'0')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Tab 3: Requisito 7 – detalle por llamada ─────────────────────────────────
const req7Filters   = ref({ from: '', to: '' })
const req7Loading   = ref(false)
const req7Exporting = ref(false)
const req7Items     = ref<any[]>([])
const req7Page      = ref(1)
const req7Pages     = ref(0)
const req7Total     = ref(0)
const req7CodigoOperador = ref<string | null>(null)

async function loadReq7(page = 1) {
  req7Loading.value = true
  req7Page.value = page
  try {
    const params: Record<string, string> = { page: String(page), limit: '50' }
    if (req7Filters.value.from) params.from = req7Filters.value.from
    if (req7Filters.value.to)   params.to   = req7Filters.value.to

    const res = await http.get(`${baseURL}/audit-report/req7`, { params })
    req7Items.value           = res.data.items
    req7Total.value           = res.data.total
    req7Pages.value           = res.data.pages
    req7CodigoOperador.value  = res.data.codigoOperador
  } catch { req7Items.value = [] }
  finally { req7Loading.value = false }
}

async function exportReq7Excel() {
  req7Exporting.value = true
  try {
    const params: Record<string, string> = { forExport: 'true' }
    if (req7Filters.value.from) params.from = req7Filters.value.from
    if (req7Filters.value.to)   params.to   = req7Filters.value.to

    const res = await http.get(`${baseURL}/audit-report/req7`, { params })
    const rows: any[] = res.data.items

    // Encabezados según Requisito 7
    const headers = [
      'Código Operador',
      'Tipo Identificación',
      'Número de Identificación',
      'Razón Social',
      'Módulo',
      'Fecha Consumo (DD/MM/YYYY)',
      'Resultado',
      'Parámetros Entrada',
      'Respuesta',
    ]

    const data = rows.map(r => [
      r.codigoOperador,
      r.tipoIdentificacion,
      r.numeroIdentificacion,
      r.razonSocial,
      r.modulo,
      r.fechaConsumo,
      r.resultado,
      r.parametrosEntrada,
      r.respuesta,
    ])

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data])

    // Anchos de columna orientativos
    ws['!cols'] = [
      { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 30 },
      { wch: 20 }, { wch: 22 }, { wch: 10 },
      { wch: 50 }, { wch: 50 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Req7-DetalleConsumo')

    const now = new Date()
    const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`
    const suffix = req7Filters.value.from && req7Filters.value.to
      ? `_${req7Filters.value.from}_${req7Filters.value.to}`
      : `_${stamp}`

    XLSX.writeFile(wb, `requisito7-consumo${suffix}.xlsx`)
  } catch (e) {
    console.error('Error exportando Req7:', e)
    alert('Error al generar el archivo Excel.')
  } finally {
    req7Exporting.value = false
  }
}

onMounted(async () => {
  try {
    const res = await http.get(`${baseURL}/audit-report/operations`)
    availableOperations.value = res.data
  } catch { /* ignore */ }
  await loadReport(1)
})
</script>
