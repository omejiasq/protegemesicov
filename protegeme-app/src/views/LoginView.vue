<template>
  <div class="login-wrapper">
    <div class="login-container">
      <div class="login-panel">
        <div class="login-header">
          <img src="/logoProtegeme.png" alt="Logo" class="login-logo" />
          <h1>Sistema de Transporte</h1>
          <p>Ingrese sus credenciales para continuar</p>
        </div>
        
        <!-- LOGIN FORM -->
        <form v-if="!showForgot" @submit.prevent="handleLogin" class="login-form">
          <div class="form-field">
            <label for="username">Usuario</label>
            <InputText
              id="username"
              v-model="form.username"
              :invalid="!!errors.username"
              placeholder="Ingrese su usuario"
              @blur="validateUsername"
            />
            <small v-if="errors.username" class="p-error">{{ errors.username }}</small>
          </div>

          <div class="form-field">
            <label for="password">Contraseña</label>
            <Password
              id="password"
              v-model="form.password"
              :invalid="!!errors.password"
              placeholder="Ingrese su contraseña"
              :feedback="false"
              toggle-mask
              @blur="validatePassword"
            />
            <small v-if="errors.password" class="p-error">{{ errors.password }}</small>
          </div>

          <Button
            type="submit"
            label="Iniciar Sesión"
            class="login-button"
            :loading="loading"
            icon="pi pi-sign-in"
          />

          <div class="forgot-link">
            <button type="button" class="link-btn" @click="showForgot = true">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </form>

        <!-- FORGOT PASSWORD FORM -->
        <div v-else class="login-form">
          <div class="forgot-header">
            <button class="back-btn" @click="resetForgot">
              <i class="pi pi-arrow-left" /> Volver al inicio de sesión
            </button>
            <h3>Recuperar contraseña</h3>
            <p>Ingrese su usuario o correo electrónico y le enviaremos una contraseña temporal.</p>
          </div>

          <div class="form-field">
            <label>Usuario o correo</label>
            <InputText
              v-model="forgotIdentifier"
              placeholder="usuario o correo@ejemplo.com"
              :disabled="forgotSent"
            />
          </div>

          <div v-if="forgotSent" class="forgot-success">
            <i class="pi pi-check-circle" />
            {{ forgotMessage }}
          </div>

          <Button
            v-if="!forgotSent"
            label="Enviar contraseña temporal"
            icon="pi pi-send"
            class="login-button"
            :loading="forgotLoading"
            :disabled="!forgotIdentifier.trim()"
            @click="handleForgotPassword"
          />

          <Button
            v-else
            label="Volver al inicio de sesión"
            icon="pi pi-sign-in"
            class="login-button p-button-secondary"
            @click="resetForgot"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useToast } from 'primevue/usetoast'
import { AuthserviceApi } from '../api/auth.service'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(false)
const form = reactive({ username: '', password: '' })
const errors = reactive({ username: '', password: '' })

// Forgot password state
const showForgot = ref(false)
const forgotIdentifier = ref('')
const forgotLoading = ref(false)
const forgotSent = ref(false)
const forgotMessage = ref('')

const validateUsername = () => {
  errors.username = !form.username ? 'El usuario es requerido' : ''
}

const validatePassword = () => {
  if (!form.password) errors.password = 'La contraseña es requerida'
  else if (form.password.length < 6) errors.password = 'La contraseña debe tener al menos 6 caracteres'
  else errors.password = ''
}

const validateForm = () => {
  validateUsername()
  validatePassword()
  return !errors.username && !errors.password
}

const handleLogin = async () => {
  if (!validateForm()) return

  loading.value = true
  try {
    const data = await authStore.login({
      usuario: form.username,
      password: form.password,
    })

    toast.add({
      severity: 'success',
      summary: 'Bienvenido',
      detail: `Hola ${data?.user?.firstName || data?.usuario?.nombre || 'usuario'}`,
      life: 3000,
    })

    // If must change password, the router guard will redirect automatically
    if (data?.must_change_password) {
      router.replace({ name: 'change-password' })
    } else {
      router.replace('/')
    }
  } catch (error: any) {
    const msg = authStore.error || error?.response?.data?.message || error?.message || 'Credenciales inválidas'
    toast.add({ severity: 'error', summary: 'Error de Autenticación', detail: msg, life: 5000 })
  } finally {
    loading.value = false
  }
}

const handleForgotPassword = async () => {
  if (!forgotIdentifier.value.trim()) return
  forgotLoading.value = true
  try {
    const { data } = await AuthserviceApi.forgotPassword(forgotIdentifier.value.trim())
    forgotMessage.value = data?.message || 'Si el usuario o correo existe, recibirá la contraseña temporal.'
    forgotSent.value = true
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.response?.data?.message || 'No se pudo procesar la solicitud',
      life: 4000,
    })
  } finally {
    forgotLoading.value = false
  }
}

function resetForgot() {
  showForgot.value = false
  forgotIdentifier.value = ''
  forgotSent.value = false
  forgotMessage.value = ''
}
</script>

<style scoped>

.p-inputtext,
.p-password input.p-inputtext {
  background-color: var(--surface-card);
  color: var(--text-color);
  border: 1px solid var(--surface-border);
}

.p-inputtext:enabled:focus,
.p-password input.p-inputtext:enabled:focus {
  border-color: var(--primary-color);
  box-shadow: var(--focus-ring);
  outline: 0;
}

.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

.login-container {
  width: 100%;
  max-width: 400px;
}

.login-panel {
  background: var(--surface-card);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-logo {
  height: 3rem;
  margin-bottom: 1rem;
}

.login-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 0.5rem 0;
}

.login-header p {
  color: var(--text-color-secondary);
  margin: 0;
  font-size: 0.875rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-weight: 500;
  color: var(--text-color);
  background: var(--surface-card);
  font-size: 0.875rem;
}

.login-button {
  background: var(--primary-color);
  border: 1px solid var(--primary-color-text);
  color: var(--primary-color-text);
  padding: 0.75rem;
  font-size: 1rem;
  font-weight: 500;
}

.login-button:hover{
    background: var(--primary-color-hover)!important;
    color: var(--primary-color-text)!important;
}

.login-footer {
  text-align: center;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--surface-border);
}

.login-footer small {
  color: var(--text-color-secondary);
  background: var(--surface-100);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  display: inline-block;
}

.forgot-link {
  text-align: center;
  margin-top: -0.5rem;
}

.link-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--primary-color, #1e40af);
  font-size: 0.85rem;
  text-decoration: underline;
  padding: 0;
}

.link-btn:hover {
  opacity: 0.8;
}

.forgot-header {
  margin-bottom: 1rem;
}

.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  font-size: 0.82rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0;
  margin-bottom: 0.75rem;
}

.back-btn:hover { color: #374151; }

.forgot-header h3 {
  margin: 0 0 0.35rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-color);
}

.forgot-header p {
  font-size: 0.82rem;
  color: var(--text-color-secondary);
  margin: 0;
}

.forgot-success {
  background: #dcfce7;
  color: #166534;
  border-radius: 8px;
  padding: 0.85rem 1rem;
  font-size: 0.875rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.forgot-success i {
  margin-top: 2px;
  flex-shrink: 0;
}

</style>