<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'

import { useAuthStore } from '../stores/authStore'
import { useDashboardStore } from '../stores/DashboardStore'
import KpiCard from '../components/dashboard/KpiCard.vue'
import { MaintenanceserviceApi } from '../api/maintenance.service'

const auth = useAuthStore()
const dash = useDashboardStore()

// ====== Stats para las cards de abajo ======
const counts = reactive({
  enlistments: null as number | null,
  maintTotal: null as number | null, // preventivos + correctivos
})

function getTotal(res: any) {
  return typeof res?.data?.total === 'number'
    ? res.data.total
    : Array.isArray(res?.data)
    ? res.data.length
    : Array.isArray(res?.data?.items)
    ? res.data.items.length
    : 0
}

async function loadStats() {
  const q = { estado: true, page: 1, numero_items: 1 }
  try {
    const [elist, prev, corr] = await Promise.all([
      // Si tu cliente tiene estos métodos específicos, los usa.
      // Si no, cae al listMaintenances por tipoId.
      MaintenanceserviceApi?.listEnlistments?.(q) ??
        MaintenanceserviceApi.listMaintenances({ ...q, tipoId: 3 }),
      MaintenanceserviceApi?.listPreventives?.(q) ??
        MaintenanceserviceApi.listMaintenances({ ...q, tipoId: 1 }),
      MaintenanceserviceApi?.listCorrectives?.(q) ??
        MaintenanceserviceApi.listMaintenances({ ...q, tipoId: 2 }),
    ])

    const enlist = getTotal(elist)
    const prevTot = getTotal(prev)
    const corrTot = getTotal(corr)

    counts.enlistments = enlist
    counts.maintTotal = prevTot + corrTot
  } catch (e) {
    counts.enlistments = 0
    counts.maintTotal = 0
  }
}

onMounted(async () => {
  await dash.load()
  await loadStats()
})

// ====== utilitarios (mantengo tu lógica) ======
function daysLeft(dateStr?: string) {
  if (!dateStr) return 9_999
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000)
}
function expirySeverity(v: any) {
  const min = Math.min(
    daysLeft(v?.soat?.fechaVencimiento),
    daysLeft(v?.rtm?.fechaVencimiento),
    daysLeft(v?.to?.fechaVencimiento)
  )
  if (min < 0) return 'danger'
  if (min <= 30) return 'warning'
  return 'success'
}
</script>

<template>
  <div class="grid">
    <!-- Encabezado -->
    <div class="col-12">
      <h2 class="m-0">Hola, {{ auth.profileName }} 👋</h2>
      <p class="text-color-secondary">Resumen general del sistema</p>
    </div>

    <!-- KPIs -->
    <div class="col-12 md:col-4">
      <KpiCard
        icon="pi pi-car"
        label="Vehículos Activos"
        :value="dash.kpis.vehiclesActive"
        chipBg="#E6F0FF"
        chipColor="#1D4ED8"
      />
    </div>
    <div class="col-12 md:col-4">
      <KpiCard
        icon="pi pi-id-card"
        label="Conductores"
        :value="dash.kpis.driversActive"
        chipBg="#E8F8F3"
        chipColor="#10B981"
      />
    </div>
    <div class="col-12 md:col-4">
      <KpiCard
        icon="pi pi-bell"
        label="Novedades recientes"
        :value="dash.kpis.incidentsOpen"
        chipBg="#F3E8FF"
        chipColor="#7C3AED"
      />
    </div>

    <!-- (Opcional) Documentos por vencer - lo dejo comentado como en tu archivo
    <div class="col-12 md:col-7">
      <Card class="dt-clean">
        <template #title>Documentos por vencer (30 días)</template>
        <template #content>
          <DataTable :value="dash.docsExpiring" size="small" scrollable scrollHeight="260px">
            <Column field="placa" header="Placa" frozen />
            <Column header="SOAT">
              <template #body="{ data }">
                <Tag
                  :value="data?.soat?.fechaVencimiento || '—'"
                  :severity="expirySeverity(data)"
                />
              </template>
            </Column>
            <Column header="RTM">
              <template #body="{ data }">
                <Tag
                  :value="data?.rtm?.fechaVencimiento || '—'"
                  :severity="expirySeverity(data)"
                />
              </template>
            </Column>
            <Column header="TO">
              <template #body="{ data }">
                <Tag
                  :value="data?.to?.fechaVencimiento || '—'"
                  :severity="expirySeverity(data)"
                />
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </div>
    -->

    <!-- Actividad reciente -->
    <div class="col-12">
      <Card>
        <template #title>Actividad reciente</template>
        <template #content>
          <ul class="list-none p-0 m-0">
            <li v-for="(it, i) in dash.recent" :key="i" class="activity-item">
              <i class="pi pi-check-circle text-green-600 mr-2"></i>
              <div class="flex flex-column">
                <span class="font-medium">{{ it?.tipo || it?.title || 'Evento' }}</span>
                <small class="text-color-secondary">
                  {{ it?.descripcion || it?.description || '—' }}
                </small>
              </div>
            </li>
            <li v-if="!dash.recent?.length" class="text-color-secondary">
              Sin actividad reciente.
            </li>
          </ul>
        </template>
      </Card>
    </div>

    <!-- ===== Stats centradas, respetando tu diseño ===== -->
    <div class="col-12">
      <div class="grid">
        <!-- Alistamientos activos -->
        <div class="col-12 md:col-6 flex justify-content-center">
          <Card class="w-full stat-card">
            <template #content>
              <div class="stat-wrap">
                <i class="pi pi-clipboard-check stat-icon"></i>
                <div class="text-500 mb-1">Alistamientos activos</div>
                <div class="stat-number">
                  {{ counts.enlistments == null ? '—' : counts.enlistments }}
                </div>
              </div>
            </template>
          </Card>
        </div>

        <!-- Mantenimientos totales -->
        <div class="col-12 md:col-6 flex justify-content-center">
          <Card class="w-full stat-card">
            <template #content>
              <div class="stat-wrap">
                <i class="pi pi-wrench stat-icon"></i>
                <div class="text-500 mb-1" style="color: black;">Mantenimientos totales</div>
                <div class="stat-number">
                  {{ counts.maintTotal == null ? '—' : counts.maintTotal }}
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ====== Cards ====== */
.dt-clean :deep(.p-datatable-header) {
  background: var(--surface-card);
  border: 0;
}
.dt-clean :deep(.p-datatable-thead > tr > th) {
  background: var(--surface-card);
  border-top: 0;
}
.dt-clean :deep(.p-datatable-tbody > tr) {
  background: var(--surface-card);
}
.dt-clean :deep(.p-paginator) {
  border: 0;
  background: var(--surface-card);
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.45rem 0;
}

/* ====== Stats centradas (sin charts) ====== */
.stat-card {
  width: 100%;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  color: black;
}

.stat-wrap {
  height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
    color: black;
}

.stat-icon {
  font-size: 1.4rem;
  color: var(--primary-color);
  margin-bottom: 0.25rem;
}

.stat-number {
  font-weight: 800;
  font-size: 44px;
  line-height: 1;
  color: var(--text-color, #1f2937);
}
</style>
