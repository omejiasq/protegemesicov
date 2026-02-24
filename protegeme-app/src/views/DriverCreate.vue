<template>
<form @submit.prevent="onSubmit">

  <div class="grid">

    <div class="field">
      <label>Tipo de Documento *</label>
      <select
        v-model="form.documentType"
        :class="{ error: errors.documentType }"
      >
        <option :value="null" disabled>Seleccione</option>
        <option
          v-for="opt in documentTypeOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
      <small v-if="errors.documentType" class="error-text">
        {{ errors.documentType }}
      </small>
    </div>

    <div class="field">
      <label>Número de Documento *</label>
      <input
        v-model="form.documentNumber"
        :class="{ error: errors.documentNumber }"
      />
      <small v-if="errors.documentNumber" class="error-text">
        {{ errors.documentNumber }}
      </small>
    </div>

    <div class="field">
      <label>Nombre *</label>
      <input
        v-model="form.firstName"
        :class="{ error: errors.firstName }"
      />
      <small v-if="errors.firstName" class="error-text">
        {{ errors.firstName }}
      </small>
    </div>

    <div class="field">
      <label>Teléfono</label>
      <input v-model="form.phone" />
    </div>

<div class="field">
  <label>No. Licencia de Conducción *</label>
  <input
    v-model="form.no_licencia_conduccion"
    :class="{ error: errors.no_licencia_conduccion }"
  />
  <small v-if="errors.no_licencia_conduccion" class="error-text">
    {{ errors.no_licencia_conduccion }}
  </small>
</div>

<div class="field">
  <label>Vencimiento Licencia *</label>
  <input
    type="date"
    v-model="form.vencimiento_licencia_conduccion"
    :class="{ error: errors.vencimiento_licencia_conduccion }"
  />
  <small v-if="errors.vencimiento_licencia_conduccion" class="error-text">
    {{ errors.vencimiento_licencia_conduccion }}
  </small>
</div>

    <div class="field full">
      <label>Email</label>
      <input v-model="form.email" type="email" />
    </div>

  </div>

  <div class="actions">
    <button type="button" class="btn-secondary" @click="$router.back()">
      Cancelar
    </button>

    <button type="submit" class="btn-primary" :disabled="loading">
      {{ loading ? 'Guardando...' : 'Crear Conductor' }}
    </button>
  </div>

</form>
</template>



<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useDriversStore } from '../stores/driversStore'

const authStore = useAuthStore()
const driversStore = useDriversStore()
const router = useRouter()

const loading = ref(false)

const errors = ref<any>({})

const validateForm = () => {
  errors.value = {}

  if (!form.value.documentType) {
    errors.value.documentType = 'Seleccione el tipo de documento'
  }

  if (!form.value.documentNumber.trim()) {
    errors.value.documentNumber = 'Ingrese el número de documento'
  }

  if (!form.value.firstName.trim()) {
    errors.value.firstName = 'Ingrese el nombre del conductor'
  }

  return Object.keys(errors.value).length === 0
}

/* ================== TIPOS DE DOCUMENTO ================== */
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

/* ================== FORM ================== */
const form = ref({
  usuario: '',
  firstName: '',
  phone: '',
  email: '',
  documentType: null as number | null,
  documentNumber: '',
  no_licencia_conduccion: '',
  vencimiento_licencia_conduccion: '',
})

/* ================== SUBMIT ================== */
const onSubmit = async () => {
  if (!validateForm()) {
    alert('Debe completar los campos obligatorios')
    return
  }

  loading.value = true

  try {
    await driversStore.create({
      usuario: form.value.documentNumber,
      password: 'Ach153*De',
      firstName: form.value.firstName,
      phone: form.value.phone || '',
      email: form.value.email || '',
      roleType: 'driver',
      enterprise_id: authStore.enterprise_id,
      documentType: form.value.documentType,
      documentNumber: form.value.documentNumber,
    })

    alert('Conductor creado correctamente')
    router.push({ name: 'drivers' })

  } catch (e: any) {
    alert(e?.response?.data?.message || 'Error al crear el conductor')
  } finally {
    loading.value = false
  }
}

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

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

/* ERRORES */
.error {
  border: 1.8px solid #dc2626 !important;
  background: #fef2f2;
}

.error-text {
  color: #dc2626;
  font-size: 12px;
  margin-top: 4px;
}


</style>
