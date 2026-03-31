<template>
  <div v-if="loading" class="loading-screen">
    <p>Generando FUEC...</p>
  </div>

  <div v-else-if="!fuec" class="loading-screen">
    <p>FUEC no encontrado.</p>
  </div>

  <div v-else>
    <!-- Barra de herramientas (no imprime) -->
    <div class="toolbar no-print">
      <button @click="$router.back()" class="btn-back">← Volver</button>
      <button @click="window.print()" class="btn-print">🖨️ Imprimir / Guardar PDF</button>
    </div>

    <!-- DOCUMENTO FUEC — Formato Ministerio de Transporte Colombia -->
    <div class="fuec-doc">

      <!-- ENCABEZADO -->
      <table class="header-table">
        <tr>
          <td class="company-cell">
            <div class="company-name">{{ enterprise.name }}</div>
            <div class="company-detail">NIT: {{ enterprise.document_number }}</div>
            <div class="company-detail">{{ enterprise.address }}</div>
            <div class="company-detail">Tel: {{ enterprise.phone_number }}</div>
          </td>
          <td class="title-cell">
            <div class="doc-title">FORMATO ÚNICO DE EXTRACTO DE CONTRATO</div>
            <div class="doc-subtitle">FUEC</div>
            <div class="doc-decreto">Decreto 174 de 2001 — Art. 13</div>
          </td>
          <td class="number-cell">
            <div class="label-sm">N° FUEC</div>
            <div class="fuec-number">{{ fuec.numero_fuec }}</div>
            <div class="label-sm" style="margin-top:8px;">Fecha emisión</div>
            <div class="fuec-number" style="font-size:13px;">{{ formatDate(fuec.createdAt) }}</div>
          </td>
        </tr>
      </table>

      <!-- SECCIÓN 1: DATOS DEL CONTRATO -->
      <div class="section-bar">1. DATOS DEL CONTRATO</div>
      <table class="data-table">
        <tr>
          <td class="lbl" style="width:22%">Nombre del contratante:</td>
          <td style="width:45%"><strong>{{ fuec.contratante_nombre }}</strong></td>
          <td class="lbl" style="width:15%">NIT / CC:</td>
          <td><strong>{{ fuec.contratante_nit }}</strong></td>
        </tr>
        <tr>
          <td class="lbl">Objeto del contrato:</td>
          <td colspan="3">{{ fuec.descripcion_servicio }}</td>
        </tr>
        <tr>
          <td class="lbl">Origen:</td>
          <td><strong>{{ fuec.origen }}</strong></td>
          <td class="lbl">Destino:</td>
          <td><strong>{{ fuec.destino }}</strong></td>
        </tr>
        <tr>
          <td class="lbl">Fecha del servicio:</td>
          <td><strong>{{ formatDate(fuec.fecha_servicio) }}</strong></td>
          <td class="lbl">Hora de salida:</td>
          <td><strong>{{ fuec.hora_servicio }}</strong></td>
        </tr>
      </table>

      <!-- SECCIÓN 2: DATOS DEL VEHÍCULO -->
      <div class="section-bar">2. DATOS DEL VEHÍCULO</div>
      <table class="data-table">
        <tr>
          <td class="lbl" style="width:22%">Placa:</td>
          <td style="width:20%"><strong class="placa">{{ fuec.placa }}</strong></td>
          <td class="lbl" style="width:18%">Clase:</td>
          <td>{{ fuec.clase ?? '—' }}</td>
        </tr>
        <tr>
          <td class="lbl">Marca / Modelo:</td>
          <td colspan="3">{{ [fuec.marca, fuec.modelo].filter(Boolean).join(' ') || '—' }}</td>
        </tr>
        <tr>
          <td class="lbl">Color:</td>
          <td>{{ fuec.color ?? '—' }}</td>
          <td class="lbl">Capacidad:</td>
          <td>—</td>
        </tr>
      </table>

      <!-- DOCUMENTOS DEL VEHÍCULO -->
      <div class="section-bar-sub">DOCUMENTOS DEL VEHÍCULO</div>
      <table class="data-table">
        <thead>
          <tr class="doc-header">
            <th>Documento</th>
            <th>Número</th>
            <th>Vigencia</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="lbl">Tarjeta de Operación</td>
            <td>{{ fuec.no_tarjeta_opera ?? '—' }}</td>
            <td>{{ formatDate(fuec.expiration_tarjeta_opera) }}</td>
            <td :class="docStatus(fuec.expiration_tarjeta_opera).cls">{{ docStatus(fuec.expiration_tarjeta_opera).label }}</td>
          </tr>
          <tr>
            <td class="lbl">SOAT</td>
            <td>{{ fuec.no_soat ?? '—' }}</td>
            <td>{{ formatDate(fuec.expiration_soat) }}</td>
            <td :class="docStatus(fuec.expiration_soat).cls">{{ docStatus(fuec.expiration_soat).label }}</td>
          </tr>
          <tr>
            <td class="lbl">Revisión Técnico-Mecánica</td>
            <td>{{ fuec.no_rtm ?? '—' }}</td>
            <td>{{ formatDate(fuec.expiration_rtm) }}</td>
            <td :class="docStatus(fuec.expiration_rtm).cls">{{ docStatus(fuec.expiration_rtm).label }}</td>
          </tr>
        </tbody>
      </table>

      <!-- SECCIÓN 3: DATOS DEL CONDUCTOR -->
      <div class="section-bar">3. DATOS DEL CONDUCTOR</div>
      <table class="data-table">
        <tr>
          <td class="lbl" style="width:22%">Nombre completo:</td>
          <td style="width:45%"><strong>{{ fuec.conductor_nombre }}</strong></td>
          <td class="lbl" style="width:18%">Cédula:</td>
          <td><strong>{{ fuec.conductor_cedula }}</strong></td>
        </tr>
        <tr>
          <td class="lbl">N° Licencia:</td>
          <td>{{ fuec.conductor_no_licencia ?? '—' }}</td>
          <td class="lbl">Categoría:</td>
          <td><strong>{{ fuec.conductor_categoria_licencia ?? '—' }}</strong></td>
        </tr>
        <tr>
          <td class="lbl">Vencimiento licencia:</td>
          <td :class="docStatus(fuec.conductor_vencimiento_licencia).cls">
            {{ formatDate(fuec.conductor_vencimiento_licencia) }}
            <span style="font-size:11px;"> ({{ docStatus(fuec.conductor_vencimiento_licencia).label }})</span>
          </td>
          <td></td>
          <td></td>
        </tr>
      </table>

      <!-- SECCIÓN 4: FIRMAS -->
      <div class="section-bar">4. FIRMAS Y RESPONSABILIDADES</div>
      <table class="data-table firma-table">
        <tr>
          <td class="firma-cell">
            <div class="firma-line"></div>
            <div class="firma-label">Firma y sello empresa de transporte</div>
            <div class="firma-sublabel">{{ enterprise.name }}</div>
            <div class="firma-sublabel">NIT: {{ enterprise.document_number }}</div>
          </td>
          <td class="firma-cell">
            <div class="firma-line"></div>
            <div class="firma-label">Firma conductor</div>
            <div class="firma-sublabel">{{ fuec.conductor_nombre }}</div>
            <div class="firma-sublabel">CC: {{ fuec.conductor_cedula }}</div>
          </td>
          <td class="firma-cell">
            <div class="firma-line"></div>
            <div class="firma-label">Firma contratante</div>
            <div class="firma-sublabel">{{ fuec.contratante_nombre }}</div>
            <div class="firma-sublabel">NIT/CC: {{ fuec.contratante_nit }}</div>
          </td>
        </tr>
      </table>

      <!-- PIE DE PÁGINA -->
      <div class="footer-doc">
        <p>
          Este documento tiene validez para el servicio descrito. La empresa de transporte especial es responsable de la custodia de este formato
          de acuerdo con el Decreto 174 de 2001 del Ministerio de Transporte de Colombia.
          El conductor debe portarlo durante la prestación del servicio.
        </p>
        <p style="margin-top:6px; text-align:right; font-size:9px; color:#999;">
          Generado por ProtegeMeSICOV · {{ fuec.numero_fuec }} · {{ formatDateTime(fuec.createdAt) }}
        </p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { FuecServiceApi } from '../../api/fuec.service'
import { useAuthStore } from '../../stores/authStore'

const route = useRoute()
const authStore = useAuthStore()

const loading = ref(true)
const fuec = ref<any>(null)
const enterprise = ref<any>({
  name: '',
  document_number: '',
  address: '',
  phone_number: '',
})

onMounted(async () => {
  try {
    const res = await FuecServiceApi.get(route.params.id as string)
    fuec.value = res.data

    // Cargar datos básicos de la empresa desde el store si están disponibles
    enterprise.value = {
      name: (authStore as any).enterpriseName ?? authStore.user?.firstName ?? 'Empresa',
      document_number: '',
      address: '',
      phone_number: '',
      ...(fuec.value?.enterprise_snapshot ?? {}),
    }
  } catch (e) {
    fuec.value = null
  } finally {
    loading.value = false
  }
})

function formatDate(val: any) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

function formatDateTime(val: any) {
  if (!val) return ''
  return new Date(val).toLocaleString('es-CO')
}

function docStatus(date: any): { cls: string; label: string } {
  if (!date) return { cls: 'status-nd', label: 'Sin fecha' }
  const diff = new Date(date).getTime() - Date.now()
  const days = Math.floor(diff / 86400000)
  if (days < 0) return { cls: 'status-vencido', label: 'VENCIDO' }
  if (days <= 30) return { cls: 'status-proximo', label: `Vence en ${days}d` }
  return { cls: 'status-vigente', label: 'Vigente' }
}

declare const window: Window
</script>

<style>
/* Estilos globales de impresión */
@media print {
  body { margin: 0; padding: 0; background: white !important; }
  .no-print { display: none !important; }
  .fuec-doc { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
  @page { size: A4 portrait; margin: 12mm 10mm; }
}
</style>

<style scoped>
.loading-screen { display: flex; align-items: center; justify-content: center; height: 100vh; font-size: 16px; color: #6b7280; }

/* Barra de herramientas */
.toolbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  background: #1e3a8a; padding: 10px 24px;
  display: flex; gap: 12px; align-items: center;
  box-shadow: 0 2px 8px rgba(0,0,0,.3);
}
.btn-back  { background: rgba(255,255,255,.15); color: white; border: 1px solid rgba(255,255,255,.3); border-radius: 8px; padding: 7px 16px; cursor: pointer; font-size: 13px; }
.btn-print { background: #f59e0b; color: white; border: none; border-radius: 8px; padding: 7px 20px; cursor: pointer; font-size: 13px; font-weight: 700; }
.btn-back:hover { background: rgba(255,255,255,.25); }
.btn-print:hover { background: #d97706; }

/* Documento */
.fuec-doc {
  max-width: 210mm;
  margin: 72px auto 40px;
  background: white;
  padding: 16mm 14mm;
  box-shadow: 0 4px 24px rgba(0,0,0,.12);
  font-family: Arial, sans-serif;
  font-size: 11px;
  color: #111;
  line-height: 1.4;
}

/* Encabezado */
.header-table { width: 100%; border-collapse: collapse; border: 2px solid #1e3a8a; margin-bottom: 0; }
.header-table td { padding: 8px 10px; vertical-align: middle; }
.company-cell { border-right: 1px solid #1e3a8a; width: 35%; }
.title-cell   { text-align: center; border-right: 1px solid #1e3a8a; width: 40%; }
.number-cell  { text-align: center; width: 25%; }
.company-name { font-size: 13px; font-weight: 700; color: #1e3a8a; text-transform: uppercase; }
.company-detail { font-size: 10px; color: #374151; margin-top: 2px; }
.doc-title  { font-size: 13px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; line-height: 1.3; }
.doc-subtitle { font-size: 22px; font-weight: 900; color: #1e3a8a; margin-top: 4px; }
.doc-decreto { font-size: 9px; color: #6b7280; margin-top: 4px; }
.fuec-number { font-size: 16px; font-weight: 800; color: #1e3a8a; margin-top: 4px; }
.label-sm { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; }

/* Secciones */
.section-bar {
  background: #1e3a8a; color: white; padding: 4px 10px;
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; margin-top: 0;
}
.section-bar-sub {
  background: #dbeafe; color: #1e3a8a; padding: 3px 10px;
  font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; border-left: 3px solid #1e3a8a;
}

/* Tablas de datos */
.data-table { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; }
.data-table td, .data-table th { padding: 5px 8px; border: 1px solid #cbd5e1; vertical-align: middle; }
.data-table thead tr.doc-header th { background: #f1f5f9; font-size: 10px; font-weight: 700; color: #374151; text-align: center; }
.lbl { background: #f8fafc; font-size: 10px; color: #64748b; font-weight: 600; white-space: nowrap; }
.placa { font-size: 15px; font-weight: 900; letter-spacing: 2px; color: #1e3a8a; }

/* Estados documentos */
.status-vigente  { color: #15803d; font-weight: 700; font-size: 10px; text-align: center; }
.status-proximo  { color: #b45309; font-weight: 700; font-size: 10px; text-align: center; }
.status-vencido  { color: #dc2626; font-weight: 700; font-size: 10px; text-align: center; background: #fff1f2; }
.status-nd       { color: #9ca3af; font-size: 10px; text-align: center; }

/* Firmas */
.firma-table { margin-top: 8px; }
.firma-cell { padding: 14px 16px; text-align: center; width: 33.3%; border: 1px solid #cbd5e1; }
.firma-line { border-bottom: 1.5px solid #374151; margin: 30px 16px 6px; }
.firma-label { font-size: 10px; font-weight: 700; color: #1e3a8a; text-transform: uppercase; }
.firma-sublabel { font-size: 9px; color: #374151; margin-top: 2px; }

/* Pie de página */
.footer-doc {
  margin-top: 10px; border-top: 1px solid #cbd5e1;
  padding-top: 6px; font-size: 9px; color: #64748b;
  text-align: justify; line-height: 1.4;
}
</style>
