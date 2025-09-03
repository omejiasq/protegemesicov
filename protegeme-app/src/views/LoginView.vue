<template>
  <div class="login-wrapper">
    <div class="login-container">
      <div class="login-panel">
        <div class="login-header">
          <img src="/logoProtegeme.png" alt="Logo" class="login-logo" />
          <h1>Sistema de Transporte</h1>
          <p>Ingrese sus credenciales para continuar</p>
        </div>
        
        <form @submit.prevent="handleLogin" class="login-form">
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
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(false)
const form = reactive({
  username: '',
  password: ''
})

const errors = reactive({
  username: '',
  password: ''
})

const validateUsername = () => {
  if (!form.username) {
    errors.username = 'El usuario es requerido'
  } else {
    errors.username = ''
  }
}

const validatePassword = () => {
  if (!form.password) {
    errors.password = 'La contraseña es requerida'
  } else if (form.password.length < 6) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres'
  } else {
    errors.password = ''
  }
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
      password: form.password
    })

    toast.add({
      severity: 'success',
      summary: 'Bienvenido',
      detail: `Hola ${data?.usuario?.nombre || 'usuario'} 👋`,
      life: 3000
    })

    router.push('/')
  } catch (error: any) {
    const msg = authStore.error || error?.response?.data?.message || error?.message || 'Credenciales inválidas'
    toast.add({
      severity: 'error',
      summary: 'Error de Autenticación',
      detail: msg,
      life: 5000
    })
  } finally {
    loading.value = false
  }
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

</style>