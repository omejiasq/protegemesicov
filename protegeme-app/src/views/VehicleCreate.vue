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
            <label>Modelo</label>
            <input v-model="form.modelo" type="number" />
          </div>

          <div class="field">
            <label>Kilometraje</label>
            <input v-model="form.kilometraje" type="number" />
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
            <label>Interno</label>
            <input v-model="form.interno" type="text" />
          </div>

          <div class="field">
            <label>Motor</label>
            <input v-model="form.motor" type="text" />
          </div>

          <div class="field">
            <label>Chasis</label>
            <input v-model="form.chasis" type="text" />
          </div>

          <div class="field">
            <label>Capacidad</label>
            <input v-model="form.capacidad" type="number" />
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
          <div class="field full">
            <label>Nombre del Propietario</label>
            <input v-model="form.nombre_propietario" type="text" />
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

const vehiclesStore = useVehiclesStore()
const driversStore = useDriversStore()
const router = useRouter()

const loading = ref(false)
const drivers = ref([])

const form = ref({
  placa: '',
  modelo: null,
  kilometraje: null,
  tipo_vehiculo: '',
  modalidad: '',
  interno: '',
  motor: '',
  chasis: '',
  capacidad: null,
  nombre_propietario: '',
  driver_id: null,
  driver2_id: null,
})

/* ================== CARGAR CONDUCTORES (IGUAL AL EDIT) ================== */
const loadDrivers = async () => {
  const { items } = await driversStore.list({ estado: true })

  drivers.value = items.map(d => ({
    _id: d._id,
    nombre: [
      d.usuario.nombre,
    ].filter(Boolean).join(' '),
  }))
}

/* ================== CREAR VEHÍCULO ================== */
const submit = async () => {
  if (form.value.placa.length !== 6) {
    alert('La placa debe tener 6 caracteres')
    return
  }

  loading.value = true

  try {
    await vehiclesStore.create({
      placa: form.value.placa,
      modelo: form.value.modelo,
      kilometraje: form.value.kilometraje,
      tipo_vehiculo: form.value.tipo_vehiculo,
      modalidad: form.value.modalidad,
      no_interno: form.value.interno,
      motor: form.value.motor,
      no_chasis: form.value.chasis,
      capacidad: form.value.capacidad,
      nombre_propietario: form.value.nombre_propietario,
      driver_id: form.value.driver_id,
      driver2_id: form.value.driver2_id,
      nivelServicio: 1
    })

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
