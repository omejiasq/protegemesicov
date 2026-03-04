<template>
  <div v-if="loading" class="loading-state">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem" />
    <p>Cargando partes...</p>
  </div>

  <div v-else>
    <!-- Cabecera -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Partes de Mantenimiento</h2>
        <p class="page-subtitle">Gestione los ítems de mantenimiento de su empresa</p>
      </div>
      <button class="btn-primary" @click="openCreate">
        <i class="pi pi-plus" /> Nueva Parte
      </button>
    </div>

    <!-- Lista agrupada por tipo_parte -->
    <div v-if="groups.length === 0" class="empty-state">
      <i class="pi pi-list" style="font-size: 2rem; color: #9ca3af" />
      <p>No hay partes registradas. Cree la primera.</p>
    </div>

    <div v-for="group in groups" :key="group.tipo_parte" class="group-card">
      <div class="group-header">
        <span class="group-title">{{ group.tipo_parte }}</span>
        <span class="group-count">{{ group.items.length }} ítems</span>
      </div>
      <table class="items-table">
        <thead>
          <tr>
            <th>Dispositivo / Parte</th>
            <th>Orden</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in group.items" :key="item._id">
            <td>{{ item.dispositivo }}</td>
            <td>{{ item.orden ?? 0 }}</td>
            <td>
              <span :class="['badge', item.enabled ? 'badge-active' : 'badge-inactive']">
                {{ item.enabled ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn-icon" title="Editar" @click="openEdit(item)">
                <i class="pi pi-pencil" />
              </button>
              <button
                class="btn-icon"
                :title="item.enabled ? 'Deshabilitar' : 'Habilitar'"
                @click="doToggle(item)"
              >
                <i :class="item.enabled ? 'pi pi-eye-slash' : 'pi pi-eye'" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Modal crear / editar -->
  <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ editingItem ? 'Editar Parte' : 'Nueva Parte' }}</h3>
        <button class="btn-icon" @click="closeModal"><i class="pi pi-times" /></button>
      </div>

      <div class="modal-body">
        <div class="field">
          <label>Tipo de parte *</label>
          <input
            v-model="form.tipo_parte"
            placeholder="Ej: MOTOR, FRENOS, CARROCERIA"
            :class="{ error: errors.tipo_parte }"
          />
          <small v-if="errors.tipo_parte" class="error-text">{{ errors.tipo_parte }}</small>
        </div>

        <div class="field">
          <label>Dispositivo / Descripción *</label>
          <input
            v-model="form.dispositivo"
            placeholder="Ej: Filtro de aceite"
            :class="{ error: errors.dispositivo }"
          />
          <small v-if="errors.dispositivo" class="error-text">{{ errors.dispositivo }}</small>
        </div>

        <div class="field">
          <label>Orden</label>
          <input
            v-model.number="form.orden"
            type="number"
            min="0"
            placeholder="0"
          />
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="closeModal">Cancelar</button>
        <button class="btn-primary" :disabled="saving" @click="save">
          {{ saving ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { MaintenanceserviceApi } from '../../api/maintenance.service'

interface MaintenanceTypeItem {
  _id: string
  tipo_parte: string
  dispositivo: string
  orden?: number
  enabled: boolean
}

const loading = ref(true)
const saving = ref(false)
const items = ref<MaintenanceTypeItem[]>([])
const showModal = ref(false)
const editingItem = ref<MaintenanceTypeItem | null>(null)
const errors = ref<any>({})

const form = ref({ tipo_parte: '', dispositivo: '', orden: 0 })

const groups = computed(() => {
  const map = new Map<string, MaintenanceTypeItem[]>()
  for (const item of items.value) {
    if (!map.has(item.tipo_parte)) map.set(item.tipo_parte, [])
    map.get(item.tipo_parte)!.push(item)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tipo_parte, its]) => ({ tipo_parte, items: its }))
})

async function load() {
  loading.value = true
  try {
    const { data } = await MaintenanceserviceApi.listAllMaintenanceTypes()
    items.value = data
  } catch (e) {
    console.error('Error cargando partes:', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openCreate() {
  editingItem.value = null
  form.value = { tipo_parte: '', dispositivo: '', orden: 0 }
  errors.value = {}
  showModal.value = true
}

function openEdit(item: MaintenanceTypeItem) {
  editingItem.value = item
  form.value = {
    tipo_parte: item.tipo_parte,
    dispositivo: item.dispositivo,
    orden: item.orden ?? 0,
  }
  errors.value = {}
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function validate() {
  const e: any = {}
  if (!form.value.tipo_parte.trim()) e.tipo_parte = 'Campo requerido'
  if (!form.value.dispositivo.trim()) e.dispositivo = 'Campo requerido'
  errors.value = e
  return Object.keys(e).length === 0
}

async function save() {
  if (!validate()) return
  saving.value = true
  try {
    if (editingItem.value) {
      const { data } = await MaintenanceserviceApi.updateMaintenanceType(
        editingItem.value._id,
        { tipo_parte: form.value.tipo_parte.trim(), dispositivo: form.value.dispositivo.trim(), orden: form.value.orden },
      )
      const idx = items.value.findIndex(i => i._id === editingItem.value!._id)
      if (idx !== -1) items.value[idx] = { ...items.value[idx], ...data }
    } else {
      const { data } = await MaintenanceserviceApi.createMaintenanceType({
        tipo_parte: form.value.tipo_parte.trim(),
        dispositivo: form.value.dispositivo.trim(),
        orden: form.value.orden,
      })
      items.value.push(data)
    }
    closeModal()
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Error al guardar')
  } finally {
    saving.value = false
  }
}

async function doToggle(item: MaintenanceTypeItem) {
  try {
    const { data } = await MaintenanceserviceApi.toggleMaintenanceType(item._id)
    const idx = items.value.findIndex(i => i._id === item._id)
    if (idx !== -1) items.value[idx] = { ...items.value[idx], enabled: data.enabled }
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Error al cambiar estado')
  }
}
</script>

<style scoped>
.loading-state {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 60px 0; color: #6b7280; gap: 12px;
}
.page-header {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 16px;
  margin-bottom: 24px; flex-wrap: wrap;
}
.page-title { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 4px; }
.page-subtitle { font-size: 14px; color: #6b7280; margin: 0; }

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 60px 0; color: #6b7280;
}

.group-card {
  background: #fff; border: 1px solid #e5e7eb;
  border-radius: 12px; margin-bottom: 20px; overflow: hidden;
}
.group-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}
.group-title { font-size: 14px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; }
.group-count { font-size: 12px; color: #6b7280; }

.items-table { width: 100%; border-collapse: collapse; }
.items-table th {
  padding: 10px 20px; text-align: left; font-size: 12px;
  font-weight: 600; color: #6b7280; text-transform: uppercase;
  letter-spacing: 0.3px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;
}
.items-table td {
  padding: 12px 20px; font-size: 14px; color: #374151;
  border-bottom: 1px solid #f3f4f6;
}
.items-table tr:last-child td { border-bottom: none; }

.badge {
  display: inline-flex; align-items: center; padding: 3px 10px;
  border-radius: 20px; font-size: 12px; font-weight: 600;
}
.badge-active { background: #dcfce7; color: #166534; }
.badge-inactive { background: #f3f4f6; color: #6b7280; }

.actions-cell { display: flex; gap: 6px; }
.btn-icon {
  background: none; border: 1px solid #e5e7eb; border-radius: 8px;
  padding: 6px 8px; cursor: pointer; color: #6b7280; transition: all 0.2s;
}
.btn-icon:hover { background: #f3f4f6; color: #374151; }

/* Buttons */
.btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff; border: none; border-radius: 12px;
  padding: 10px 22px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.25s ease;
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(37,99,235,0.35); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.btn-secondary {
  background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;
  border-radius: 12px; padding: 10px 20px; font-size: 14px;
  font-weight: 600; cursor: pointer; transition: all 0.2s ease;
}
.btn-secondary:hover { background: #e5e7eb; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal {
  background: #fff; border-radius: 16px; width: 100%;
  max-width: 480px; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; border-bottom: 1px solid #e5e7eb;
}
.modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #111827; }
.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 12px;
  padding: 16px 24px; border-top: 1px solid #e5e7eb; background: #f9fafb;
}

.field { display: flex; flex-direction: column; }
label { font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #4b5563; }
input {
  height: 42px; padding: 8px 12px; border-radius: 10px;
  border: 1px solid #d1d5db; font-size: 14px; transition: all 0.2s ease;
}
input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
.error { border: 1.8px solid #dc2626 !important; background: #fef2f2; }
.error-text { color: #dc2626; font-size: 12px; margin-top: 4px; }
</style>
