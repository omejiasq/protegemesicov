<template>
  <div class="reports-manager">
    <!-- Header Principal -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <i class="pi pi-chart-line mr-3"></i>
          Constructor de Reportes
        </h1>
        <p class="page-description">
          Gestiona y ejecuta reportes personalizados de alistamientos
        </p>
      </div>
      <div class="header-actions">
        <Button
          label="Crear Nuevo Reporte"
          icon="pi pi-plus"
          @click="navigateToCreate"
          class="btn-primary"
        />
      </div>
    </div>

    <!-- Filtros y Búsqueda -->
    <Card class="filters-card">
      <template #content>
        <div class="filters-container">
          <div class="search-section">
            <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <InputText
                v-model="searchQuery"
                placeholder="Buscar reportes..."
                class="search-input"
              />
            </span>
          </div>

          <div class="filter-section">
            <Dropdown
              v-model="selectedFilter"
              :options="filterOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Filtrar por"
              class="filter-dropdown"
            />
          </div>

          <div class="view-section">
            <SelectButton
              v-model="viewMode"
              :options="viewOptions"
              optionLabel="icon"
              optionValue="value"
              class="view-toggle"
            >
              <template #option="{ option }">
                <i :class="option.icon"></i>
              </template>
            </SelectButton>
          </div>
        </div>
      </template>
    </Card>

    <!-- Lista de Reportes -->
    <div class="reports-section">
      <!-- Vista de Tarjetas -->
      <div v-if="viewMode === 'cards'" class="reports-grid">
        <div
          v-for="report in filteredReports"
          :key="report._id"
          class="report-card"
        >
          <Card>
            <template #header>
              <div class="card-header">
                <div class="report-status">
                  <Tag
                    v-if="report.is_public"
                    icon="pi pi-users"
                    severity="success"
                    value="Público"
                  />
                  <Tag
                    v-else
                    icon="pi pi-lock"
                    severity="info"
                    value="Privado"
                  />
                </div>
              </div>
            </template>

            <template #title>
              <h3 class="report-title">{{ report.name }}</h3>
            </template>

            <template #subtitle>
              <p class="report-description">
                {{ report.description || 'Sin descripción' }}
              </p>
            </template>

            <template #content>
              <div class="report-metadata">
                <div class="metadata-item">
                  <i class="pi pi-table"></i>
                  <span>{{ report.fields?.length || 0 }} campos</span>
                </div>
                <div class="metadata-item">
                  <i class="pi pi-filter"></i>
                  <span>{{ report.filters?.length || 0 }} filtros</span>
                </div>
                <div class="metadata-item">
                  <i class="pi pi-calendar"></i>
                  <span>{{ formatDate(report.createdAt) }}</span>
                </div>
                <div class="metadata-item" v-if="report.created_by !== currentUserId.value">
                  <i class="pi pi-user"></i>
                  <span>Compartido</span>
                </div>
              </div>
            </template>

            <template #footer>
              <div class="card-actions">
                <Button
                  label="Ver Reporte"
                  icon="pi pi-eye"
                  @click="viewReport(report)"
                  class="action-btn view-btn"
                />
                <Button
                  v-if="canEdit(report)"
                  label="Editar"
                  icon="pi pi-pencil"
                  @click="editReport(report)"
                  class="action-btn edit-btn"
                  outlined
                />
                <Button
                  v-if="canDelete(report)"
                  label="Eliminar"
                  icon="pi pi-trash"
                  @click="deleteReport(report)"
                  class="action-btn delete-btn"
                  severity="danger"
                  outlined
                />
              </div>
            </template>
          </Card>
        </div>
      </div>

      <!-- Vista de Tabla -->
      <div v-else class="reports-table">
        <DataTable
          :value="filteredReports"
          :paginator="true"
          :rows="20"
          :rowsPerPageOptions="[10, 20, 50]"
          paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} reportes"
          responsiveLayout="scroll"
          class="modern-table"
          :loading="loading"
        >
          <Column field="name" header="Nombre" sortable class="name-column">
            <template #body="{ data }">
              <div class="report-name-cell">
                <h4 class="report-name">{{ data.name }}</h4>
                <p class="report-desc">{{ data.description || 'Sin descripción' }}</p>
              </div>
            </template>
          </Column>

          <Column header="Tipo" class="type-column">
            <template #body="{ data }">
              <Tag
                v-if="data.is_public"
                icon="pi pi-users"
                severity="success"
                value="Público"
              />
              <Tag
                v-else
                icon="pi pi-lock"
                severity="info"
                value="Privado"
              />
            </template>
          </Column>

          <Column header="Detalles" class="details-column">
            <template #body="{ data }">
              <div class="details-cell">
                <Badge :value="data.fields?.length || 0" />
                <span class="detail-label">campos</span>
                <Badge :value="data.filters?.length || 0" />
                <span class="detail-label">filtros</span>
              </div>
            </template>
          </Column>

          <Column field="createdAt" header="Fecha" sortable class="date-column">
            <template #body="{ data }">
              {{ formatDate(data.createdAt) }}
            </template>
          </Column>

          <Column header="Acciones" class="actions-column">
            <template #body="{ data }">
              <div class="table-actions">
                <Button
                  icon="pi pi-eye"
                  @click="viewReport(data)"
                  title="Ver reporte"
                  text
                  rounded
                />
                <Button
                  v-if="canEdit(data)"
                  icon="pi pi-pencil"
                  @click="editReport(data)"
                  title="Editar reporte"
                  text
                  rounded
                />
                <Button
                  icon="pi pi-ellipsis-v"
                  @click="toggleMenu($event, data)"
                  title="Más opciones"
                  text
                  rounded
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- Estado vacío -->
      <div v-if="!loading && filteredReports.length === 0" class="empty-state">
        <div class="empty-content">
          <i class="pi pi-chart-line empty-icon"></i>
          <h3 class="empty-title">
            {{ searchQuery ? 'No se encontraron reportes' : 'No hay reportes disponibles' }}
          </h3>
          <p class="empty-message">
            {{ searchQuery
              ? 'Intenta con otros términos de búsqueda o verifica los filtros aplicados'
              : 'Comienza creando tu primer reporte personalizado'
            }}
          </p>
          <Button
            v-if="!searchQuery"
            label="Crear Primer Reporte"
            icon="pi pi-plus"
            @click="navigateToCreate"
            class="empty-action"
          />
        </div>
      </div>
    </div>

    <!-- Menú Contextual -->

    <!-- Dialog de Confirmación para Eliminar -->
    <Dialog
      v-model:visible="showDeleteDialog"
      header="Confirmar Eliminación"
      modal
      :style="{ width: '450px' }"
    >
      <div class="delete-content">
        <div class="delete-icon">
          <i class="pi pi-exclamation-triangle"></i>
        </div>
        <div class="delete-message">
          <h4>¿Eliminar reporte?</h4>
          <p>
            Esta acción eliminará permanentemente el reporte
            <strong>"{{ reportToDelete?.name }}"</strong>.
          </p>
          <p class="warning-text">
            Esta acción no se puede deshacer.
          </p>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <Button
            label="Cancelar"
            outlined
            @click="showDeleteDialog = false"
          />
          <Button
            label="Eliminar"
            severity="danger"
            @click="confirmDelete"
            :loading="deleting"
          />
        </div>
      </template>
    </Dialog>

    <!-- Toast para notificaciones -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../../stores/authStore'

// Componentes PrimeVue
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import SelectButton from 'primevue/selectbutton'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Badge from 'primevue/badge'
import Dialog from 'primevue/dialog'
import Toast from 'primevue/toast'

// Services y tipos
import {
  DynamicReportsApi,
  type SavedReport
} from '../../api/dynamic-reports.service'

// Composables
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

// Referencias del template

// Estado reactivo
const loading = ref(false)
const reports = ref<SavedReport[]>([])
const searchQuery = ref('')
const selectedFilter = ref('all')
const viewMode = ref<'cards' | 'table'>('cards')
const showDeleteDialog = ref(false)
const reportToDelete = ref<SavedReport | null>(null)
const deleting = ref(false)
// Computed property para obtener el ID del usuario actual
const currentUserId = computed(() => authStore.user?._id || '')

// Opciones de filtrado
const filterOptions = [
  { label: 'Todos los reportes', value: 'all' },
  { label: 'Mis reportes', value: 'own' },
  { label: 'Reportes públicos', value: 'public' },
  { label: 'Reportes privados', value: 'private' }
]

// Opciones de vista
const viewOptions = [
  { icon: 'pi pi-th-large', value: 'cards' },
  { icon: 'pi pi-list', value: 'table' }
]

// Computed properties
const filteredReports = computed(() => {
  let result = reports.value

  // Filtrar por búsqueda
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(report =>
      report.name.toLowerCase().includes(query) ||
      (report.description && report.description.toLowerCase().includes(query))
    )
  }

  // Filtrar por tipo
  switch (selectedFilter.value) {
    case 'own':
      result = result.filter(report => report.created_by === currentUserId.value)
      break
    case 'public':
      result = result.filter(report => report.is_public === true)
      break
    case 'private':
      result = result.filter(report => report.is_public === false)
      break
  }

  return result.sort((a, b) =>
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )
})


// Métodos principales
const loadReports = async () => {
  try {
    loading.value = true
    const { data } = await DynamicReportsApi.getSavedReports()
    reports.value = data || []
  } catch (error) {
    console.error('Error loading reports:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error al cargar los reportes',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

// Navegación
const navigateToCreate = () => {
  router.push('/pesv/reports/create')
}

const viewReport = (report: SavedReport) => {
  router.push(`/pesv/reports/view/${report._id}`)
}

const editReport = (report: SavedReport) => {
  router.push(`/pesv/reports/edit/${report._id}`)
}

const deleteReport = (report: SavedReport) => {
  reportToDelete.value = report
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!reportToDelete.value?._id) return

  try {
    deleting.value = true
    await DynamicReportsApi.deleteSavedReport(reportToDelete.value._id)

    toast.add({
      severity: 'success',
      summary: 'Reporte eliminado',
      detail: `"${reportToDelete.value.name}" ha sido eliminado`,
      life: 3000
    })

    showDeleteDialog.value = false
    reportToDelete.value = null
    loadReports()
  } catch (error: any) {
    console.error('Error deleting report:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Error al eliminar el reporte',
      life: 3000
    })
  } finally {
    deleting.value = false
  }
}

// Utilidades

const canEdit = (report: SavedReport): boolean => {
  // Por ahora permitir editar todos los reportes
  // Más adelante se puede filtrar por: report.created_by === currentUserId.value
  return true
}

const canDelete = (report: SavedReport): boolean => {
  // Por ahora permitir eliminar todos los reportes
  // Más adelante se puede filtrar por: report.created_by === currentUserId.value
  return true
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Fecha no disponible'

  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Inicialización
onMounted(() => {
  loadReports()
})
</script>

<style scoped>
.reports-manager {
  padding: 1.5rem;
  max-width: 100%;
  background: #fafbfc;
  min-height: calc(100vh - 80px);
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
  margin: 0;
}

.page-description {
  color: #6b7280;
  margin-top: 0.5rem;
  font-size: 1.1rem;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border: none;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  border-radius: 8px;
}

/* Filtros */
.filters-card {
  margin-bottom: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.filters-container {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-input {
  width: 350px;
}

.filter-dropdown {
  min-width: 180px;
}

.view-toggle {
  margin-left: auto;
}

/* Vista de Tarjetas */
.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
}

.report-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.report-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.report-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.4;
}

.report-description {
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
}

.report-metadata {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.metadata-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.metadata-item i {
  color: #9ca3af;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
}

.action-btn {
  flex: 1;
  padding: 0.5rem;
  border-radius: 6px;
  font-weight: 500;
}

.execute-btn {
  background: #10b981;
  border-color: #10b981;
}

.view-btn {
  border-color: #6b7280;
  color: #6b7280;
}

.edit-btn {
  border-color: #f59e0b;
  color: #f59e0b;
}

/* Vista de Tabla */
.modern-table {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.report-name-cell {
  padding: 0.5rem 0;
}

.report-name {
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  font-size: 0.95rem;
}

.report-desc {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
  font-size: 0.8rem;
}

.details-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.detail-label {
  font-size: 0.75rem;
  color: #9ca3af;
}

.table-actions {
  display: flex;
  gap: 0.25rem;
}

/* Estado vacío */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.empty-content {
  text-align: center;
  max-width: 400px;
  padding: 2rem;
}

.empty-icon {
  font-size: 4rem;
  color: #d1d5db;
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 1rem 0;
}

.empty-message {
  color: #6b7280;
  margin-bottom: 2rem;
  line-height: 1.6;
}

/* Dialog de eliminación */
.delete-content {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.delete-icon {
  flex-shrink: 0;
}

.delete-icon i {
  font-size: 3rem;
  color: #f59e0b;
}

.delete-message h4 {
  margin: 0 0 0.5rem 0;
  color: #1f2937;
}

.delete-message p {
  margin: 0 0 0.5rem 0;
  color: #6b7280;
}

.warning-text {
  color: #ef4444 !important;
  font-weight: 500;
}

.dialog-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

/* Menu contextual */
:deep(.menu-item-danger) {
  color: #ef4444 !important;
}

/* Responsive */
@media (max-width: 768px) {
  .reports-manager {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .filters-container {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
  }

  .reports-grid {
    grid-template-columns: 1fr;
  }

  .card-actions {
    flex-direction: column;
  }
}
</style>