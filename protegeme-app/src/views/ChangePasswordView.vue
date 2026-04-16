<template>
  <div class="cp-wrapper">
    <div class="cp-card">
      <div class="cp-header">
        <img src="/logoProtegeme.png" alt="Logo" class="cp-logo" />
        <h2>Cambio de contraseña obligatorio</h2>
        <p>Por seguridad, debe establecer una nueva contraseña antes de continuar.</p>
      </div>

      <form @submit.prevent="handleSubmit" class="cp-form">
        <div class="cp-field">
          <label>Nueva contraseña</label>
          <div class="pw-wrap">
            <input
              :type="showNew ? 'text' : 'password'"
              v-model="form.newPassword"
              :placeholder="PASSWORD_HINT"
              autocomplete="new-password"
            />
            <button type="button" class="eye-btn" @click="showNew = !showNew">
              <i :class="showNew ? 'pi pi-eye-slash' : 'pi pi-eye'" />
            </button>
          </div>
          <small v-if="errors.newPassword" class="err">{{ errors.newPassword }}</small>
        </div>

        <div class="cp-field">
          <label>Confirmar contraseña</label>
          <div class="pw-wrap">
            <input
              :type="showConfirm ? 'text' : 'password'"
              v-model="form.confirmPassword"
              placeholder="Repita la contraseña"
              autocomplete="new-password"
            />
            <button type="button" class="eye-btn" @click="showConfirm = !showConfirm">
              <i :class="showConfirm ? 'pi pi-eye-slash' : 'pi pi-eye'" />
            </button>
          </div>
          <small v-if="errors.confirmPassword" class="err">{{ errors.confirmPassword }}</small>
        </div>

        <button type="submit" class="cp-btn" :disabled="loading">
          <i class="pi pi-lock" />
          {{ loading ? 'Guardando...' : 'Establecer nueva contraseña' }}
        </button>

        <div v-if="apiError" class="api-error">{{ apiError }}</div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { AuthserviceApi } from '../api/auth.service'
import { validatePassword, PASSWORD_HINT } from '../utils/passwordPolicy'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const apiError = ref('')
const showNew = ref(false)
const showConfirm = ref(false)

const form = reactive({ newPassword: '', confirmPassword: '' })
const errors = reactive({ newPassword: '', confirmPassword: '' })

function validate() {
  errors.newPassword = ''
  errors.confirmPassword = ''

  const pwError = validatePassword(form.newPassword)
  if (pwError) errors.newPassword = pwError
  if (!errors.newPassword && form.newPassword !== form.confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden'
  }
  return !errors.newPassword && !errors.confirmPassword
}

async function handleSubmit() {
  if (!validate()) return

  const userId = authStore.user?._id
  if (!userId) {
    apiError.value = 'Sesión inválida. Por favor inicie sesión de nuevo.'
    return
  }

  loading.value = true
  apiError.value = ''
  try {
    await AuthserviceApi.changePassword(userId, form.newPassword)
    authStore.clearMustChangePassword()
    router.replace('/')
  } catch (e: any) {
    apiError.value = e?.response?.data?.message || 'Error al cambiar la contraseña'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.cp-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

.cp-card {
  background: white;
  border-radius: 12px;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.cp-header {
  text-align: center;
  margin-bottom: 2rem;
}

.cp-logo {
  height: 3rem;
  margin-bottom: 1rem;
}

.cp-header h2 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e3a8a;
  margin: 0 0 0.5rem;
}

.cp-header p {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0;
}

.cp-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.cp-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.cp-field label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #374151;
}

.pw-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.pw-wrap input {
  width: 100%;
  padding: 0.6rem 2.5rem 0.6rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
}

.pw-wrap input:focus {
  border-color: #1d4ed8;
  box-shadow: 0 0 0 2px rgba(29, 78, 216, 0.15);
}

.eye-btn {
  position: absolute;
  right: 0.6rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  font-size: 1rem;
  display: flex;
  align-items: center;
}

.err {
  color: #dc2626;
  font-size: 0.78rem;
}

.cp-btn {
  background: #1e40af;
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.cp-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cp-btn:hover:not(:disabled) {
  background: #1d3ea0;
}

.api-error {
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  padding: 0.65rem 1rem;
  font-size: 0.85rem;
  text-align: center;
}
</style>
