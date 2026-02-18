<template>
  <div class="report-wrapper" v-if="loading">
    <p>Cargando reporte...</p>
  </div>

  <div v-else class="report-wrapper">

    <!-- HEADER -->
    <div class="report-header">
      <div>
        <h2>REVISIÓN DE MANTENIMIENTO CORRECTIVO - COOTRANSHUILA LTDA</h2>
  
      </div>
      <div class="report-meta">
   
        <p><strong>Fecha:</strong> {{ formatDate(data.corrective.fecha) }} {{ data.corrective.hora }}</p>
      </div>
    </div>

    <!-- INFORMACIÓN GENERAL -->
    <section class="card">
      <h3>Información General</h3>
      <div class="grid">
        <div><strong>Placa:</strong> {{ data.corrective.placa }}</div>
        <div><strong>Estado:</strong> {{ data.corrective.estado ? 'ACTIVO' : 'INACTIVO' }}</div>
        <div><strong>Detalle:</strong> {{ data.corrective.detalleActividades }}</div>
      </div>
    </section>

    <!-- VEHÍCULO -->
    <section class="card">
      <h3>Información del Vehículo</h3>
      <div class="grid">
        <div><strong>Clase:</strong> {{ data.vehicle.clase }}</div>
        <div><strong>Marca:</strong> {{ data.vehicle.marca }}</div>
        <div><strong>Modelo:</strong> {{ data.vehicle.modelo }}</div>
        <div><strong>Servicio:</strong> {{ data.vehicle.servicio }}</div>
        <div><strong>Modalidad:</strong> {{ data.vehicle.modalidad }}</div>
        <div><strong>Capacidad:</strong> {{ data.vehicle.capacidad }}</div>
        <div><strong>Motor:</strong> {{ data.vehicle.motor }}</div>
        <div><strong>Chasis:</strong> {{ data.vehicle.no_chasis }}</div>
      </div>
    </section>

    <!-- PROPIETARIO -->
    <section class="card">
      <h3>Propietario</h3>
      <div class="grid">
        <div><strong>Nombre:</strong> {{ data.vehicle.nombre_propietario }}</div>
        <div><strong>Cédula:</strong> {{ data.vehicle.cedula_propietario }}</div>
      </div>
    </section>

    <!-- RESPONSABLE -->
    <section class="card">
      <h3>Responsable del Mantenimiento</h3>
      <div class="grid">
        <div><strong>Nombre:</strong> {{ data.corrective.nombresResponsable }}</div>
        <div><strong>Documento:</strong> {{ data.corrective.numeroIdentificacion }}</div>
        <div><strong>Empresa:</strong> {{ data.corrective.razonSocial }}</div>
        <div><strong>NIT:</strong> {{ data.corrective.nit }}</div>
      </div>
    </section>

    <!-- CONDUCTOR -->
    <section class="card" v-if="data.people">
      <h3>Conductor</h3>
      <div class="grid">
        <div><strong>Nombre:</strong> {{ data.people.conductorNombre }}</div>
        <div><strong>Cédula:</strong> {{ data.people.conductorCedula }}</div>
        <div><strong>Empresa:</strong> {{ data.people.empresaNombre }}</div>
        <div><strong>NIT:</strong> {{ data.people.empresaNit }}</div>
        <div><strong>Teléfono:</strong> {{ data.people.empresaTelefono }}</div>
      </div>
    </section>

    <!-- ITEMS -->
    <section class="card">
      <h3>Resultado de Inspección</h3>

      <table>
        <thead>
          <tr>
            <th>Parte</th>
            <th>Tipo Falla</th>
            <th>Observación</th>
            <th>Plan de Acción</th>
            <th>Responsable</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in data.items"
            :key="item._id"
            :class="getFallaClass(item.tipoFalla)"
          >
            <td>{{ item.itemId.dispositivo }}</td>

            <td>{{ item.tipoFalla }}</td>
            <td>{{ item.observacion }}</td>
            <td>{{ item.planAccion }}</td>
            <td>{{ item.responsable }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- BOTÓN IMPRIMIR -->
    <div class="actions">
      <button @click="printReport">Imprimir / PDF</button>
    </div>

  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const id = route.params.id
console.log('id:'+id+':');

const data = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
   const urlId = route.params.id

    console.log('ID capturado:', urlId)

    if (!urlId) {
      alert('No se recibió el ID en la ruta')
      return
    }

    const response = await axios.get(
      `https://sicov.protegeme.com.co/api/maintenance/maintenance-corrective/${urlId}/report`,
      //`https://sicov.protegeme.com.co/api/maintenance/maintenance-corrective/6993a70f567c9622d81acc29/report`,

      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    )

    data.value = response.data
  } catch (error) {
    console.error(error)
    alert('Error cargando reporte')
  } finally {
    loading.value = false
  }
})

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('es-CO')
}

function printReport() {
  window.print()
}

function getFallaClass(tipo) {
  if (tipo === 'A') return 'falla-a'
  if (tipo === 'B') return 'falla-b'
  return 'falla-c'
}
</script>

<style scoped>

.report-wrapper {
  max-width: 1100px;
  margin: auto;
  padding: 30px;
  background: white;
  font-family: Arial, sans-serif;
}

.report-header {
  display: flex;
  justify-content: space-between;
  border-bottom: 2px solid #222;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

.card {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f3f3f3;
}

th, td {
  border: 1px solid #ccc;
  padding: 8px;
  font-size: 14px;
}

.falla-a {
  background-color: #ffe5e5;
}

.falla-b {
  background-color: #fff8d6;
}

.falla-c {
  background-color: #e8f7e8;
}

.actions {
  text-align: right;
  margin-top: 20px;
}

button {
  padding: 10px 20px;
  background: #111;
  color: white;
  border: none;
  cursor: pointer;
}

@media print {
  button {
    display: none;
  }

  body {
    margin: 0;
  }
}

</style>
