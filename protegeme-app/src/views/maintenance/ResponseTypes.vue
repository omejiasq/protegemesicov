<template>
  <div v-if="loading" class="loading-state">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem" />
    <p>Cargando tipos de respuesta...</p>
  </div>

  <div v-else>
    <!-- Cabecera -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Tipos de Respuesta de Ítems</h2>
        <p class="page-subtitle">
          Configure qué opciones aparecen en los formularios de alistamiento,
          preventivo y correctivo en la app móvil
        </p>
      </div>
      <button class="btn-primary" @click="openCreate">
        <i class="pi pi-plus" /> Nueva Respuesta
      </button>
    </div>

    <!-- Tabs por tipo_mantenimiento -->
    <div class="tabs-bar">
      <button
        v-for="t in TIPOS"
        :key="t.value"
        class="tab-btn"
        :class="{ active: activeTab === t.value }"
        @click="activeTab = t.value"
      >
        <i :class="t.icon" />
        {{ t.label }}
        <span class="tab-count">{{ countByTipo(t.value) }}</span>
      </button>
    </div>

    <!-- Lista -->
    <div v-if="filteredItems.length === 0" class="empty-state">
      <i class="pi pi-check-square" style="font-size: 2rem; color: #9ca3af" />
      <p>No hay tipos de respuesta para {{ TIPOS.find(t => t.value === activeTab)?.label }}. Cree el primero.</p>
    </div>

    <div v-else class="group-card">
      <table class="items-table">
        <thead>
          <tr>
            <th>Orden</th>
            <th>Valor</th>
            <th>Etiqueta</th>
            <th>Es positivo (OK)</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item._id">
            <td>{{ item.orden ?? 0 }}</td>
            <td><code class="valor-code">{{ item.valor }}</code></td>
            <td>{{ item.label }}</td>
            <td>
              <span :class="['badge', item.es_positivo ? 'badge-positive' : 'badge-neutral']">
                {{ item.es_positivo ? 'Sí (OK/Conforme)' : 'No (Falla/NC)' }}
              </span>
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

    <!-- Nota informativa -->
    <div class="info-box">
      <i class="pi pi-info-circle" />
      <div>
        <strong>¿Qué significa "Es positivo"?</strong><br />
        En <strong>alistamiento</strong>: los ítems marcados con una respuesta positiva aportan
        sus códigos SICOV al reporte enviado a Supertransporte.<br />
        En <strong>preventivo/correctivo</strong>: los ítems con respuesta positiva NO se incluyen
        en el listado de fallas del informe.
      </div>
    </div>
  </div>

  <!-- Modal crear / editar -->
  <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ editingItem ? 'Editar Tipo de Respuesta' : 'Nueva Respuesta' }}</h3>
        <button class="btn-icon" @click="closeModal"><i class="pi pi-times" /></button>
      </div>

      <div class="modal-body">
        <div class="field">
          <label>Tipo de mantenimiento *</label>
          <select v-model="form.tipo_mantenimiento" :class="{ error: errors.tipo_mantenimiento }">
            <option value="">Seleccione...</option>
            <option v-for="t in TIPOS" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
          <small v-if="errors.tipo_mantenimiento" class="error-text">{{ errors.tipo_mantenimiento }}</small>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Valor (enviado al sistema) *</label>
            <input
              v-model="form.valor"
              placeholder="Ej: OK, NC, NA, B, R, M"
              :class="{ error: errors.valor }"
            />
            <small v-if="errors.valor" class="error-text">{{ errors.valor }}</small>
          </div>
          <div class="field">
            <label>Etiqueta (visible al usuario) *</label>
            <input
              v-model="form.label"
              placeholder="Ej: Bueno, No Conforme, Malo"
              :class="{ error: errors.label }"
            />
            <small v-if="errors.label" class="error-text">{{ errors.label }}</small>
          </div>
        </div>

        <div class="field">
          <label>Orden</label>
          <input v-model.number="form.orden" type="number" min="0" placeholder="0" />
        </div>

        <div class="field">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.es_positivo" />
            <span>
              Es respuesta positiva (OK / Conforme)
              <small style="display:block; color:#6b7280; font-weight:400;">
                En alistamiento: aporta códigos SICOV.
                En preventivo/correctivo: el ítem no se cuenta como falla.
              </small>
            </span>
          </label>
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

interface ItemResponseTypeItem {
  _id: string
  tipo_mantenimiento: string
  valor: string
  label: string
  es_positivo: boolean
  orden: number
  enabled: boolean
}

const TIPOS = [
  { value: 'enlistment',  label: 'Alistamiento',  icon: 'pi pi-check-circle' },
  { value: 'preventive',  label: 'Preventivo',    icon: 'pi pi-calendar' },
  { value: 'corrective',  label: 'Correctivo',    icon: 'pi pi-wrench' },
]

const loading = ref(true)
const saving  = ref(false)
const items   = ref<ItemResponseTypeItem[]>([])
const activeTab = ref('enlistment')
const showModal = ref(false)
const editingItem = ref<ItemResponseTypeItem | null>(null)
const errors = ref<any>({})

const form = ref({
  tipo_mantenimiento: 'enlistment',
  valor: '',
  label: '',
  es_positivo: false,
  orden: 0,
})

const filteredItems = computed(() =>
  items.value.filter(i => i.tipo_mantenimiento === activeTab.value)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
)

function countByTipo(tipo: string) {
  return items.value.filter(i => i.tipo_mantenimiento === tipo).length
}

async function load() {
  loading.value = true
  try {
    const { data } = await MaintenanceserviceApi.listAllItemResponseTypes()
    items.value = data
  } catch (e) {
    console.error('Error cargando tipos de respuesta:', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openCreate() {
  editingItem.value = null
  form.value = { tipo_mantenimiento: activeTab.value, valor: '', label: '', es_positivo: false, orden: 0 }
  errors.value = {}
  showModal.value = true
}

function openEdit(item: ItemResponseTypeItem) {
  editingItem.value = item
  form.value = {
    tipo_mantenimiento: item.tipo_mantenimiento,
    valor: item.valor,
    label: item.label,
    es_positivo: item.es_positivo,
    orden: item.orden ?? 0,
  }
  errors.value = {}
  showModal.value = true
}

function closeModal() { showModal.value = false }

function validate() {
  const e: any = {}
  if (!form.value.tipo_mantenimiento) e.tipo_mantenimiento = 'Seleccione un tipo'
  if (!form.value.valor.trim())       e.valor = 'Campo requerido'
  if (!form.value.label.trim())       e.label = 'Campo requerido'
  errors.value = e
  return Object.keys(e).length === 0
}

async function save() {
  if (!validate()) return
  saving.value = true
  try {
    const payload = {
      tipo_mantenimiento: form.value.tipo_mantenimiento,
      valor:       form.value.valor.trim(),
      label:       form.value.label.trim(),
      es_positivo: form.value.es_positivo,
      orden:       form.value.orden,
    }
    if (editingItem.value) {
      const { data } = await MaintenanceserviceApi.updateItemResponseType(editingItem.value._id, payload)
      const idx = items.value.findIndex(i => i._id === editingItem.value!._id)
      if (idx !== -1) items.value[idx] = { ...items.value[idx], ...data }
    } else {
      const { data } = await MaintenanceserviceApi.createItemResponseType(payload)
      items.value.push(data)
    }
    closeModal()
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Error al guardar')
  } finally {
    saving.value = false
  }
}

async function doToggle(item: ItemResponseTypeItem) {
  try {
    const { data } = await MaintenanceserviceApi.toggleItemResponseType(item._id)
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

/* Tabs */
.tabs-bar {
  display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;
}
.tab-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px; border-radius: 10px; border: 1px solid #e5e7eb;
  background: #f9fafb; color: #374151; font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
}
.tab-btn:hover { background: #f3f4f6; }
.tab-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }
.tab-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; border-radius: 10px;
  background: rgba(255,255,255,0.25); font-size: 11px; font-weight: 700;
  padding: 0 4px;
}
.tab-btn:not(.active) .tab-count { background: #e5e7eb; color: #6b7280; }

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 60px 0; color: #6b7280;
}

.group-card {
  background: #fff; border: 1px solid #e5e7eb;
  border-radius: 12px; margin-bottom: 20px; overflow: hidden;
}
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

.valor-code {
  background: #f3f4f6; padding: 2px 8px; border-radius: 6px;
  font-family: monospace; font-size: 13px; font-weight: 700; color: #111827;
}

.badge {
  display: inline-flex; align-items: center; padding: 3px 10px;
  border-radius: 20px; font-size: 12px; font-weight: 600;
}
.badge-active   { background: #dcfce7; color: #166534; }
.badge-inactive { background: #f3f4f6; color: #6b7280; }
.badge-positive { background: #dbeafe; color: #1d4ed8; }
.badge-neutral  { background: #fef3c7; color: #92400e; }

.actions-cell { display: flex; gap: 6px; }
.btn-icon {
  background: none; border: 1px solid #e5e7eb; border-radius: 8px;
  padding: 6px 8px; cursor: pointer; color: #6b7280; transition: all 0.2s;
}
.btn-icon:hover { background: #f3f4f6; color: #374151; }

.info-box {
  display: flex; gap: 12px; align-items: flex-start;
  background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px;
  padding: 14px 18px; font-size: 13px; color: #1e40af; margin-top: 16px;
}
.info-box .pi { font-size: 18px; flex-shrink: 0; margin-top: 2px; }

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
  max-width: 520px; max-height: 90vh; overflow-y: auto;
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
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
label { font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #4b5563; }

input[type="text"], input[type="number"], select {
  height: 42px; padding: 8px 12px; border-radius: 10px;
  border: 1px solid #d1d5db; font-size: 14px; transition: all 0.2s ease;
  background: #fff;
}
input[type="text"]:focus, input[type="number"]:focus, select:focus {
  outline: none; border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
}
.error { border: 1.8px solid #dc2626 !important; background: #fef2f2; }
.error-text { color: #dc2626; font-size: 12px; margin-top: 4px; }

.checkbox-label {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb;
  cursor: pointer; font-weight: normal; margin-bottom: 0;
}
.checkbox-label input[type="checkbox"] {
  width: 16px; height: 16px; margin-top: 2px; flex-shrink: 0; cursor: pointer;
}
</style>
