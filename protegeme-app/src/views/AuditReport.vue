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
              {{ item.responseBody?.mensaje || '—' }}
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

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { http } from '../api/http'

const baseURL = import.meta.env.VITE_API_MAINTENANCE_URL

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

function statusBadge(status: number) {
  if (status >= 200 && status < 300) return 'bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs'
  if (status >= 400) return 'bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs font-bold'
  return 'bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-xs'
}


onMounted(async () => {
  try {
    const res = await http.get(`${baseURL}/audit-report/operations`)
    availableOperations.value = res.data
  } catch { /* ignore */ }
  await loadReport(1)
})
</script>
