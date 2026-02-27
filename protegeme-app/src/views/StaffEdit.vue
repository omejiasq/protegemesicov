<template>
  <div v-if="loadingData" class="loading-state">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem" />
    <p>Cargando usuario...</p>
  </div>

  <form v-else @submit.prevent="onSubmit">
    <div class="grid">

      <div class="field">
        <label>Tipo de Documento *</label>
        <select v-model="form.documentType" :class="{ error: errors.documentType }">
          <option :value="null" disabled>Seleccione</option>
          <option v-for="opt in documentTypeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <small v-if="errors.documentType" class="error-text">{{ errors.documentType }}</small>
      </div>

      <div class="field">
        <label>Número de Documento *</label>
        <input v-model="form.documentNumber" :class="{ error: errors.documentNumber }" />
        <small v-if="errors.documentNumber" class="error-text">{{ errors.documentNumber }}</small>
      </div>

      <div class="field">
        <label>Nombre *</label>
        <input v-model="form.firstName" :class="{ error: errors.firstName }" />
        <small v-if="errors.firstName" class="error-text">{{ errors.firstName }}</small>
      </div>

      <div class="field">
        <label>Apellido</label>
        <input v-model="form.lastName" />
      </div>

      <div class="field">
        <label>Teléfono</label>
        <input v-model="form.phone" />
      </div>

      <div class="field">
        <label>Rol *</label>
        <select v-model="form.roleType" :class="{ error: errors.roleType }">
          <option :value="null" disabled>Seleccione</option>
          <option value="admin">Administrador</option>
          <option value="operator">Inspector</option>

        </select>
        <small v-if="errors.roleType" class="error-text">{{ errors.roleType }}</small>
      </div>

      <div class="field">
        <label>Estado</label>
        <select v-model="form.active">
          <option :value="true">Activo</option>
          <option :value="false">Inactivo</option>
        </select>
      </div>

      <div class="field full">
        <label>Email</label>
        <input v-model="form.email" type="email" />
      </div>

    </div>

    <!-- CAMBIAR PASSWORD -->
    <div class="section">Cambiar Contraseña</div>
    <div class="grid">
      <div class="field">
        <label>Nueva Contraseña</label>
        <input
          type="password"
          v-model="newPassword"
          placeholder="Dejar vacío para no cambiar"
        />
      </div>
    </div>

    <div class="actions">
      <button type="button" class="btn-secondary" @click="$router.back()">
        Cancelar
      </button>
      <button
        v-if="newPassword"
        type="button"
        class="btn-warning"
        :disabled="loading"
        @click="onChangePassword"
      >
        {{ loading ? 'Guardando...' : 'Cambiar Contraseña' }}
      </button>
      <button type="submit" class="btn-primary" :disabled="loading">
        {{ loading ? 'Guardando...' : 'Guardar Cambios' }}
      </button>
    </div>

  </form>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStaffStore } from '../stores/staffStore'

const staffStore = useStaffStore()
const router = useRouter()
const route = useRoute()

const staffId = route.params.id as string
const loading = ref(false)
const loadingData = ref(true)
const errors = ref<any>({})
const newPassword = ref('')

const documentTypeOptions = [
  { label: "Cédula de ciudadanía", value: 1 },
  { label: "Cédula de ciudadanía digital", value: 2 },
  { label: "Tarjeta de identidad", value: 3 },
  { label: "Registro civil", value: 4 },
  { label: "Cédula de extranjería", value: 5 },
  { label: "Pasaporte", value: 6 },
  { label: "Permiso Especial de Permanencia (PEP)", value: 7 },
  { label: "Documento de Identificación Extranjero (DIE)", value: 8 },
  { label: "Permiso por Protección Temporal (PPT)", value: 9 },
]

const form = ref({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  documentType: null as number | null,
  documentNumber: '',
  roleType: null as string | null,
  active: true,
})

onMounted(async () => {
  try {
    const user = await staffStore.get(staffId)
    if (user) {
      form.value = {
        firstName:    user.usuario?.nombre    ?? '',
        lastName:     user.usuario?.apellido  ?? '',
        phone:        user.usuario?.telefono  ?? '',
        email:        user.usuario?.correo    ?? '',
        documentType: user.usuario?.document_type ?? null,
        documentNumber: user.usuario?.documentNumber ?? '',
        roleType:     user.roleType ?? null,
        active:       user.active ?? true,
      }
    }
  } catch (e) {
    console.error('Error cargando usuario:', e)
  } finally {
    loadingData.value = false
  }
})

function validate() {
  const e: any = {}
  if (!form.value.documentType)   e.documentType   = 'Seleccione el tipo de documento'
  if (!form.value.documentNumber.trim()) e.documentNumber = 'Ingrese el número de documento'
  if (!form.value.firstName.trim()) e.firstName = 'Ingrese el nombre del usuario'
  if (!form.value.roleType)        e.roleType = 'Seleccione un rol'
  errors.value = e
  return Object.keys(e).length === 0
}

async function onSubmit() {
  if (!validate()) return
  loading.value = true
  try {
    await staffStore.update(staffId, form.value)
    alert('Usuario actualizado correctamente')
    router.back()
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Error al actualizar el usuario')
  } finally {
    loading.value = false
  }
}

async function onChangePassword() {
  if (!newPassword.value.trim()) return
  loading.value = true
  try {
    await staffStore.updatePassword(staffId, newPassword.value)
    alert('Contraseña actualizada correctamente')
    newPassword.value = ''
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Error al cambiar la contraseña')
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
.btn-warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff; border: none; border-radius: 12px;
  padding: 12px 24px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.25s ease;
}
.btn-warning:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(245,158,11,0.35); }
.btn-warning:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.error { border: 1.8px solid #dc2626 !important; background: #fef2f2; }
.error-text { color: #dc2626; font-size: 12px; margin-top: 4px; }
@media (max-width: 640px) {
  .actions { justify-content: center; flex-direction: column; }
  .btn-primary, .btn-secondary, .btn-warning { width: 100%; }
}
</style>