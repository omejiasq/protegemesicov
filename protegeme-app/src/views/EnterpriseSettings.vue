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
         INSPECTOR POR DEFECTO
    ══════════════════════════════════════ -->
    <div class="section">Inspector por Defecto (Alistamientos)</div>
    <p class="section-hint">
      Este inspector se auto-completará en la app móvil al ingresar una placa para crear un alistamiento.
    </p>
    <div class="grid">

      <div class="field full">
        <label>Inspector por defecto</label>
        <select v-model="selectedInspectorId">
          <option value="">— Sin inspector por defecto —</option>
          <option
            v-for="i in inspectors"
            :key="i._id"
            :value="i._id"
          >
            {{ i.nombre }} — {{ i.documentNumber }}
          </option>
        </select>
        <small v-if="!inspectors.length && !loadingData" class="section-hint" style="margin-top:6px">
          No hay usuarios con rol Inspector.
          <router-link to="/staff">Crear inspector aquí.</router-link>
        </small>
      </div>

    </div>

    <!-- ══════════════════════════════════════
         NOTIFICACIONES
    ══════════════════════════════════════ -->
    <div class="section">Notificaciones</div>
    <p class="section-hint">
      Correo y celular donde se recibirán comunicados del administrador del sistema.
    </p>
    <div class="grid">

      <div class="field">
        <label>Correo de notificación <span class="required">*</span></label>
        <input
          v-model="form.notification_email"
          type="email"
          placeholder="Ej: notificaciones@empresa.co"
          :class="{ error: errors.notification_email }"
        />
        <small v-if="errors.notification_email" class="error-text">
          {{ errors.notification_email }}
        </small>
      </div>

      <div class="field">
        <label>Celular de notificación</label>
        <input
          v-model="form.notification_phone"
          type="tel"
          placeholder="Ej: 3001234567"
        />
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

    <!-- Toast de confirmación -->
    <transition name="toast-fade">
      <div v-if="saveSuccess" class="toast-success">
        <i class="pi pi-check-circle" /> Cambios guardados correctamente
      </div>
    </transition>

  </form>

  <!-- ══════════════════════════════════════
       PANEL BROADCAST (solo superadmin)
  ══════════════════════════════════════ -->
  <div v-if="authStore.isSuperAdmin" class="broadcast-panel">
    <div class="section" style="border-top:none; padding-top:0; margin-top:0;">
      <i class="pi pi-megaphone" style="margin-right:8px; color:#7c3aed;" />
      Enviar comunicado a todas las empresas
    </div>
    <p class="section-hint">
      El mensaje se enviará al correo de notificación de cada empresa que lo tenga configurado.
    </p>
    <div class="field" style="margin-bottom:14px;">
      <label>Mensaje</label>
      <textarea
        v-model="broadcastMessage"
        rows="5"
        placeholder="Escriba aquí el mensaje que desea enviar a todas las empresas..."
        class="broadcast-textarea"
      />
    </div>
    <div style="display:flex; justify-content:flex-end; align-items:center; gap:12px;">
      <span v-if="broadcastResult" :class="['broadcast-result', broadcastResult.ok ? 'ok' : 'err']">
        {{ broadcastResult.text }}
      </span>
      <button
        class="btn-broadcast"
        :disabled="broadcastLoading || !broadcastMessage.trim()"
        @click="sendBroadcast"
      >
        <i class="pi pi-send" />
        {{ broadcastLoading ? 'Enviando...' : 'Enviar a todas las empresas' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import { AuthserviceApi } from '../api/auth.service'
import { MaintenanceserviceApi } from '../api/maintenance.service'
import { StaffServiceApi } from '../api/staff.service'

const authStore = useAuthStore()
const loading = ref(false)
const loadingData = ref(true)
const errors = ref<any>({})
const saveSuccess = ref(false)
let saveSuccessTimer: ReturnType<typeof setTimeout> | null = null

function showSaveSuccess() {
  saveSuccess.value = true
  if (saveSuccessTimer) clearTimeout(saveSuccessTimer)
  saveSuccessTimer = setTimeout(() => { saveSuccess.value = false }, 3000)
}

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

// ── Inspectors ───────────────────────────────────────────────────────────
const inspectors = ref<Array<{ _id: string; nombre: string; documentNumber: string; document_type: number | null }>>([])
const selectedInspectorId = ref<string>('')  // '' = sin inspector

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
  notification_email: '',
  notification_phone: '',
})

// ── Broadcast ────────────────────────────────────────────────────────────
const broadcastMessage = ref('')
const broadcastLoading = ref(false)
const broadcastResult = ref<{ ok: boolean; text: string } | null>(null)

async function sendBroadcast() {
  if (!broadcastMessage.value.trim()) return
  broadcastLoading.value = true
  broadcastResult.value = null
  try {
    const { data } = await AuthserviceApi.sendBroadcast(broadcastMessage.value.trim())
    broadcastResult.value = { ok: true, text: `Enviado a ${data.sent} empresa(s)` }
    broadcastMessage.value = ''
  } catch (e: any) {
    broadcastResult.value = { ok: false, text: e?.response?.data?.message || 'Error al enviar' }
  } finally {
    broadcastLoading.value = false
    setTimeout(() => { broadcastResult.value = null }, 5000)
  }
}

onMounted(async () => {
  try {
    const id = authStore.enterpriseId
    if (!id) return

    const [enterpriseRes, staffRes] = await Promise.allSettled([
      AuthserviceApi.getEnterprise(id),
      StaffServiceApi.list({ roleType: 'operator', active: true }),
    ])

    if (staffRes.status === 'fulfilled') {
      const raw = staffRes.value.data
      const items: any[] = raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
      inspectors.value = items.map((u: any) => ({
        _id:            u._id,
        nombre:         [u.usuario?.nombre, u.usuario?.apellido].filter(Boolean).join(' '),
        documentNumber: u.usuario?.documentNumber ?? '',
        document_type:  u.usuario?.document_type  ?? null,
      }))
    }

    if (enterpriseRes.status === 'fulfilled') {
      const data = enterpriseRes.value.data
      form.value = {
        specialized_center_name:            data.specialized_center_name            ?? '',
        specialized_center_document_number: data.specialized_center_document_number ?? '',
        mechanic_document_type:             data.mechanic_document_type             ?? null,
        mechanic_document_number:           data.mechanic_document_number           ?? '',
        mechanic_name:                      data.mechanic_name                      ?? '',
        notification_email:                 data.notification_email                 ?? '',
        notification_phone:                 data.notification_phone                 ?? '',
      }
      // <select> con v-model no tiene timing issues — asignación directa
      selectedInspectorId.value = data.default_inspector_id ?? ''
      if (data.logo) loadCurrentLogo(data.logo)
    }
  } catch (e) {
    console.error('Error cargando empresa:', e)
  } finally {
    loadingData.value = false
  }
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  if (!form.value.notification_email.trim()) {
    e.notification_email = 'El correo de notificación es obligatorio'
  } else if (!EMAIL_RE.test(form.value.notification_email.trim())) {
    e.notification_email = 'Ingrese un correo electrónico válido'
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
    // Resolver datos del inspector seleccionado
    const inspectorId = selectedInspectorId.value || null
    const inspector = inspectorId
      ? (inspectors.value.find(i => i._id === inspectorId) ?? null)
      : null

    await AuthserviceApi.updateEnterpriseProfile(id, {
      specialized_center_name:            form.value.specialized_center_name,
      specialized_center_document_type:   12,
      specialized_center_document_number: form.value.specialized_center_document_number,
      mechanic_document_type:             form.value.mechanic_document_type,
      mechanic_document_number:           form.value.mechanic_document_number,
      mechanic_name:                      form.value.mechanic_name,
      default_inspector_id:               inspectorId,
      default_inspector_document_type:    inspector?.document_type  ?? null,
      default_inspector_document_number:  inspector?.documentNumber ?? '',
      default_inspector_name:             inspector?.nombre         ?? '',
      notification_email:                 form.value.notification_email,
      notification_phone:                 form.value.notification_phone,
    })
    showSaveSuccess()
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
.required { color: #dc2626; margin-left: 2px; }
.section-hint { font-size: 12px; color: #6b7280; margin: -6px 0 12px; }

/* ── Toast de confirmación ── */
.toast-success {
  position: fixed;
  bottom: 32px;
  right: 32px;
  background: #16a34a;
  color: #fff;
  padding: 14px 22px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 8px 24px rgba(22, 163, 74, 0.35);
  z-index: 1000;
}
.toast-fade-enter-active,
.toast-fade-leave-active { transition: all 0.3s ease; }
.toast-fade-enter-from,
.toast-fade-leave-to { opacity: 0; transform: translateY(12px); }
/* ── Broadcast panel ── */
.broadcast-panel {
  margin-top: 40px;
  padding: 24px 28px;
  border: 2px dashed #7c3aed;
  border-radius: 16px;
  background: #faf5ff;
}
.broadcast-textarea {
  width: 100%; box-sizing: border-box;
  padding: 10px 12px; border-radius: 10px;
  border: 1px solid #d1d5db; font-size: 14px;
  font-family: inherit; resize: vertical;
  transition: all 0.2s ease;
}
.broadcast-textarea:focus {
  outline: none; border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
}
.btn-broadcast {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: #fff; border: none; border-radius: 12px;
  padding: 12px 28px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.25s ease;
  display: inline-flex; align-items: center; gap: 8px;
}
.btn-broadcast:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(124,58,237,0.35); }
.btn-broadcast:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.broadcast-result {
  font-size: 13px; font-weight: 600; padding: 6px 14px;
  border-radius: 8px;
}
.broadcast-result.ok { background: #dcfce7; color: #166534; }
.broadcast-result.err { background: #fee2e2; color: #991b1b; }

@media (max-width: 640px) {
  .actions { justify-content: center; flex-direction: column; }
  .btn-primary, .btn-secondary { width: 100%; }
  .logo-section { flex-direction: column; align-items: center; }
  .btn-broadcast { width: 100%; justify-content: center; }
}
</style>
