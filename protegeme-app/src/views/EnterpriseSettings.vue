<template>
  <div v-if="loadingData" class="loading-state">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem" />
    <p>Cargando datos de la empresa...</p>
  </div>

  <form v-else @submit.prevent="onSubmit">

    <!-- ══════════════════════════════════════
         LOGO DE LA EMPRESA
    ══════════════════════════════════════ -->
    <div class="section">Logo de la Empresa</div>
    <div class="logo-section">

      <!-- Previsualización -->
      <div class="logo-preview-wrap">
        <img
          v-if="logoPreviewUrl"
          :src="logoPreviewUrl"
          alt="Logo empresa"
          class="logo-preview"
        />
        <div v-else class="logo-placeholder">
          <i class="pi pi-image" style="font-size: 2.5rem; color: #9ca3af" />
          <span>Sin logo</span>
        </div>
      </div>

      <!-- Controles -->
      <div class="logo-controls">
        <label class="btn-file">
          <i class="pi pi-upload" /> Seleccionar imagen
          <input
            type="file"
            accept="image/png,image/jpeg"
            style="display:none"
            @change="onLogoSelected"
          />
        </label>
        <button
          type="button"
          class="btn-primary"
          :disabled="!pendingLogoFile || uploadingLogo"
          @click="uploadLogo"
        >
          {{ uploadingLogo ? 'Subiendo...' : 'Guardar logo' }}
        </button>
        <small v-if="pendingLogoFile" class="file-name">
          {{ pendingLogoFile.name }}
        </small>



      </div>

    </div>

    <!-- ══════════════════════════════════════
         CENTRO ESPECIALIZADO
    ══════════════════════════════════════ -->
    <div class="section">Centro Especializado</div>
    <div class="grid">

      <div class="field full">
        <label>Nombre del centro especializado</label>
        <input v-model="form.specialized_center_name" placeholder="Razón social del centro" />
      </div>

      <div class="field">
        <label>Tipo de documento</label>
        <input value="NIT" disabled class="disabled-input" />
      </div>

      <div class="field">
        <label>NIT – Centro especializado</label>
        <input
          v-model="form.specialized_center_document_number"
          placeholder="Ej: 900123456-1"
          :class="{ error: errors.specialized_center_document_number }"
        />
        <small v-if="errors.specialized_center_document_number" class="error-text">
          {{ errors.specialized_center_document_number }}
        </small>
      </div>

    </div>

    <!-- ══════════════════════════════════════
         INGENIERO MECÁNICO
    ══════════════════════════════════════ -->
    <div class="section">Ingeniero Mecánico</div>
    <div class="grid">

      <div class="field">
        <label>Tipo de identificación</label>
        <select
          v-model="form.mechanic_document_type"
          :class="{ error: errors.mechanic_document_type }"
        >
          <option :value="null" disabled>Seleccione</option>
          <option v-for="opt in documentTypeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <small v-if="errors.mechanic_document_type" class="error-text">
          {{ errors.mechanic_document_type }}
        </small>
      </div>

      <div class="field">
        <label>Número de identificación</label>
        <input
          v-model="form.mechanic_document_number"
          placeholder="Número de documento"
          :class="{ error: errors.mechanic_document_number }"
        />
        <small v-if="errors.mechanic_document_number" class="error-text">
          {{ errors.mechanic_document_number }}
        </small>
      </div>

      <div class="field full">
        <label>Nombres y apellidos</label>
        <input
          v-model="form.mechanic_name"
          placeholder="Nombre completo del ingeniero mecánico"
          :class="{ error: errors.mechanic_name }"
        />
        <small v-if="errors.mechanic_name" class="error-text">
          {{ errors.mechanic_name }}
        </small>
      </div>

    </div>

    <div class="actions">
      <button type="button" class="btn-secondary" @click="$router.back()">
        Cancelar
      </button>
      <button type="submit" class="btn-primary" :disabled="loading">
        {{ loading ? 'Guardando...' : 'Guardar Cambios' }}
      </button>
    </div>

  </form>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import { AuthserviceApi } from '../api/auth.service'
import { MaintenanceserviceApi } from '../api/maintenance.service'

const authStore = useAuthStore()
const loading = ref(false)
const loadingData = ref(true)
const errors = ref<any>({})

// ── Logo ────────────────────────────────────────────────────────────────
const logoPreviewUrl = ref<string | null>(null)   // blob URL shown in <img>
const logoApiUrl = ref('')                         // URL guardada en BD (diagnóstico)
const logoLoadError = ref('')                      // error visible del proxy
const pendingLogoFile = ref<File | null>(null)     // file selected but not yet uploaded
const uploadingLogo = ref(false)
const logoError = ref('')
let blobUrlToRevoke: string | null = null          // keep track to revoke on unmount

async function loadCurrentLogo(url: string) {
  logoApiUrl.value = url
  try {
    const token = localStorage.getItem('token')
    const maintenanceBase = (import.meta.env.VITE_API_MAINTENANCE_URL as string ?? '').replace(/\/$/, '')
    const response = await axios.get(
      `${maintenanceBase}/files/proxy?url=${encodeURIComponent(url)}`,
      { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
    )
    const blobUrl = URL.createObjectURL(response.data)
    blobUrlToRevoke = blobUrl
    logoPreviewUrl.value = blobUrl
  } catch (e: any) {
    const msg = e?.response?.status
      ? `HTTP ${e.response.status} – ${e.response?.data?.message ?? ''}`
      : (e?.message ?? String(e))
    logoLoadError.value = msg
    console.error('[Logo] Error cargando logo via proxy:', e)
  }
}

function onLogoSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  logoError.value = ''
  pendingLogoFile.value = file
  // Local preview
  if (blobUrlToRevoke) URL.revokeObjectURL(blobUrlToRevoke)
  const blobUrl = URL.createObjectURL(file)
  blobUrlToRevoke = blobUrl
  logoPreviewUrl.value = blobUrl
}

async function uploadLogo() {
  if (!pendingLogoFile.value) return
  uploadingLogo.value = true
  logoError.value = ''
  try {
    const { data } = await MaintenanceserviceApi.uploadFile(pendingLogoFile.value)
    const logoUrl: string = data.ruta
    const id = authStore.enterpriseId
    if (!id) throw new Error('No hay empresa activa')
    await AuthserviceApi.updateEnterpriseProfile(id, { logo: logoUrl })
    pendingLogoFile.value = null
    alert('Logo actualizado correctamente')
  } catch (e: any) {
    logoError.value = e?.response?.data?.message || 'Error al subir el logo'
  } finally {
    uploadingLogo.value = false
  }
}

onBeforeUnmount(() => {
  if (blobUrlToRevoke) URL.revokeObjectURL(blobUrlToRevoke)
})

// ── Form ────────────────────────────────────────────────────────────────
const documentTypeOptions = [
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

const form = ref({
  specialized_center_name: '',
  specialized_center_document_number: '',
  mechanic_document_type: null as number | null,
  mechanic_document_number: '',
  mechanic_name: '',
})

onMounted(async () => {
  try {
    const id = authStore.enterpriseId
    if (!id) return
    const { data } = await AuthserviceApi.getEnterprise(id)
    form.value = {
      specialized_center_name:            data.specialized_center_name            ?? '',
      specialized_center_document_number: data.specialized_center_document_number ?? '',
      mechanic_document_type:             data.mechanic_document_type             ?? null,
      mechanic_document_number:           data.mechanic_document_number           ?? '',
      mechanic_name:                      data.mechanic_name                      ?? '',
    }
    if (data.logo) await loadCurrentLogo(data.logo)
  } catch (e) {
    console.error('Error cargando empresa:', e)
  } finally {
    loadingData.value = false
  }
})

function validate() {
  const e: any = {}
  if (
    form.value.specialized_center_document_number &&
    !form.value.specialized_center_name.trim()
  ) {
    e.specialized_center_document_number = ''
  }
  if (
    (form.value.mechanic_document_number || form.value.mechanic_name) &&
    !form.value.mechanic_document_type
  ) {
    e.mechanic_document_type = 'Seleccione el tipo de identificación del mecánico'
  }
  errors.value = e
  return Object.keys(e).length === 0
}

async function onSubmit() {
  if (!validate()) return
  loading.value = true
  try {
    const id = authStore.enterpriseId
    if (!id) throw new Error('No hay empresa activa en sesión')
    await AuthserviceApi.updateEnterpriseProfile(id, {
      specialized_center_name:            form.value.specialized_center_name,
      specialized_center_document_type:   12,
      specialized_center_document_number: form.value.specialized_center_document_number,
      mechanic_document_type:             form.value.mechanic_document_type,
      mechanic_document_number:           form.value.mechanic_document_number,
      mechanic_name:                      form.value.mechanic_name,
    })
    alert('Datos de la empresa actualizados correctamente')
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Error al guardar los datos')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.loading-state {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 60px 0; color: #6b7280; gap: 12px;
}
.section {
  margin: 28px 0 12px; font-size: 15px;
  font-weight: 600; color: #374151;
  border-top: 1px solid #e5e7eb; padding-top: 20px;
}
.section:first-of-type { margin-top: 0; border-top: none; padding-top: 0; }

/* ── Logo ── */
.logo-section {
  display: flex; align-items: flex-start; gap: 24px; flex-wrap: wrap;
}
.logo-preview-wrap {
  width: 140px; height: 140px; border-radius: 12px;
  border: 1px solid #e5e7eb; overflow: hidden;
  background: #f9fafb; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.logo-preview { width: 100%; height: 100%; object-fit: contain; }
.logo-placeholder {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px; color: #9ca3af; font-size: 12px;
}
.logo-controls {
  display: flex; flex-direction: column; gap: 10px; justify-content: center;
}
.btn-file {
  display: inline-flex; align-items: center; gap: 8px;
  background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;
  border-radius: 10px; padding: 10px 18px; font-size: 14px;
  font-weight: 600; cursor: pointer; transition: all 0.2s ease;
  width: fit-content;
}
.btn-file:hover { background: #e5e7eb; }
.file-name { color: #6b7280; font-size: 12px; }

/* ── Grid ── */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.field { display: flex; flex-direction: column; }
.field.full { grid-column: 1 / -1; }
label { font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #4b5563; }
input, select {
  height: 42px; padding: 8px 12px; border-radius: 10px;
  border: 1px solid #d1d5db; font-size: 14px; transition: all 0.2s ease;
}
input:focus, select:focus {
  outline: none; border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}
.disabled-input {
  background: #f3f4f6; color: #6b7280; cursor: not-allowed;
}
.actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; }
.btn-primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff; border: none; border-radius: 12px;
  padding: 12px 28px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.25s ease;
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(37,99,235,0.35); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.btn-secondary {
  background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;
  border-radius: 12px; padding: 12px 24px; font-size: 14px;
  font-weight: 600; cursor: pointer; transition: all 0.2s ease;
}
.btn-secondary:hover { background: #e5e7eb; transform: translateY(-1px); }
.error { border: 1.8px solid #dc2626 !important; background: #fef2f2; }
.error-text { color: #dc2626; font-size: 12px; margin-top: 4px; }
@media (max-width: 640px) {
  .actions { justify-content: center; flex-direction: column; }
  .btn-primary, .btn-secondary { width: 100%; }
  .logo-section { flex-direction: column; align-items: center; }
}
</style>
