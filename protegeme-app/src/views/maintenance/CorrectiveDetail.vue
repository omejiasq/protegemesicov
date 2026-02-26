<template>
  <!-- CARGANDO -->
  <div class="report-wrapper" v-if="loading">
    <div class="loading-box">
      <div class="spinner"></div>
      <p>Cargando reporte...</p>
    </div>
  </div>

  <div v-else class="report-wrapper">

    <!-- HEADER -->
    <div class="report-header">
      <div class="header-logo-area">
      <div class="header-badge" style="text-transform: uppercase;">{{ data.corrective.razonSocial }}</div>
        <h2>REVISIÓN DE MANTENIMIENTO CORRECTIVO</h2>
      </div>
      <div class="report-meta">
        <div class="meta-item">
          <span class="meta-label">FECHA</span>
          <span class="meta-value">{{ formatDate(data.corrective.fecha) }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">HORA</span>
          <span class="meta-value">{{ data.corrective.hora }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">PLACA</span>
          <span class="meta-value placa-badge">{{ data.corrective.placa }}</span>
        </div>
      </div>
    </div>

    <!-- INFORMACIÓN GENERAL -->
    <section class="card">
      <h3 class="card-title">
        <span class="card-icon">📋</span> Información General
      </h3>
      <div class="grid">
        <div class="field">
          <span class="field-label">Placa</span>
          <span class="field-value">{{ data.corrective.placa }}</span>
        </div>
        <div class="field">
          <span class="field-label">Estado</span>
          <span class="field-value">
            <span :class="data.corrective.estado ? 'badge-active' : 'badge-inactive'">
              {{ data.corrective.estado ? 'ACTIVO' : 'INACTIVO' }}
            </span>
          </span>
        </div>
        <div class="field field-full">
          <span class="field-label">Detalle de actividades</span>
          <span class="field-value">{{ data.corrective.detalleActividades }}</span>
        </div>
      </div>
    </section>

    <!-- VEHÍCULO -->
    <section class="card">
      <h3 class="card-title">
        <span class="card-icon">🚌</span> Información del Vehículo
      </h3>
      <div class="grid">
        <div class="field"><span class="field-label">Clase</span><span class="field-value">{{ data.vehicle.clase }}</span></div>
        <div class="field"><span class="field-label">Marca</span><span class="field-value">{{ data.vehicle.marca }}</span></div>
        <div class="field"><span class="field-label">Modelo</span><span class="field-value">{{ data.vehicle.modelo }}</span></div>
        <div class="field"><span class="field-label">Servicio</span><span class="field-value">{{ data.vehicle.servicio }}</span></div>
        <div class="field"><span class="field-label">Modalidad</span><span class="field-value">{{ data.vehicle.modalidad }}</span></div>
        <div class="field"><span class="field-label">Capacidad</span><span class="field-value">{{ data.vehicle.capacidad }} pasajeros</span></div>
        <div class="field"><span class="field-label">Motor</span><span class="field-value">{{ data.vehicle.motor }}</span></div>
        <div class="field"><span class="field-label">Chasis</span><span class="field-value">{{ data.vehicle.no_chasis }}</span></div>
        <div class="field"><span class="field-label">No. Interno</span><span class="field-value">{{ data.vehicle.no_interno }}</span></div>
        <div class="field"><span class="field-label">Tipo</span><span class="field-value">{{ data.vehicle.tipo }}</span></div>
      </div>
    </section>

    <!-- PROPIETARIO -->
    <section class="card">
      <h3 class="card-title">
        <span class="card-icon">👤</span> Propietario
      </h3>
      <div class="grid">
        <div class="field"><span class="field-label">Nombre</span><span class="field-value">{{ data.vehicle.nombre_propietario }}</span></div>
        <div class="field"><span class="field-label">Cédula</span><span class="field-value">{{ data.vehicle.cedula_propietario }}</span></div>
      </div>
    </section>

    <!-- RESPONSABLE -->
    <section class="card">
      <h3 class="card-title">
        <span class="card-icon">🔧</span> Responsable del Mantenimiento
      </h3>
      <div class="grid">
        <div class="field"><span class="field-label">Nombre</span><span class="field-value">{{ data.corrective.nombresResponsable }}</span></div>
        <div class="field"><span class="field-label">Documento</span><span class="field-value">{{ data.corrective.numeroIdentificacion }}</span></div>
        <div class="field"><span class="field-label">Empresa</span><span class="field-value">{{ data.corrective.razonSocial }}</span></div>
        <div class="field"><span class="field-label">NIT</span><span class="field-value">{{ data.corrective.nit }}</span></div>
      </div>
    </section>

    <!-- CONDUCTOR -->
    <section class="card" v-if="data.people && data.people.conductorNombre">
      <h3 class="card-title">
        <span class="card-icon">🧑‍✈️</span> Conductor
      </h3>
      <div class="grid">
        <div class="field"><span class="field-label">Nombre</span><span class="field-value">{{ data.people.conductorNombre }}</span></div>
        <div class="field"><span class="field-label">Cédula</span><span class="field-value">{{ data.people.conductorCedula }}</span></div>
        <div class="field"><span class="field-label">Empresa</span><span class="field-value">{{ data.people.empresaNombre }}</span></div>
        <div class="field"><span class="field-label">NIT</span><span class="field-value">{{ data.people.empresaNit }}</span></div>
        <div class="field"><span class="field-label">Teléfono</span><span class="field-value">{{ data.people.empresaTelefono }}</span></div>
      </div>
    </section>

  <!-- EVIDENCIA FOTOGRÁFICA -->
  <section class="card" v-if="data.corrective.evidencia_foto">
    <h3 class="card-title">
      <span class="card-icon">📷</span> Evidencia Fotográfica
    </h3>
    <div class="evidencia-container">

      <!-- Cargando imagen -->
      <div v-if="imageLoading" class="img-loading">
        <div class="spinner"></div>
        <p>Cargando imagen...</p>
      </div>

      <!-- Imagen cargada correctamente -->
      <img
        v-else-if="imageUrl && !imgError"
        :src="imageUrl"
        alt="Foto de evidencia del mantenimiento"
        class="evidencia-img"
        @error="imgError = true"
      />

      <!-- Error al cargar -->
      <div v-else class="img-error-box">
        <span class="img-error-icon">⚠️</span>
        <p class="img-error-text">No se pudo cargar la imagen.</p>
        <p class="img-error-hint">Verifique la conexión o contacte al administrador.</p>
      </div>

    </div>
  </section>

  <!-- SIN FOTO -->
  <section class="card" v-else>
    <h3 class="card-title">
      <span class="card-icon">📷</span> Evidencia Fotográfica
    </h3>
    <div class="empty-items">
      📵 No se adjuntó foto de evidencia en este mantenimiento.
    </div>
  </section>

    <!-- ITEMS -->
    <section class="card">
      <h3 class="card-title">
        <span class="card-icon">🔍</span> Resultado de Inspección
      </h3>

      <div v-if="!data.items || data.items.length === 0" class="empty-items">
        No se registraron fallas en esta inspección.
      </div>

      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Parte / Dispositivo</th>
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
              <td>{{ item.itemId?.dispositivo ?? item.itemId }}</td>
              <td class="falla-badge-cell">
                <span :class="'falla-badge falla-badge-' + item.tipoFalla">
                  {{ item.tipoFalla }}
                </span>
              </td>
              <td>{{ item.observacion }}</td>
              <td>{{ item.planAccion }}</td>
              <td>{{ item.responsable }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- LEYENDA -->
      <div class="leyenda">
        <span class="leyenda-item falla-a-bg">A — Falla crítica</span>
        <span class="leyenda-item falla-b-bg">B — Falla moderada</span>
        <span class="leyenda-item falla-ok-bg">OK — Sin falla</span>
      </div>
    </section>

    <!-- FIRMA -->
    <section class="card firma-section">
      <div class="firma-box">
        <div class="firma-line"></div>
        <p class="firma-label">{{ data.corrective.nombresResponsable }}</p>
        <p class="firma-sub">Ingeniero Mecánico Responsable</p>
        <p class="firma-sub">CC. {{ data.corrective.numeroIdentificacion }}</p>
      </div>
    </section>

    <!-- ACCIONES -->
    <div class="actions no-print">
      <button class="btn-print" @click="printReport">
        🖨️ Imprimir / Guardar PDF
      </button>
    </div>

  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const data = ref(null)
const loading = ref(true)
const imgError = ref(false)

const imageUrl = ref(null)

async function loadImage(url) {
  if (!url) return
  try {
    const response = await axios.get(
      `https://sicov.protegeme.com.co/api/maintenance/files/proxy?url=${encodeURIComponent(url)}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      }
    )
    imageUrl.value = URL.createObjectURL(response.data)
  } catch {
    imgError.value = true
  }
}

onMounted(async () => {
  try {
    const urlId = route.params.id
    if (!urlId) {
      alert('No se recibió el ID en la ruta')
      return
    }

    const response = await axios.get(
      `https://sicov.protegeme.com.co/api/maintenance/maintenance-corrective/${urlId}/report`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    )

    data.value = response.data
    await loadImage(data.value.corrective.evidencia_foto) // ✅ agregar esta línea
  } catch (error) {
    console.error(error)
    alert('Error cargando reporte')
  } finally {
    loading.value = false
  }
})

function formatDate(date) {
  if (!date) return ''
  // Evita desfase de zona horaria parseando como local
  const [year, month, day] = date.split('T')[0].split('-')
  return `${day}/${month}/${year}`
}

function printReport() {
  window.print()
}

function getFallaClass(tipo) {
  if (tipo === 'A') return 'falla-a'
  if (tipo === 'B') return 'falla-b'
  return 'falla-ok'
}
</script>

<style scoped>
/* ────────────────────────────────────────────
   BASE
──────────────────────────────────────────── */
.report-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px;
  background: #ffffff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #1a1a2e;
}

/* ────────────────────────────────────────────
   LOADING
──────────────────────────────────────────── */
.loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 16px;
  color: #555;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #ddd;
  border-top-color: #1a56db;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ────────────────────────────────────────────
   HEADER
──────────────────────────────────────────── */
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 3px solid #1a56db;
  padding-bottom: 16px;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.header-badge {
  display: inline-block;
  background: #1a56db;
  color: white;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  padding: 4px 10px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.report-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a2e;
  max-width: 520px;
}

.report-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: right;
}

.meta-item {
  display: flex;
  flex-direction: column;
}

.meta-label {
  font-size: 10px;
  font-weight: 700;
  color: #888;
  letter-spacing: 1px;
}

.meta-value {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
}

.placa-badge {
  background: #1a56db;
  color: white;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 15px;
  letter-spacing: 2px;
}

/* ────────────────────────────────────────────
   CARDS
──────────────────────────────────────────── */
.card {
  margin-bottom: 18px;
  padding: 18px 20px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.card-title {
  margin: 0 0 14px 0;
  font-size: 14px;
  font-weight: 700;
  color: #1a56db;
  letter-spacing: 0.5px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.card-icon {
  margin-right: 6px;
}

/* ────────────────────────────────────────────
   GRID DE CAMPOS
──────────────────────────────────────────── */
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 24px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.field-full {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 10px;
  font-weight: 700;
  color: #9ca3af;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.field-value {
  font-size: 14px;
  color: #1a1a2e;
}

/* ────────────────────────────────────────────
   BADGES ESTADO
──────────────────────────────────────────── */
.badge-active {
  background: #d1fae5;
  color: #065f46;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
}

.badge-inactive {
  background: #fee2e2;
  color: #991b1b;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
}

/* ────────────────────────────────────────────
   EVIDENCIA FOTOGRÁFICA
──────────────────────────────────────────── */
.evidencia-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 0;
  min-height: 120px;
}

.evidencia-img {
  max-width: 100%;
  max-height: 520px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  object-fit: contain;
  box-shadow: 0 2px 12px rgba(0,0,0,0.10);
}

.img-error-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px;
  background: #fff7ed;
  border: 1px dashed #f97316;
  border-radius: 8px;
  width: 100%;
  text-align: center;
}

.img-error-icon { font-size: 32px; }

.img-error-text {
  margin: 0;
  font-weight: 700;
  color: #c2410c;
  font-size: 14px;
}

.img-error-hint {
  margin: 0;
  color: #92400e;
  font-size: 12px;
}

.img-link {
  font-size: 13px;
  color: #1a56db;
  text-decoration: underline;
}

/* ────────────────────────────────────────────
   TABLA INSPECCIÓN
──────────────────────────────────────────── */
.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

thead {
  background: #f3f6fd;
}

th {
  border: 1px solid #d1d5db;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  text-align: left;
  letter-spacing: 0.4px;
}

td {
  border: 1px solid #e5e7eb;
  padding: 9px 12px;
  vertical-align: top;
}

/* Filas de falla */
.falla-a { background-color: #fef2f2; }
.falla-b { background-color: #fefce8; }
.falla-ok { background-color: #f0fdf4; }

/* Badge de tipo falla */
.falla-badge-cell { text-align: center; }

.falla-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}

.falla-badge-A { background: #fee2e2; color: #991b1b; }
.falla-badge-B { background: #fef9c3; color: #854d0e; }
.falla-badge-OK { background: #d1fae5; color: #065f46; }

/* Leyenda */
.leyenda {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.leyenda-item {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 4px;
}

.falla-a-bg { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
.falla-b-bg { background: #fefce8; color: #854d0e; border: 1px solid #fde047; }
.falla-ok-bg { background: #f0fdf4; color: #065f46; border: 1px solid #86efac; }

/* Sin items */
.empty-items {
  text-align: center;
  color: #9ca3af;
  font-style: italic;
  padding: 24px 0;
  font-size: 14px;
}

/* ────────────────────────────────────────────
   FIRMA
──────────────────────────────────────────── */
.firma-section {
  display: flex;
  justify-content: flex-end;
}

.firma-box {
  text-align: center;
  min-width: 260px;
}

.firma-line {
  border-bottom: 1px solid #374151;
  margin-bottom: 8px;
  height: 60px;
}

.firma-label {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
}

.firma-sub {
  margin: 2px 0 0 0;
  font-size: 11px;
  color: #6b7280;
}

/* ────────────────────────────────────────────
   BOTÓN
──────────────────────────────────────────── */
.actions {
  text-align: right;
  margin-top: 24px;
}

.btn-print {
  padding: 12px 28px;
  background: #1a56db;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-print:hover {
  background: #1e40af;
}

/* ────────────────────────────────────────────
   PRINT
──────────────────────────────────────────── */
@media print {
  .no-print {
    display: none !important;
  }

  .report-wrapper {
    padding: 10px;
    max-width: 100%;
  }

  .card {
    box-shadow: none;
    page-break-inside: avoid;
  }

  .evidencia-img {
    max-height: 400px;
    page-break-inside: avoid;
  }
}

/* ────────────────────────────────────────────
   RESPONSIVE
──────────────────────────────────────────── */
@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .report-header {
    flex-direction: column;
  }

  .report-meta {
    text-align: left;
  }
}
.img-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #6b7280;
  padding: 24px;
}
</style>