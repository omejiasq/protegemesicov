<template>
  <div class="vehicle-edit">
    <div class="card">

      <h2 class="title">Crear Vehículo</h2>

      <!-- ================= DATOS GENERALES ================= -->
      <h3 class="section">Datos Generales</h3>

      <form @submit.prevent="submit">

        <div class="grid">
          <div class="field">
            <label>Placa *</label>
            <input v-model="form.placa" type="text" maxlength="6" />
          </div>

          <div class="field">
            <label>Clase</label>
            <input v-model="form.clase" type="text" />
          </div>

          <div class="field">
            <label>Marca</label>
            <input v-model="form.marca" type="text" />
          </div>

          <div class="field">
            <label>Línea</label>
            <input v-model="form.linea" type="text" />
          </div>

          <div class="field">
            <label>Servicio</label>
            <select v-model="form.servicio">
              <option value="PUBLICO">PUBLICO</option>
              <option value="PRIVADO">PRIVADO</option>
            </select>
          </div>

          <div class="field">
            <label>Modelo</label>
            <input v-model="form.modelo" type="text" />
          </div>

          <div class="field">
            <label>Combustible</label>
            <input v-model="form.combustible" type="text" />
          </div>

          <div class="field">
            <label>Color</label>
            <input v-model="form.color" type="text" />
          </div>

          <div class="field">
            <label>Kilometraje</label>
            <input v-model="form.kilometraje" type="number" min="0" />
          </div>

          <div class="field">
            <label>Cilindraje</label>
            <input v-model="form.cilindraje" type="number" min="0" />
          </div>

          <div class="field">
            <label>Tipo Vehículo</label>
            <input v-model="form.tipo_vehiculo" type="text" />
          </div>

          <div class="field">
            <label>Modalidad</label>
            <input v-model="form.modalidad" type="text" />
          </div>

          <div class="field">
            <label>No. Interno</label>
            <input v-model="form.no_interno" type="text" />
          </div>

          <div class="field">
            <label>Motor</label>
            <input v-model="form.motor" type="text" />
          </div>

          <div class="field">
            <label>No. Chasis</label>
            <input v-model="form.no_chasis" type="text" />
          </div>

          <div class="field">
            <label>Capacidad</label>
            <input v-model="form.capacidad" type="number" min="0" />
          </div>
        </div>

        <!-- ================= CONDUCTORES ================= -->
        <h3 class="section">Conductores</h3>

        <div class="grid">
          <div class="field">
            <label>Conductor Principal</label>
            <DriverSearchInput
              v-model="form.driver_id"
              :drivers="drivers"
              placeholder="Buscar por N° documento o nombre..."
            />
          </div>

          <div class="field">
            <label>Conductor Secundario</label>
            <DriverSearchInput
              v-model="form.driver2_id"
              :drivers="drivers"
              placeholder="Buscar por N° documento o nombre..."
            />
          </div>
        </div>

        <!-- ================= PROPIETARIO ================= -->
        <h3 class="section">Propietario</h3>

        <div class="grid">
          <div class="field">
            <label>Nombre</label>
            <input v-model="form.nombre_propietario" type="text" />
          </div>

          <div class="field">
            <label>Cédula</label>
            <input v-model="form.cedula_propietario" type="text" />
          </div>

          <div class="field">
            <label>Teléfono</label>
            <input v-model="form.telefono_propietario" type="tel" />
          </div>

          <div class="field full">
            <label>Dirección</label>
            <input v-model="form.direccion_propietario" type="text" />
          </div>
        </div>

        <!-- ================= DOCUMENTACIÓN ================= -->
        <h3 class="section">Documentación</h3>

        <div class="grid">
          <div class="field">
            <label>No. RTM</label>
            <input v-model="form.no_rtm" type="text" />
          </div>

          <div class="field">
            <label>Vencimiento RTM</label>
            <input v-model="form.expiration_rtm" type="date" />
          </div>

          <div class="field">
            <label>No. SOAT</label>
            <input v-model="form.no_soat" type="text" />
          </div>

          <div class="field">
            <label>Vencimiento SOAT</label>
            <input v-model="form.expiration_soat" type="date" />
          </div>

          <div class="field">
            <label>No. RCC</label>
            <input v-model="form.no_rcc" type="text" />
          </div>

          <div class="field">
            <label>Vencimiento RCC</label>
            <input v-model="form.expiration_rcc" type="date" />
          </div>

          <div class="field">
            <label>No. RCE</label>
            <input v-model="form.no_rce" type="text" />
          </div>

          <div class="field">
            <label>Vencimiento RCE</label>
            <input v-model="form.expiration_rce" type="date" />
          </div>

          <div class="field">
            <label>No. Tarjeta Operación</label>
            <input v-model="form.no_tarjeta_opera" type="text" />
          </div>

          <div class="field">
            <label>Vencimiento Tarjeta Operación</label>
            <input v-model="form.expiration_tarjeta_opera" type="date" />
          </div>
        </div>

        <!-- ================= ACCIONES ================= -->
        <div class="actions">
          <button class="btn-primary" :disabled="loading">
            {{ loading ? 'Guardando...' : 'Crear Vehículo' }}
          </button>
        </div>

      </form>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useVehiclesStore } from '../stores/vehiclesStore'
import { useDriversStore } from '../stores/driversStore'
import { useRouter } from 'vue-router'
import DriverSearchInput from '../components/DriverSearchInput.vue'

const vehiclesStore = useVehiclesStore()
const driversStore = useDriversStore()
const router = useRouter()

const loading = ref(false)
const drivers = ref([])

const form = ref({
  placa: '',
  tipo_servicio: 'CARRETERA' as 'CARRETERA' | 'ESPECIAL',
  clase: '',
  marca: '',
  linea: '',
  servicio: 'PUBLICO',
  modelo: '',
  combustible: '',
  color: '',
  kilometraje: null,
  cilindraje: null,
  tipo_vehiculo: '',
  modalidad: '',
  no_interno: '',
  motor: '',
  no_chasis: '',
  capacidad: null,

  driver_id: null,
  driver2_id: null,

  nombre_propietario: '',
  cedula_propietario: '',
  telefono_propietario: '',
  direccion_propietario: '',

  no_rtm: '',
  expiration_rtm: '',
  no_soat: '',
  expiration_soat: '',
  no_rcc: '',
  expiration_rcc: '',
  no_rce: '',
  expiration_rce: '',
  no_tarjeta_opera: '',
  expiration_tarjeta_opera: '',
})

const loadDrivers = async () => {
  const { items } = await driversStore.list({ estado: true })
  drivers.value = items.map(d => ({
    _id: d._id,
    nombre: [d.usuario.nombre, d.usuario.apellido].filter(Boolean).join(' '),
    documentNumber: d.usuario?.documentNumber ?? '',
  }))
}

const submit = async () => {
  if (form.value.placa.length !== 6) {
    alert('La placa debe tener 6 caracteres')
    return
  }

  loading.value = true

  try {
    const payload: any = {
      placa: form.value.placa,
      nivelServicio: 1,
      tipo_servicio: 'CARRETERA',
    }

    // Campos opcionales de texto
    const textFields = [
      'clase', 'marca', 'servicio', 'modelo', 'combustible', 'color',
      'tipo_vehiculo', 'modalidad', 'no_interno', 'motor', 'no_chasis',
      'nombre_propietario', 'cedula_propietario', 'telefono_propietario',
      'direccion_propietario',
      'no_rtm', 'expiration_rtm',
      'no_soat', 'expiration_soat',
      'no_rcc', 'expiration_rcc',
      'no_rce', 'expiration_rce',
      'no_tarjeta_opera', 'expiration_tarjeta_opera',
    ]
    for (const key of textFields) {
      if (form.value[key]) payload[key] = form.value[key]
    }

    // Linea tiene nombre diferente en el backend
    if (form.value.linea) payload.Linea = form.value.linea

    // Campos numéricos
    if (form.value.kilometraje != null) payload.kilometraje = form.value.kilometraje
    if (form.value.cilindraje != null) payload.cilindraje = form.value.cilindraje
    if (form.value.capacidad != null) payload.capacidad = form.value.capacidad

    // Conductores
    if (form.value.driver_id) payload.driver_id = form.value.driver_id
    if (form.value.driver2_id) payload.driver2_id = form.value.driver2_id

    await vehiclesStore.create(payload)

    alert('Vehículo creado correctamente')
    router.push({ name: 'vehicles' })

  } catch (e) {
    alert('Error creando vehículo')
  } finally {
    loading.value = false
  }
}

onMounted(loadDrivers)
</script>

<style scoped>
.vehicle-edit {
  padding: 24px;
  display: flex;
  justify-content: center;
}

.card {
  width: 100%;
  max-width: 1100px;
  background: #ffffff;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

.title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #1f2937;
}

.section {
  margin: 32px 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
}

.field.full {
  grid-column: 1 / -1;
}

label {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
  color: #4b5563;
}

input,
select {
  height: 42px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  font-size: 14px;
  transition: all 0.2s ease;
}

input:focus,
select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 32px;
}

.btn-primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 12px 28px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
}

.btn-primary:active {
  transform: scale(0.97);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 640px) {
  .card { padding: 20px; }
  .actions { justify-content: center; }
  .btn-primary { width: 100%; }
}
</style>
