<script setup lang="ts">
import { onMounted } from 'vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'

import { useAuthStore } from '../stores/authStore'
import { useDashboardStore } from '../stores/DashboardStore'
import KpiCard from '../components/dashboard/KpiCard.vue'

const auth = useAuthStore()
const dash = useDashboardStore()

console.log(auth.profileName)

onMounted(() => dash.load())

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

    <div class="col-12">
      <h2 class="m-0">Hola, {{ auth.profileName }} 👋</h2>
      <p class="text-color-secondary">Resumen general del sistema</p>
    </div>

    <div class="col-12 md:col-3">
      <KpiCard
        icon="pi pi-car"
        label="Vehículos Activos"
        :value="dash.kpis.vehiclesActive"
        chipBg="#E6F0FF"
        chipColor="#1D4ED8"
      />
    </div>
    <div class="col-12 md:col-3">
      <KpiCard
        icon="pi pi-id-card"
        label="Conductores"
        :value="dash.kpis.driversActive"
        chipBg="#E8F8F3"
        chipColor="#10B981"
      />
    </div>
    <div class="col-12 md:col-3">
      <KpiCard
        icon="pi pi-exclamation-triangle"
        label="Docs por vencer (30d)"
        :value="dash.kpis.documentsExpiring"
        chipBg="#FEF3C7"
        chipColor="#D97706"
      />
    </div>
    <div class="col-12 md:col-3">
      <KpiCard
        icon="pi pi-bell"
        label="Incidentes recientes"
        :value="dash.kpis.incidentsOpen"
        chipBg="#F3E8FF"
        chipColor="#7C3AED"
      />
    </div>

    <div class="col-12 md:col-7">
      <Card>
        <template #title>Documentos por vencer (30 días)</template>
        <template #content>
          <DataTable
            :value="dash.expiringList"
            :loading="dash.loading"
            paginator
            :rows="5"
            :rowsPerPageOptions="[5,10,20]"
            responsiveLayout="scroll"
            class="dt-clean"
          >
            <Column field="placa" header="Placa" sortable />
            <Column header="SOAT / RTM / TO">
              <template #body="{ data }">
                <div class="flex gap-2 flex-wrap">
                  <Tag :value="data.soat?.fechaVencimiento || 'SOAT — s/d'" :severity="expirySeverity(data)" />
                  <Tag :value="data.rtm?.fechaVencimiento || 'RTM — s/d'" :severity="expirySeverity(data)" />
                  <Tag :value="data.to?.fechaVencimiento  || 'TO — s/d'"  :severity="expirySeverity(data)" />
                </div>
              </template>
            </Column>
            <Column header="Estado">
              <template #body="{ data }">
                <Tag :value="data.estado ? 'ACTIVO' : 'INACTIVO'"
                     :severity="data.estado ? 'success' : 'danger'" />
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </div>

    <div class="col-12 md:col-5">
      <Card>
        <template #title>Actividad reciente</template>
        <template #content>
          <ul class="list-none p-0 m-0">
            <li v-for="(it, i) in dash.recent" :key="i" class="activity-item">
              <i class="pi pi-check-circle text-green-600 mr-2"></i>
              <div class="flex flex-column">
                <span class="font-medium">{{ it?.tipo || it?.title || 'Evento' }}</span>
                <small class="text-color-secondary">{{ it?.descripcion || it?.description || '—' }}</small>
              </div>
            </li>
            <li v-if="!dash.recent?.length" class="text-color-secondary">Sin actividad reciente.</li>
          </ul>
        </template>
      </Card>
    </div>

    <div class="col-12 md:col-6">
      <Card>
        <template #title>Vehículos por Estado</template>
        <template #content>
          <div class="placeholder-chart">
            <i class="pi pi-chart-bar"></i>
            <span>Gráfico de vehículos por estado (en desarrollo)</span>
          </div>
        </template>
      </Card>
    </div>
    <div class="col-12 md:col-6">
      <Card>
        <template #title>Conductores Activos</template>
        <template #content>
          <div class="placeholder-chart">
            <i class="pi pi-chart-line"></i>
            <span>Estadísticas de conductores (en desarrollo)</span>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.placeholder-chart{
  height: 180px;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  color: var(--text-color-secondary);
}
.placeholder-chart i{ font-size: 2rem; margin-bottom:.5rem; }

.dt-clean :deep(.p-datatable-header){ background: var(--surface-card); border: 0; }
.dt-clean :deep(.p-datatable-thead > tr > th){ background: var(--surface-card); border-top: 0; }
.dt-clean :deep(.p-datatable-tbody > tr){ background: var(--surface-card); }
.dt-clean :deep(.p-paginator){ border:0; background: var(--surface-card); }

.activity-item{ display:flex; align-items:flex-start; gap:.5rem; padding:.45rem 0; }
</style>
