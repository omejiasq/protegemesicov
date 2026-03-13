<template>
  <div class="suppliers-page">

    <!-- ================= HEADER ================= -->
    <div class="page-header">
      <div>
        <h2>Proveedores de Mantenimiento</h2>
        <p>Centros especializados y mecánicos por empresa</p>
      </div>
      <button class="btn-primary" @click="openCreate">
        <i class="pi pi-plus" /> Nuevo Proveedor
      </button>
    </div>

    <!-- ================= TABLA ================= -->
    <div class="card">
      <div v-if="store.proveedores.loading" class="loading">
        <i class="pi pi-spin pi-spinner" /> Cargando...
      </div>

      <table v-else class="table">
        <thead>
          <tr>
            <th>Razón Social</th>
            <th>NIT</th>
            <th>Mecánico</th>
            <th>No. Identificación</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!store.proveedores.items.length">
            <td colspan="6" class="empty">No hay proveedores registrados</td>
          </tr>
          <tr v-for="p in store.proveedores.items" :key="p._id">
            <td>{{ p.razon_social }}</td>
            <td>{{ p.nit }}</td>
            <td>{{ p.nombre_mecanico || '—' }}</td>
            <td>{{ p.num_id_mecanico || '—' }}</td>
            <td>
              <span :class="['badge', p.enabled ? 'badge-active' : 'badge-inactive']">
                {{ p.enabled ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn-icon" title="Editar" @click="openEdit(p)">
                <i class="pi pi-pencil" />
              </button>
              <button
                class="btn-icon"
                :title="p.enabled ? 'Deshabilitar' : 'Habilitar'"
                @click="toggle(p)"
              >
                <i :class="p.enabled ? 'pi pi-eye-slash' : 'pi pi-eye'" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ================= MODAL ================= -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h3>{{ editing ? 'Editar Proveedor' : 'Nuevo Proveedor' }}</h3>

        <div class="form-grid">
          <div class="field full">
            <label>Razón Social *</label>
            <input v-model="form.razon_social" type="text" placeholder="Nombre del centro especializado" />
          </div>

          <div class="field">
            <label>NIT *</label>
            <input v-model="form.nit" type="text" placeholder="Ej: 900416316" />
          </div>

          <div class="field">
            <label>Nombre del Mecánico / Ingeniero</label>
            <input v-model="form.nombre_mecanico" type="text" />
          </div>

          <div class="field">
            <label>Tipo de Identificación</label>
            <select v-model="form.tipo_id_mecanico">
              <option :value="null">Sin especificar</option>
              <option v-for="opt in docTypeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div class="field">
            <label>No. Identificación Mecánico</label>
            <input v-model="form.num_id_mecanico" type="text" />
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" :disabled="saving" @click="closeModal">Cancelar</button>
          <button class="btn-save" :disabled="saving" @click="save">
            {{ saving ? 'Guardando...' : (editing ? 'Guardar Cambios' : 'Crear Proveedor') }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMaintenanceStore } from '../../stores/maintenanceStore'

const store = useMaintenanceStore()

const showModal = ref(false)
const editing = ref<any>(null)
const saving = ref(false)

const emptyForm = () => ({
  razon_social: '',
  nit: '',
  nombre_mecanico: '',
  tipo_id_mecanico: null as number | null,
  num_id_mecanico: '',
})

const form = ref(emptyForm())

const docTypeOptions = [
  { label: 'Cédula de ciudadanía', value: 1 },
  { label: 'Cédula de ciudadanía digital', value: 2 },
  { label: 'Tarjeta de identidad', value: 3 },
  { label: 'Registro civil', value: 4 },
  { label: 'Cédula de extranjería', value: 5 },
  { label: 'Pasaporte', value: 6 },
  { label: 'Permiso Especial de Permanencia (PEP)', value: 7 },
  { label: 'Documento de Identificación Extranjero (DIE)', value: 8 },
  { label: 'Permiso por Protección Temporal (PPT)', value: 9 },
]

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  showModal.value = true
}

function openEdit(p: any) {
  editing.value = p
  form.value = {
    razon_social: p.razon_social ?? '',
    nit: p.nit ?? '',
    nombre_mecanico: p.nombre_mecanico ?? '',
    tipo_id_mecanico: p.tipo_id_mecanico ?? null,
    num_id_mecanico: p.num_id_mecanico ?? '',
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editing.value = null
}

async function save() {
  if (!form.value.razon_social.trim() || !form.value.nit.trim()) {
    alert('Razón Social y NIT son obligatorios')
    return
  }

  saving.value = true
  try {
    const payload: any = { ...form.value }
    if (!payload.nombre_mecanico) delete payload.nombre_mecanico
    if (!payload.num_id_mecanico) delete payload.num_id_mecanico
    if (!payload.tipo_id_mecanico) delete payload.tipo_id_mecanico

    if (editing.value) {
      await store.proveedoresUpdate(editing.value._id, payload)
    } else {
      await store.proveedoresCreate(payload)
    }
    await store.proveedoresFetchAll()
    closeModal()
  } catch {
    alert('Error guardando el proveedor')
  } finally {
    saving.value = false
  }
}

async function toggle(p: any) {
  try {
    await store.proveedoresToggle(p._id)
    await store.proveedoresFetchAll()
  } catch {
    alert('Error cambiando el estado')
  }
}

onMounted(() => store.proveedoresFetchAll())
</script>

<style scoped>
.suppliers-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-header h2 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: #0f172a;
}
.page-header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  overflow: hidden;
}

.loading {
  padding: 40px;
  text-align: center;
  color: #64748b;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.table th {
  background: #f1f5f9;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}
.table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #1f2937;
}
.table tbody tr:hover { background: #f8fafc; }
.empty { text-align: center; color: #9ca3af; padding: 32px !important; }

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.badge-active  { background: #dcfce7; color: #16a34a; }
.badge-inactive { background: #f1f5f9; color: #6b7280; }

.actions-cell { display: flex; gap: 6px; }
.btn-icon {
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 6px 8px;
  cursor: pointer;
  color: #374151;
  transition: all 0.15s;
}
.btn-icon:hover { background: #f1f5f9; border-color: #d1d5db; }

/* Buttons */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:hover { opacity: 0.9; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  width: 100%;
  max-width: 560px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
.modal h3 {
  margin: 0 0 20px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.field { display: flex; flex-direction: column; gap: 5px; }
.field.full { grid-column: 1 / -1; }
.field label { font-size: 13px; font-weight: 500; color: #4b5563; }
.field input,
.field select {
  height: 40px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
}
.field input:focus,
.field select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}
.btn-cancel {
  padding: 10px 20px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  color: #374151;
}
.btn-save {
  padding: 10px 20px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-save:disabled, .btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
