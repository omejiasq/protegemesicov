<template>
  <div class="vehicle-edit">
    <div class="card">

      <h2 class="title">Editar Vehículo</h2>

      <!-- ================= DATOS GENERALES ================= -->
      <h3 class="section">Datos Generales</h3>

      <div class="grid">
        <div class="field">
          <label>Placa</label>
          <input v-model="form.placa" type="text" disabled />
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
          <input v-model="form.servicio" type="text" />
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
      </div>

<!-- ================= CONDUCTORES ================= -->
<h3 class="section">Conductores</h3>

<div class="grid">
  <div class="field">
    <label>Conductor Principal</label>
    <select v-model="form.driver_id">
      <option :value="null">Sin asignar</option>
      <option
        v-for="d in drivers"
        :key="d._id"
        :value="d._id"
      >
        {{ d.nombre }}
      </option>
    </select>
  </div>

  <div class="field">
    <label>Conductor Secundario</label>
    <select v-model="form.driver2_id">
      <option :value="null">Sin asignar</option>
      <option
        v-for="d in drivers"
        :key="d._id"
        :value="d._id"
      >
        {{ d.nombre }}
      </option>
    </select>
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
          <label>No. Tecnomecánica</label>
          <input v-model="form.no_tecnomecanica" type="text" />
        </div>

        <div class="field">
          <label>Vencimiento Tecnomecánica</label>
          <input v-model="form.expiration_tecnomecanica" type="date" />
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
        <button class="btn-primary" @click="submit">
          Guardar Cambios
        </button>
      </div>

    </div>
  </div>
</template>




<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { useVehiclesStore } from '../stores/vehiclesStore'
import { useDriversStore } from '../stores/driversStore'

const vehiclesStore = useVehiclesStore()
const driversStore = useDriversStore()

const route = useRoute()
const router = useRouter()
const vehicleId = route.params.id

const API = 'https://sicov.protegeme.com.co/api'
const token = localStorage.getItem('token')

const headers = {
  Authorization: `Bearer ${token}`,
}

// datos originales
const vehicle = ref({})

// formulario editable
const form = ref({})

// lista de conductores
const drivers = ref([])

const props = defineProps<{
  id?: string
}>()


/* ===============================
 * CARGAR VEHÍCULO
 * =============================== */
const loadVehicle = async () => {
  const data = await vehiclesStore.get(vehicleId as string)
  vehicle.value = data

  vehicle.value = data

  form.value = {
    placa: data.placa ?? '',

    clase: data.clase ?? '',
    marca: data.marca ?? '',
    linea: data.Linea ?? '',
    servicio: data.servicio ?? '',
    modelo: data.modelo ?? '',
    combustible: data.combustible ?? '',
    color: data.color ?? '',
    kilometraje: data.kilometraje ?? null,
    cilindraje: data.cilindraje ?? null,
  
    // ===== CONDUCTORES =====
    driver_id: data.driver_id?._id ?? data.driver_id ?? null,
    driver2_id: data.driver2_id?._id ?? data.driver2_id ?? null,
    
    nombre_propietario: data.nombre_propietario ?? '',
    cedula_propietario: data.cedula_propietario ?? '',
    telefono_propietario: data.telefono_propietario ?? '',
    direccion_propietario: data.direccion_propietario ?? '',

    no_rtm: data.no_rtm ?? '',
    expiration_rtm: formatDate(data.expiration_rtm),

    no_soat: data.no_soat ?? '',
    expiration_soat: formatDate(data.expiration_soat),

    no_rcc: data.no_rcc ?? '',
    expiration_rcc: formatDate(data.expiration_rcc),

    no_rce: data.no_rce ?? '',
    expiration_rce: formatDate(data.expiration_rce),

    no_tecnomecanica: data.no_tecnomecanica ?? '',
    expiration_tecnomecanica: formatDate(data.expiration_tecnomecanica),

    no_tarjeta_opera: data.no_tarjeta_opera ?? '',
    expiration_tarjeta_opera: formatDate(data.expiration_tarjeta_opera),
  }
}


/* ===============================
 * CARGAR CONDUCTORES
 * (URL la defines luego)
 * =============================== */
const loadDrivers = async () => {
  /*
  const { data } = await axios.get(
    'https://sicov.protegeme.com.co/api/users/drivers',
    { headers },
  )*/
/*
  drivers.value = data.map(d => ({
    _id: d._id,
    nombre: `${d.usuario.nombre} `,
  }))
  */
  const { items } = await driversStore.list({ estado: true })

  drivers.value = items.map(d => ({
    _id: d._id,
    nombre: [
      d.usuario.nombre,
      //d.primerApellidoPrincipal,
    ].filter(Boolean).join(' '),
  }))

}

/* ===============================
 * ENVIAR SOLO CAMPOS MODIFICADOS
 * =============================== */
const submit = async () => {
  const payload: any = {}

  Object.keys(form.value).forEach(key => {
    const newVal = form.value[key]
    const oldVal = vehicle.value[key]

    // ❌ no enviar undefined
    if (newVal === undefined) return

    // ❌ no enviar strings vacíos
    if (newVal === '') return

    // ❌ fechas inválidas
    if (
      key.startsWith('expiration') ||
      key.startsWith('expedition')
    ) {
      if (!newVal || newVal === 'Invalid Date') return
    }

    // ❌ ObjectId vacíos
    if (
      (key === 'driver_id' || key === 'driver2_id') &&
      !newVal
    ) {
      return
    }

    if (newVal !== oldVal) {
      payload[key] = newVal
    }
  })

  if (!Object.keys(payload).length) {
    alert('No hay cambios para guardar')
    return
  }

  try {
    await vehiclesStore.update(vehicleId as string, payload)

    alert('Vehículo actualizado')
    router.push({ name: 'vehicles' })

  } catch (err: any) {
    console.error('ERROR BACKEND:', err.response?.data || err)
    alert('Error guardando el vehículo. Revisa los datos.')
  }
}


/* ===============================
 * UTIL
 * =============================== */
const formatDate = (value) => {
  if (!value) return null
  return new Date(value).toISOString().slice(0, 10)
}

onMounted(() => {
  if (props.id) {
    //store.fetchById(props.id)
  }
  loadVehicle()
  loadDrivers()
})
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

/* GRID */
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

/* LABEL */
label {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
  color: #4b5563;
}

/* INPUTS */
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

input:disabled {
  background: #f3f4f6;
  color: #6b7280;
}

/* ACTIONS */
.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 32px;
}

/* BOTÓN AZUL MODERNO */
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

/* RESPONSIVE */
@media (max-width: 640px) {
  .card {
    padding: 20px;
  }

  .actions {
    justify-content: center;
  }

  .btn-primary {
    width: 100%;
  }
}
</style>
