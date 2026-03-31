<template>
  <div v-if="loading" class="loading-state">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem" />
    <p>Cargando FUECs...</p>
  </div>

  <div v-else>
    <!-- Cabecera -->
    <div class="page-header">
      <div>
        <h2 class="page-title">FUEC — Formato Único de Extracto de Contrato</h2>
        <p class="page-subtitle">Registre y gestione los contratos de transporte especial</p>
      </div>
      <button class="btn-primary" @click="openCreate">
        <i class="pi pi-plus" /> Nuevo FUEC
      </button>
    </div>

    <!-- Filtros -->
    <div class="filters-bar">
      <input v-model="filters.placa" placeholder="Filtrar por placa" class="filter-input" @input="loadList" />
      <select v-model="filters.estado" class="filter-select" @change="loadList">
        <option value="">Todos los estados</option>
        <option value="borrador">Borrador</option>
        <option value="emitido">Emitido</option>
        <option value="anulado">Anulado</option>
      </select>
      <input v-model="filters.fecha_desde" type="date" class="filter-input" @change="loadList" />
      <input v-model="filters.fecha_hasta" type="date" class="filter-input" @change="loadList" />
    </div>

    <!-- Tabla -->
    <div v-if="items.length === 0" class="empty-state">
      <i class="pi pi-file" style="font-size: 2rem; color: #9ca3af" />
      <p>No hay FUECs registrados.</p>
    </div>

    <table v-else class="items-table">
      <thead>
        <tr>
          <th>N° FUEC</th>
          <th>Fecha</th>
          <th>Placa</th>
          <th>Contratante</th>
          <th>Origen → Destino</th>
          <th>Conductor</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item._id">
          <td><strong>{{ item.numero_fuec }}</strong></td>
          <td>{{ formatDate(item.fecha_servicio) }}</td>
          <td>{{ item.placa }}</td>
          <td>{{ item.contratante_nombre }}</td>
          <td>{{ item.origen }} → {{ item.destino }}</td>
          <td>{{ item.conductor_nombre }}</td>
          <td>
            <span :class="['badge', `badge-${item.estado}`]">{{ item.estado }}</span>
          </td>
          <td class="actions-cell">
            <button class="btn-icon" title="Ver detalle" @click="openDetail(item)">
              <i class="pi pi-eye" />
            </button>
            <button class="btn-icon btn-print" title="Imprimir FUEC" @click="printFuec(item._id)">
              <i class="pi pi-print" />
            </button>
            <button
              v-if="item.estado === 'borrador'"
              class="btn-icon btn-edit"
              title="Editar"
              @click="openEdit(item)"
            >
              <i class="pi pi-pencil" />
            </button>
            <button
              v-if="item.estado === 'borrador'"
              class="btn-icon btn-success"
              title="Emitir"
              @click="confirmEmit(item)"
            >
              <i class="pi pi-send" />
            </button>
            <button
              v-if="item.estado !== 'anulado'"
              class="btn-icon btn-danger"
              title="Anular"
              @click="openAnular(item)"
            >
              <i class="pi pi-ban" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Paginación simple -->
    <div class="pagination" v-if="total > pageSize">
      <button :disabled="page <= 1" @click="changePage(page - 1)" class="btn-secondary btn-sm">Anterior</button>
      <span>Página {{ page }} de {{ Math.ceil(total / pageSize) }}</span>
      <button :disabled="page * pageSize >= total" @click="changePage(page + 1)" class="btn-secondary btn-sm">Siguiente</button>
    </div>
  </div>

  <!-- Modal Crear / Editar -->
  <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
    <div class="modal-box">
      <div class="modal-header">
        <h3>{{ editId ? 'Editar FUEC' : 'Nuevo FUEC' }}</h3>
        <button class="btn-close" @click="closeModal"><i class="pi pi-times" /></button>
      </div>

      <div class="modal-body">
        <div class="form-grid">
          <!-- Contratante -->
          <div class="field full">
            <label>Nombre del contratante *</label>
            <input v-model="form.contratante_nombre" />
          </div>
          <div class="field">
            <label>NIT / Cédula contratante *</label>
            <input v-model="form.contratante_nit" />
          </div>
          <div class="field full">
            <label>Descripción del servicio *</label>
            <input v-model="form.descripcion_servicio" />
          </div>

          <!-- Origen / Destino -->
          <div class="field">
            <label>Origen *</label>
            <input v-model="form.origen" />
          </div>
          <div class="field">
            <label>Destino *</label>
            <input v-model="form.destino" />
          </div>
          <div class="field">
            <label>Fecha del servicio *</label>
            <input v-model="form.fecha_servicio" type="date" />
          </div>
          <div class="field">
            <label>Hora *</label>
            <input v-model="form.hora_servicio" type="time" />
          </div>

          <!-- Vehículo -->
          <div class="field full">
            <label>Vehículo *</label>
            <select v-model="form.vehicle_id">
              <option value="">Seleccione un vehículo</option>
              <option v-for="v in vehicles" :key="v._id" :value="v._id">
                {{ v.placa }} — {{ v.marca }} {{ v.modelo }} ({{ v.clase }})
              </option>
            </select>
          </div>

          <!-- Conductor -->
          <div class="field full">
            <label>Conductor (opcional — pre-llena datos)</label>
            <select v-model="form.driver_id" @change="onDriverSelect">
              <option value="">Seleccione o ingrese manualmente</option>
              <option v-for="d in drivers" :key="d._id" :value="d._id">
                {{ d.usuario?.nombre }} {{ d.usuario?.apellido }} — {{ d.usuario?.documentNumber }}
              </option>
            </select>
          </div>
          <div class="field">
            <label>Nombre conductor *</label>
            <input v-model="form.conductor_nombre" />
          </div>
          <div class="field">
            <label>Cédula conductor *</label>
            <input v-model="form.conductor_cedula" />
          </div>
          <div class="field">
            <label>N° Licencia</label>
            <input v-model="form.conductor_no_licencia" />
          </div>
          <div class="field">
            <label>Categoría licencia</label>
            <select v-model="form.conductor_categoria_licencia">
              <option value="">Seleccione</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="B3">B3</option>
              <option value="C1">C1</option>
              <option value="C2">C2</option>
              <option value="C3">C3</option>
            </select>
          </div>
          <div class="field">
            <label>Vencimiento licencia</label>
            <input v-model="form.conductor_vencimiento_licencia" type="date" />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="closeModal">Cancelar</button>
        <button class="btn-primary" :disabled="saving" @click="onSave">
          {{ saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear FUEC' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Modal Detalle -->
  <div v-if="detailItem" class="modal-overlay" @click.self="detailItem = null">
    <div class="modal-box modal-wide">
      <div class="modal-header">
        <h3>FUEC {{ detailItem.numero_fuec }}</h3>
        <button class="btn-close" @click="detailItem = null"><i class="pi pi-times" /></button>
      </div>
      <div class="modal-body">
        <div class="detail-section">
          <h4>Datos del contrato</h4>
          <div class="detail-grid">
            <span class="detail-label">Contratante</span><span>{{ detailItem.contratante_nombre }}</span>
            <span class="detail-label">NIT</span><span>{{ detailItem.contratante_nit }}</span>
            <span class="detail-label">Servicio</span><span>{{ detailItem.descripcion_servicio }}</span>
            <span class="detail-label">Origen</span><span>{{ detailItem.origen }}</span>
            <span class="detail-label">Destino</span><span>{{ detailItem.destino }}</span>
            <span class="detail-label">Fecha</span><span>{{ formatDate(detailItem.fecha_servicio) }} {{ detailItem.hora_servicio }}</span>
          </div>
        </div>
        <div class="detail-section">
          <h4>Vehículo</h4>
          <div class="detail-grid">
            <span class="detail-label">Placa</span><span>{{ detailItem.placa }}</span>
            <span class="detail-label">Clase</span><span>{{ detailItem.clase }}</span>
            <span class="detail-label">Marca / Modelo</span><span>{{ detailItem.marca }} {{ detailItem.modelo }}</span>
            <span class="detail-label">Tarjeta operación</span><span>{{ detailItem.no_tarjeta_opera }} (vence {{ formatDate(detailItem.expiration_tarjeta_opera) }})</span>
            <span class="detail-label">SOAT</span><span>{{ detailItem.no_soat }} (vence {{ formatDate(detailItem.expiration_soat) }})</span>
            <span class="detail-label">RTM</span><span>{{ detailItem.no_rtm }} (vence {{ formatDate(detailItem.expiration_rtm) }})</span>
          </div>
        </div>
        <div class="detail-section">
          <h4>Conductor</h4>
          <div class="detail-grid">
            <span class="detail-label">Nombre</span><span>{{ detailItem.conductor_nombre }}</span>
            <span class="detail-label">Cédula</span><span>{{ detailItem.conductor_cedula }}</span>
            <span class="detail-label">Licencia</span><span>{{ detailItem.conductor_no_licencia }}</span>
            <span class="detail-label">Categoría</span><span>{{ detailItem.conductor_categoria_licencia }}</span>
            <span class="detail-label">Vencimiento</span><span>{{ formatDate(detailItem.conductor_vencimiento_licencia) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Anular -->
  <div v-if="anularItem" class="modal-overlay" @click.self="anularItem = null">
    <div class="modal-box modal-small">
      <div class="modal-header">
        <h3>Anular FUEC {{ anularItem.numero_fuec }}</h3>
        <button class="btn-close" @click="anularItem = null"><i class="pi pi-times" /></button>
      </div>
      <div class="modal-body">
        <label>Motivo de anulación *</label>
        <textarea v-model="anularMotivo" rows="3" style="width:100%; margin-top:8px; border-radius:8px; border:1px solid #d1d5db; padding:8px;" />
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" @click="anularItem = null">Cancelar</button>
        <button class="btn-danger" :disabled="saving" @click="confirmAnular">
          {{ saving ? 'Anulando...' : 'Anular FUEC' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { FuecServiceApi } from '../../api/fuec.service'
import { VehiclesserviceApi } from '../../api/vehicles.service'
import { StaffServiceApi } from '../../api/staff.service'

const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const vehicles = ref<any[]>([])
const drivers = ref<any[]>([])

const filters = ref({ placa: '', estado: '', fecha_desde: '', fecha_hasta: '' })
const showModal = ref(false)
const editId = ref<string | null>(null)
const detailItem = ref<any>(null)
const anularItem = ref<any>(null)
const anularMotivo = ref('')

const emptyForm = () => ({
  vehicle_id: '',
  driver_id: '',
  contratante_nombre: '',
  contratante_nit: '',
  descripcion_servicio: '',
  origen: '',
  destino: '',
  fecha_servicio: '',
  hora_servicio: '',
  conductor_nombre: '',
  conductor_cedula: '',
  conductor_no_licencia: '',
  conductor_categoria_licencia: '',
  conductor_vencimiento_licencia: '',
})

const form = ref(emptyForm())

onMounted(async () => {
  await Promise.all([loadList(), loadVehicles(), loadDrivers()])
  loading.value = false
})

async function loadList() {
  const params: any = { page: page.value, limit: pageSize }
  if (filters.value.placa) params.placa = filters.value.placa
  if (filters.value.estado) params.estado = filters.value.estado
  if (filters.value.fecha_desde) params.fecha_desde = filters.value.fecha_desde
  if (filters.value.fecha_hasta) params.fecha_hasta = filters.value.fecha_hasta

  const res = await FuecServiceApi.list(params)
  items.value = res.data.data
  total.value = res.data.total
}

async function loadVehicles() {
  const res = await VehiclesserviceApi.list({ active: true })
  vehicles.value = res.data?.data ?? res.data ?? []
}

async function loadDrivers() {
  try {
    const res = await StaffServiceApi.list({ roleType: 'driver' })
    drivers.value = res.data?.data ?? res.data ?? []
  } catch {
    drivers.value = []
  }
}

function openCreate() {
  editId.value = null
  form.value = emptyForm()
  showModal.value = true
}

function openEdit(item: any) {
  editId.value = item._id
  form.value = {
    vehicle_id: item.vehicle_id ?? '',
    driver_id: item.driver_id ?? '',
    contratante_nombre: item.contratante_nombre,
    contratante_nit: item.contratante_nit,
    descripcion_servicio: item.descripcion_servicio,
    origen: item.origen,
    destino: item.destino,
    fecha_servicio: item.fecha_servicio?.substring(0, 10) ?? '',
    hora_servicio: item.hora_servicio ?? '',
    conductor_nombre: item.conductor_nombre,
    conductor_cedula: item.conductor_cedula,
    conductor_no_licencia: item.conductor_no_licencia ?? '',
    conductor_categoria_licencia: item.conductor_categoria_licencia ?? '',
    conductor_vencimiento_licencia: item.conductor_vencimiento_licencia?.substring(0, 10) ?? '',
  }
  showModal.value = true
}

function openDetail(item: any) {
  detailItem.value = item
}

function openAnular(item: any) {
  anularItem.value = item
  anularMotivo.value = ''
}

function closeModal() {
  showModal.value = false
}

function onDriverSelect() {
  const driver = drivers.value.find(d => d._id === form.value.driver_id)
  if (!driver) return
  const u = driver.usuario ?? {}
  form.value.conductor_nombre = [u.nombre, u.apellido].filter(Boolean).join(' ')
  form.value.conductor_cedula = u.documentNumber ?? ''
  form.value.conductor_no_licencia = driver.no_licencia_conduccion ?? ''
  form.value.conductor_categoria_licencia = driver.categoria_licencia ?? ''
  form.value.conductor_vencimiento_licencia = driver.vencimiento_licencia_conduccion?.substring(0, 10) ?? ''
}

async function onSave() {
  if (!form.value.vehicle_id || !form.value.contratante_nombre || !form.value.origen || !form.value.destino || !form.value.fecha_servicio || !form.value.conductor_nombre || !form.value.conductor_cedula) {
    alert('Complete los campos obligatorios')
    return
  }
  saving.value = true
  try {
    if (editId.value) {
      await FuecServiceApi.update(editId.value, form.value)
    } else {
      await FuecServiceApi.create(form.value)
    }
    closeModal()
    await loadList()
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Error al guardar')
  } finally {
    saving.value = false
  }
}

async function confirmEmit(item: any) {
  if (!confirm(`¿Emitir el FUEC ${item.numero_fuec}? Una vez emitido solo podrá anularse.`)) return
  saving.value = true
  try {
    await FuecServiceApi.emit(item._id)
    await loadList()
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Error al emitir')
  } finally {
    saving.value = false
  }
}

async function confirmAnular() {
  if (!anularMotivo.value.trim()) { alert('Ingrese el motivo de anulación'); return }
  saving.value = true
  try {
    await FuecServiceApi.anular(anularItem.value._id, anularMotivo.value)
    anularItem.value = null
    await loadList()
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Error al anular')
  } finally {
    saving.value = false
  }
}

function changePage(p: number) {
  page.value = p
  loadList()
}

function printFuec(id: string) {
  router.push({ name: 'fuec-print', params: { id } })
}

function formatDate(val: any) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>

<style scoped>
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: #6b7280; gap: 12px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.page-title { font-size: 20px; font-weight: 700; color: #111827; margin: 0; }
.page-subtitle { font-size: 13px; color: #6b7280; margin: 4px 0 0; }
.filters-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.filter-input, .filter-select { height: 38px; padding: 6px 12px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 13px; }
.empty-state { text-align: center; padding: 60px; color: #9ca3af; }
.items-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.items-table th { background: #1e40af; color: white; padding: 10px 12px; text-align: left; }
.items-table td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
.items-table tr:hover td { background: #f9fafb; }
.actions-cell { display: flex; gap: 6px; }
.badge { padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.badge-borrador { background: #fef3c7; color: #92400e; }
.badge-emitido  { background: #d1fae5; color: #065f46; }
.badge-anulado  { background: #fee2e2; color: #991b1b; }
.btn-icon { background: none; border: 1px solid #d1d5db; border-radius: 6px; padding: 4px 8px; cursor: pointer; color: #374151; }
.btn-icon.btn-edit { border-color: #2563eb; color: #2563eb; }
.btn-icon.btn-success { border-color: #059669; color: #059669; }
.btn-icon.btn-danger { border-color: #dc2626; color: #dc2626; }
.btn-icon.btn-print { border-color: #7c3aed; color: #7c3aed; }
.pagination { display: flex; align-items: center; gap: 12px; justify-content: center; margin-top: 20px; font-size: 13px; color: #6b7280; }
.btn-primary { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
.btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 10px; padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-secondary.btn-sm { padding: 6px 14px; }
.btn-danger { background: #dc2626; color: #fff; border: none; border-radius: 10px; padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.modal-box { background: white; border-radius: 16px; width: 100%; max-width: 680px; max-height: 90vh; display: flex; flex-direction: column; }
.modal-box.modal-wide { max-width: 800px; }
.modal-box.modal-small { max-width: 440px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e5e7eb; }
.modal-header h3 { font-size: 16px; font-weight: 700; color: #111827; margin: 0; }
.btn-close { background: none; border: none; cursor: pointer; font-size: 16px; color: #6b7280; padding: 4px; }
.modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #e5e7eb; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
.field { display: flex; flex-direction: column; }
.field.full { grid-column: 1 / -1; }
label { font-size: 12px; font-weight: 600; color: #4b5563; margin-bottom: 5px; }
input, select { height: 38px; padding: 6px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 13px; }
.detail-section { margin-bottom: 20px; }
.detail-section h4 { font-size: 14px; font-weight: 700; color: #1e40af; margin: 0 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
.detail-grid { display: grid; grid-template-columns: 160px 1fr; gap: 6px 12px; font-size: 13px; }
.detail-label { color: #6b7280; font-weight: 600; }
</style>
