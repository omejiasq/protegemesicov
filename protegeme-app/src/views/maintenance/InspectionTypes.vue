<template>
  <div v-if="loading" class="loading-state">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem" />
    <p>Cargando ítems de alistamiento...</p>
  </div>

  <div v-else>
    <!-- Cabecera -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Ítems de Alistamiento</h2>
        <p class="page-subtitle">Gestione los ítems de inspección de su empresa y su mapeo con los códigos SICOV</p>
      </div>
      <button class="btn-primary" @click="openCreate">
        <i class="pi pi-plus" /> Nuevo Ítem
      </button>
    </div>

    <!-- Lista agrupada por tipo_parte -->
    <div v-if="groups.length === 0" class="empty-state">
      <i class="pi pi-list" style="font-size: 2rem; color: #9ca3af" />
      <p>No hay ítems registrados para esta empresa. Cree el primero.</p>
    </div>

    <div v-for="group in groups" :key="group.tipo_parte" class="group-card">
      <div class="group-header">
        <span class="group-title">{{ group.tipo_parte }}</span>
        <span class="group-count">{{ group.items.length }} ítems</span>
      </div>
      <table class="items-table">
        <thead>
          <tr>
            <th>Dispositivo</th>
            <th>Orden</th>
            <th>Códigos SICOV</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in group.items" :key="item._id">
            <td>{{ item.dispositivo }}</td>
            <td>{{ item.orden ?? 0 }}</td>
            <td>
              <div class="codigos-list">
                <span
                  v-for="code in (item.codigos_sicov ?? [])"
                  :key="code"
                  class="codigo-chip"
                  :title="ACTIVIDADES_MAP[code]"
                >
                  {{ code }}
                </span>
                <span v-if="!item.codigos_sicov?.length" class="no-codigo">—</span>
              </div>
            </td>
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
        <h3>{{ editingItem ? 'Editar Ítem' : 'Nuevo Ítem de Alistamiento' }}</h3>
        <button class="btn-icon" @click="closeModal"><i class="pi pi-times" /></button>
      </div>

      <div class="modal-body">
        <div class="field">
          <label>Tipo de parte *</label>
          <input
            v-model="form.tipo_parte"
            placeholder="Ej: MOTOR, FRENOS, LUCES"
            :class="{ error: errors.tipo_parte }"
          />
          <small v-if="errors.tipo_parte" class="error-text">{{ errors.tipo_parte }}</small>
        </div>

        <div class="field">
          <label>Dispositivo / Descripción *</label>
          <input
            v-model="form.dispositivo"
            placeholder="Ej: Nivel de aceite del motor"
            :class="{ error: errors.dispositivo }"
          />
          <small v-if="errors.dispositivo" class="error-text">{{ errors.dispositivo }}</small>
        </div>

        <div class="field">
          <label>Orden</label>
          <input v-model.number="form.orden" type="number" min="0" placeholder="0" />
        </div>

        <!-- Mapeo SICOV -->
        <div class="field">
          <label>Códigos SICOV que representa este ítem</label>
          <p class="field-hint">Si el usuario no selecciona este ítem en el alistamiento, los códigos marcados no se enviarán a Supertransporte.</p>
          <div class="sicov-grid">
            <label
              v-for="(desc, code) in ACTIVIDADES_MAP"
              :key="code"
              class="sicov-item"
              :class="{ selected: form.codigos_sicov.includes(Number(code)) }"
            >
              <input
                type="checkbox"
                :value="Number(code)"
                v-model="form.codigos_sicov"
              />
              <span class="sicov-code">{{ code }}</span>
              <span class="sicov-desc">{{ desc }}</span>
            </label>
          </div>
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

interface InspectionTypeItem {
  _id: string
  tipo_parte: string
  dispositivo: string
  orden?: number
  obligatorio: boolean
  enabled: boolean
  codigos_sicov?: number[]
}

const ACTIVIDADES_MAP: Record<number, string> = {
  1: 'Fugas del motor',
  2: 'Tensión correas',
  3: 'Ajuste de tapas',
  4: 'Niveles de aceite de motor, transmisión, dirección, frenos',
  5: 'Nivel agua limpiaparabrisas',
  6: 'Aditivos de radiador',
  7: 'Filtros húmedos y secos',
  8: 'Baterías: niveles de electrolito, ajustes de bordes y sulfatación',
  9: 'Llantas: desgaste, presión de aire',
  10: 'Equipo de carretera',
  11: 'Botiquín',
}

const loading = ref(true)
const saving = ref(false)
const items = ref<InspectionTypeItem[]>([])
const showModal = ref(false)
const editingItem = ref<InspectionTypeItem | null>(null)
const errors = ref<any>({})

const form = ref({
  tipo_parte: '',
  dispositivo: '',
  orden: 0,
  codigos_sicov: [] as number[],
})

const groups = computed(() => {
  const map = new Map<string, InspectionTypeItem[]>()
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
    const { data } = await MaintenanceserviceApi.listAllInspectionTypes()
    items.value = data
  } catch (e) {
    console.error('Error cargando ítems de alistamiento:', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openCreate() {
  editingItem.value = null
  form.value = { tipo_parte: '', dispositivo: '', orden: 0, codigos_sicov: [] }
  errors.value = {}
  showModal.value = true
}

function openEdit(item: InspectionTypeItem) {
  editingItem.value = item
  form.value = {
    tipo_parte: item.tipo_parte,
    dispositivo: item.dispositivo,
    orden: item.orden ?? 0,
    codigos_sicov: [...(item.codigos_sicov ?? [])],
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
    const payload = {
      tipo_parte: form.value.tipo_parte.trim(),
      dispositivo: form.value.dispositivo.trim(),
      orden: form.value.orden,
      codigos_sicov: form.value.codigos_sicov,
    }
    if (editingItem.value) {
      const { data } = await MaintenanceserviceApi.updateInspectionType(editingItem.value._id, payload)
      const idx = items.value.findIndex(i => i._id === editingItem.value!._id)
      if (idx !== -1) items.value[idx] = { ...items.value[idx], ...data }
    } else {
      const { data } = await MaintenanceserviceApi.createInspectionType(payload)
      items.value.push(data)
    }
    closeModal()
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Error al guardar')
  } finally {
    saving.value = false
  }
}

async function doToggle(item: InspectionTypeItem) {
  try {
    const { data } = await MaintenanceserviceApi.toggleInspectionType(item._id)
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
  padding: 10px 16px; text-align: left; font-size: 12px;
  font-weight: 600; color: #6b7280; text-transform: uppercase;
  letter-spacing: 0.3px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;
}
.items-table td {
  padding: 12px 16px; font-size: 14px; color: #374151;
  border-bottom: 1px solid #f3f4f6; vertical-align: middle;
}
.items-table tr:last-child td { border-bottom: none; }

.badge {
  display: inline-flex; align-items: center; padding: 3px 10px;
  border-radius: 20px; font-size: 12px; font-weight: 600;
}
.badge-active    { background: #dcfce7; color: #166534; }
.badge-inactive  { background: #f3f4f6; color: #6b7280; }

.codigos-list { display: flex; flex-wrap: wrap; gap: 4px; }
.codigo-chip {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 50%;
  background: #dbeafe; color: #1d4ed8;
  font-size: 11px; font-weight: 700; cursor: default;
}
.no-codigo { color: #9ca3af; font-size: 13px; }

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
  max-width: 580px; max-height: 90vh; overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; border-bottom: 1px solid #e5e7eb;
  position: sticky; top: 0; background: #fff; z-index: 1;
}
.modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #111827; }
.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 12px;
  padding: 16px 24px; border-top: 1px solid #e5e7eb; background: #f9fafb;
  position: sticky; bottom: 0;
}

.field { display: flex; flex-direction: column; }
label { font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #4b5563; }
.field-hint { font-size: 12px; color: #6b7280; margin: 0 0 10px; line-height: 1.4; }

input[type="text"], input[type="number"] {
  height: 42px; padding: 8px 12px; border-radius: 10px;
  border: 1px solid #d1d5db; font-size: 14px; transition: all 0.2s ease;
}
input[type="text"]:focus, input[type="number"]:focus {
  outline: none; border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
}
.error { border: 1.8px solid #dc2626 !important; background: #fef2f2; }
.error-text { color: #dc2626; font-size: 12px; margin-top: 4px; }

/* SICOV grid */
.sicov-grid { display: flex; flex-direction: column; gap: 6px; }
.sicov-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 8px 12px; border-radius: 8px; cursor: pointer;
  border: 1px solid #e5e7eb; transition: all 0.15s;
  font-weight: normal;
}
.sicov-item:hover { background: #f0f9ff; border-color: #bfdbfe; }
.sicov-item.selected { background: #eff6ff; border-color: #93c5fd; }
.sicov-item input[type="checkbox"] { margin-top: 2px; flex-shrink: 0; width: 16px; height: 16px; }
.sicov-code {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 50%;
  background: #dbeafe; color: #1d4ed8;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
}
.sicov-desc { font-size: 13px; color: #374151; line-height: 1.4; }
</style>
