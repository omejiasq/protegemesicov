<template>
  <div class="document-alerts-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">
          <i class="pi pi-bell" style="color: #f97316" />
          Alertas de Documentos
        </h2>
        <p class="page-subtitle">Documentos físicos vencidos o próximos a vencer detectados por la app móvil</p>
      </div>
      <div class="header-actions">
        <Button
          v-if="unread > 0"
          label="Gestionar todas"
          icon="pi pi-check-square"
          severity="warning"
          outlined
          @click="acknowledgeAll"
          :loading="ackAllLoading"
        />
        <Button label="Actualizar" icon="pi pi-refresh" outlined @click="load" :loading="loading" />
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-row">
      <div class="kpi-card kpi-red" @click="setFilter('alertStatus', 'expired')">
        <div class="kpi-icon"><i class="pi pi-times-circle" /></div>
        <div class="kpi-content">
          <div class="kpi-value">{{ summary.byStatus?.expired ?? 0 }}</div>
          <div class="kpi-label">Vencidos</div>
        </div>
      </div>
      <div class="kpi-card kpi-orange" @click="setFilter('alertStatus', 'near_expiry')">
        <div class="kpi-icon"><i class="pi pi-exclamation-triangle" /></div>
        <div class="kpi-content">
          <div class="kpi-value">{{ summary.byStatus?.near_expiry ?? 0 }}</div>
          <div class="kpi-label">Próx. a vencer</div>
        </div>
      </div>
      <div class="kpi-card kpi-blue">
        <div class="kpi-icon"><i class="pi pi-bell" /></div>
        <div class="kpi-content">
          <div class="kpi-value">{{ summary.unread ?? 0 }}</div>
          <div class="kpi-label">Sin gestionar</div>
        </div>
      </div>
      <div class="kpi-card kpi-gray">
        <div class="kpi-icon"><i class="pi pi-list" /></div>
        <div class="kpi-content">
          <div class="kpi-value">{{ summary.total ?? 0 }}</div>
          <div class="kpi-label">Total alertas</div>
        </div>
      </div>
    </div>

    <!-- Por tipo de documento -->
    <div class="type-summary">
      <div
        v-for="dt in docTypes"
        :key="dt.id"
        class="type-chip"
        :class="{ active: filters.documentType === dt.id }"
        @click="toggleDocType(dt.id)"
      >
        <i :class="dt.icon" />
        {{ dt.label }}
        <span class="type-count">{{ summary.byType?.[dt.id] ?? 0 }}</span>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters-bar">
      <Select
        v-model="filters.alertStatus"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        placeholder="Estado"
        show-clear
        class="filter-select"
      />
      <Select
        v-model="filters.acknowledged"
        :options="ackOptions"
        option-label="label"
        option-value="value"
        placeholder="Gestión"
        show-clear
        class="filter-select"
      />
      <DatePicker v-model="filters.from" placeholder="Desde" date-format="dd/mm/yy" show-button-bar class="filter-date" />
      <DatePicker v-model="filters.to"   placeholder="Hasta" date-format="dd/mm/yy" show-button-bar class="filter-date" />
      <Button icon="pi pi-filter-slash" outlined @click="clearFilters" tooltip="Limpiar filtros" />
    </div>

    <!-- Tabla -->
    <DataTable
      :value="filtered"
      :loading="loading"
      :rows="20"
      paginator
      sort-field="createdAt"
      :sort-order="-1"
      responsive-layout="scroll"
      class="alerts-table"
      empty-message="Sin alertas con los filtros actuales"
    >
      <Column field="createdAt" header="Fecha" sortable style="min-width:130px">
        <template #body="{ data }">
          <span class="date-text">{{ fmtDate(data.createdAt) }}</span>
          <div class="date-time">{{ fmtTime(data.createdAt) }}</div>
        </template>
      </Column>

      <Column field="documentType" header="Documento" style="min-width:160px">
        <template #body="{ data }">
          <div class="doc-type-cell">
            <i :class="docTypeIcon(data.documentType)" />
            {{ docTypeLabel(data.documentType) }}
          </div>
        </template>
      </Column>

      <Column field="alertStatus" header="Estado" style="min-width:140px">
        <template #body="{ data }">
          <Tag
            :value="statusLabel(data.alertStatus)"
            :severity="statusSeverity(data.alertStatus)"
          />
        </template>
      </Column>

      <Column field="expiryDate" header="Vencimiento" sortable style="min-width:120px">
        <template #body="{ data }">
          <span v-if="data.expiryDate">{{ fmtDate(data.expiryDate) }}</span>
          <span v-else class="no-data">—</span>
        </template>
      </Column>

      <Column field="daysOverdue" header="Días vencido" sortable style="min-width:110px">
        <template #body="{ data }">
          <span v-if="data.alertStatus === 'expired'" class="days-overdue red">
            {{ data.daysOverdue }} días
          </span>
          <span v-else-if="data.alertStatus === 'near_expiry'" class="days-overdue orange">
            -{{ data.daysOverdue }} días
          </span>
          <span v-else class="no-data">—</span>
        </template>
      </Column>

      <Column field="conductorName" header="Conductor" style="min-width:160px">
        <template #body="{ data }">
          <div v-if="data.conductorName" class="person-cell">
            <i class="pi pi-user" />
            {{ data.conductorName }}
          </div>
          <div v-if="data.conductorId" class="person-id">CC {{ data.conductorId }}</div>
          <span v-if="!data.conductorName && !data.conductorId" class="no-data">—</span>
        </template>
      </Column>

      <Column field="vehiclePlaca" header="Placa" style="min-width:100px">
        <template #body="{ data }">
          <span v-if="data.vehiclePlaca" class="placa-badge">{{ data.vehiclePlaca }}</span>
          <span v-else class="no-data">—</span>
        </template>
      </Column>

      <Column field="cardAuthenticity" header="Autenticidad" style="min-width:145px">
        <template #body="{ data }">
          <div class="auth-cell" :class="authClass(data.cardAuthenticity)">
            <i :class="authIcon(data.cardAuthenticity)" />
            {{ authLabel(data.cardAuthenticity) }}
          </div>
        </template>
      </Column>

      <Column field="acknowledged" header="Gestión" style="min-width:120px">
        <template #body="{ data }">
          <div v-if="data.acknowledged" class="ack-done">
            <i class="pi pi-check" />
            Gestionado
          </div>
          <Button
            v-else
            label="Gestionar"
            icon="pi pi-check"
            size="small"
            severity="warning"
            outlined
            @click="acknowledge(data._id)"
            :loading="ackLoading[data._id]"
          />
        </template>
      </Column>
    </DataTable>

    <!-- Dialog de detalle con texto OCR -->
    <Dialog v-model:visible="detailVisible" header="Detalle de alerta" :style="{ width: '600px' }" modal>
      <template v-if="detailItem">
        <div class="detail-section">
          <strong>Texto OCR capturado:</strong>
          <pre class="ocr-text">{{ detailItem.rawText || '(sin texto)' }}</pre>
        </div>
        <div class="detail-section">
          <strong>Categorías:</strong> {{ (detailItem.categorias ?? []).join(', ') || '—' }}
        </div>
        <div class="detail-section">
          <strong>Escaneado por:</strong> {{ detailItem.scannedBy || detailItem.scannedByUserId || '—' }}
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../../stores/authStore'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'

const auth  = useAuthStore()
const toast = useToast()

const API = import.meta.env.VITE_API_MAINTENANCE ?? 'http://localhost:4004'

// ── Estado ────────────────────────────────────────────────────────────────
const alerts      = ref<any[]>([])
const summary     = ref<any>({})
const loading     = ref(false)
const ackAllLoading = ref(false)
const ackLoading  = reactive<Record<string, boolean>>({})
const unread      = ref(0)
const detailVisible = ref(false)
const detailItem  = ref<any>(null)

const filters = reactive({
  alertStatus: null as string | null,
  documentType: null as string | null,
  acknowledged: null as boolean | null,
  from: null as Date | null,
  to:   null as Date | null,
})

// ── Opciones ──────────────────────────────────────────────────────────────
const statusOptions = [
  { label: 'Vencido',          value: 'expired' },
  { label: 'Próximo a vencer', value: 'near_expiry' },
]
const ackOptions = [
  { label: 'Sin gestionar', value: false },
  { label: 'Gestionados',   value: true  },
]
const docTypes = [
  { id: 'licencia_conduccion', label: 'Licencia Conducción', icon: 'pi pi-id-card' },
  { id: 'tarjeta_operacion',   label: 'Tarjeta Operación',   icon: 'pi pi-truck' },
  { id: 'tarjeta_propiedad',   label: 'Tarjeta Propiedad',   icon: 'pi pi-car' },
]

// ── Computed ──────────────────────────────────────────────────────────────
const filtered = computed(() => {
  return alerts.value.filter(a => {
    if (filters.alertStatus  && a.alertStatus  !== filters.alertStatus)  return false
    if (filters.documentType && a.documentType !== filters.documentType) return false
    if (filters.acknowledged !== null && a.acknowledged !== filters.acknowledged) return false
    if (filters.from && new Date(a.createdAt) < filters.from) return false
    if (filters.to   && new Date(a.createdAt) > filters.to)   return false
    return true
  })
})

// ── Carga ─────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const [alertsRes, summaryRes] = await Promise.all([
      fetch(`${API}/maintenance/document-alerts?limit=500`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      }),
      fetch(`${API}/maintenance/document-alerts/summary`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      }),
    ])
    alerts.value  = await alertsRes.json()
    summary.value = await summaryRes.json()
    unread.value  = summary.value.unread ?? 0
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las alertas', life: 4000 })
  } finally {
    loading.value = false
  }
}

// ── Gestionar alerta individual ───────────────────────────────────────────
async function acknowledge(id: string) {
  ackLoading[id] = true
  try {
    await fetch(`${API}/maintenance/document-alerts/${id}/acknowledge`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    })
    const alert = alerts.value.find(a => a._id === id)
    if (alert) { alert.acknowledged = true; unread.value = Math.max(0, unread.value - 1) }
    summary.value.unread = Math.max(0, (summary.value.unread ?? 1) - 1)
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo gestionar la alerta', life: 3000 })
  } finally {
    ackLoading[id] = false
  }
}

// ── Gestionar todas ───────────────────────────────────────────────────────
async function acknowledgeAll() {
  ackAllLoading.value = true
  try {
    await fetch(`${API}/maintenance/document-alerts/acknowledge-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    })
    alerts.value.forEach(a => { a.acknowledged = true })
    unread.value = 0; summary.value.unread = 0
    toast.add({ severity: 'success', summary: 'Listo', detail: 'Todas las alertas han sido gestionadas', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Error al gestionar alertas', life: 3000 })
  } finally {
    ackAllLoading.value = false
  }
}

// ── Filtros ───────────────────────────────────────────────────────────────
function setFilter(key: string, val: string) {
  (filters as any)[key] = (filters as any)[key] === val ? null : val
}
function toggleDocType(id: string) {
  filters.documentType = filters.documentType === id ? null : id
}
function clearFilters() {
  filters.alertStatus = null; filters.documentType = null
  filters.acknowledged = null; filters.from = null; filters.to = null
}

// ── Helpers de display ────────────────────────────────────────────────────
function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtTime(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function docTypeLabel(t: string) {
  return { licencia_conduccion: 'Lic. Conducción', tarjeta_operacion: 'T. Operación', tarjeta_propiedad: 'T. Propiedad' }[t] ?? t
}
function docTypeIcon(t: string) {
  return { licencia_conduccion: 'pi pi-id-card', tarjeta_operacion: 'pi pi-truck', tarjeta_propiedad: 'pi pi-car' }[t] ?? 'pi pi-file'
}
function statusLabel(s: string) {
  return { expired: 'VENCIDO', near_expiry: 'PRÓX. A VENCER' }[s] ?? s
}
function statusSeverity(s: string) {
  return { expired: 'danger', near_expiry: 'warn' }[s] ?? 'secondary'
}
function authLabel(a: string) {
  return { likely_physical: 'Físico', uncertain: 'Incierto', likely_digital: 'Digital/Copia' }[a] ?? a
}
function authIcon(a: string) {
  return { likely_physical: 'pi pi-credit-card', uncertain: 'pi pi-question-circle', likely_digital: 'pi pi-desktop' }[a] ?? 'pi pi-question'
}
function authClass(a: string) {
  return { likely_physical: 'auth-physical', uncertain: 'auth-uncertain', likely_digital: 'auth-digital' }[a] ?? ''
}

onMounted(load)
</script>

<style scoped>
.document-alerts-page { padding: 1.5rem; max-width: 1400px; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.page-title { font-size: 1.5rem; font-weight: 700; color: var(--text-color); display: flex; align-items: center; gap: 0.5rem; margin: 0; }
.page-subtitle { color: var(--text-color-secondary); font-size: 0.85rem; margin: 0.25rem 0 0; }
.header-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

/* KPIs */
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
@media (max-width: 768px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }
.kpi-card {
  display: flex; align-items: center; gap: 1rem;
  padding: 1.2rem; border-radius: 12px; cursor: pointer;
  background: var(--surface-card); border: 1px solid var(--surface-border);
  transition: transform 0.15s; box-shadow: 0 2px 6px rgba(0,0,0,0.06);
}
.kpi-card:hover { transform: translateY(-2px); }
.kpi-icon { font-size: 1.8rem; opacity: 0.85; }
.kpi-value { font-size: 2rem; font-weight: 800; line-height: 1; }
.kpi-label { font-size: 0.8rem; color: var(--text-color-secondary); margin-top: 2px; }
.kpi-red    { border-left: 4px solid #ef4444; }  .kpi-red    .kpi-icon, .kpi-red    .kpi-value { color: #ef4444; }
.kpi-orange { border-left: 4px solid #f97316; }  .kpi-orange .kpi-icon, .kpi-orange .kpi-value { color: #f97316; }
.kpi-blue   { border-left: 4px solid #3b82f6; }  .kpi-blue   .kpi-icon, .kpi-blue   .kpi-value { color: #3b82f6; }
.kpi-gray   { border-left: 4px solid #6b7280; }  .kpi-gray   .kpi-icon, .kpi-gray   .kpi-value { color: #6b7280; }

/* Type chips */
.type-summary { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
.type-chip {
  display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.9rem;
  border-radius: 20px; border: 1px solid var(--surface-border);
  background: var(--surface-card); cursor: pointer; font-size: 0.82rem;
  color: var(--text-color-secondary); transition: all 0.15s;
}
.type-chip:hover  { border-color: #3b82f6; color: #3b82f6; }
.type-chip.active { background: #3b82f6; color: white; border-color: #3b82f6; }
.type-count { background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 10px; font-weight: 700; }

/* Filters */
.filters-bar { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; align-items: center; }
.filter-select { min-width: 150px; }
.filter-date   { min-width: 140px; }

/* Table */
.alerts-table { font-size: 0.85rem; }
.date-text { font-weight: 600; }
.date-time { font-size: 0.75rem; color: var(--text-color-secondary); }
.doc-type-cell { display: flex; align-items: center; gap: 0.4rem; font-weight: 500; }
.person-cell { display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; }
.person-id { font-size: 0.75rem; color: var(--text-color-secondary); margin-top: 2px; }
.no-data { color: var(--text-color-secondary); }
.placa-badge { font-family: monospace; font-weight: 700; background: #1e3a5f; color: #60a5fa; padding: 2px 8px; border-radius: 4px; }
.days-overdue { font-weight: 700; }
.days-overdue.red    { color: #ef4444; }
.days-overdue.orange { color: #f97316; }

.auth-cell { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 500; }
.auth-physical  { color: #22c55e; }
.auth-uncertain { color: #f97316; }
.auth-digital   { color: #ef4444; }

.ack-done { display: flex; align-items: center; gap: 0.3rem; color: #22c55e; font-size: 0.82rem; font-weight: 500; }

/* Detail dialog */
.detail-section { margin-bottom: 1rem; }
.ocr-text { background: #1e2d3d; color: #9ca3af; padding: 0.75rem; border-radius: 8px; font-size: 0.75rem; white-space: pre-wrap; max-height: 300px; overflow-y: auto; }
</style>
