<template>
  <div class="layout-topbar" :class="{ 'sidebar-collapsed': !sidebarVisible }">
    <div class="layout-topbar-logo">
      <Button 
        icon="pi pi-bars" 
        class="p-button-text p-button-rounded p-button-plain"
        @click="toggleMenu"
      />
      <router-link to="/dashboard" class="layout-topbar-logo-link">
        <img src="/logoProtegeme.png" alt="Logo" style="height: 2rem" />
        <span>Dashboard</span>
      </router-link>
    </div>
    
    <div class="layout-topbar-menu">
      <div class="layout-topbar-menu-button layout-topbar-menu-button-profile">
        <Button
          :label="auth.profileName || 'Usuario'"
          icon="pi pi-user"
          class="p-button-text"
          @click="toggleProfileMenu"
          aria-haspopup="true"
          aria-controls="overlay_menu"
        />
        <Menu
          id="overlay_menu"
          ref="menu"
          :model="profileMenuItems"
          :popup="true"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Menu from 'primevue/menu'

defineProps<{
  sidebarVisible: boolean
}>()

const emit = defineEmits<{
  'toggle-menu': []
}>()

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()
const menu = ref()

const profileMenuItems = [
  {
    label: 'Perfil',
    icon: 'pi pi-user',
    command: () => {
      // Implementar vista de perfil
      toast.add({
        severity: 'info',
        summary: 'Información',
        detail: 'Funcionalidad en desarrollo',
        life: 3000
      })
    }
  },
  {
    label: 'Configuración',
    icon: 'pi pi-cog',
    command: () => {
      // Implementar configuración
      toast.add({
        severity: 'info',
        summary: 'Información',
        detail: 'Funcionalidad en desarrollo',
        life: 3000
      })
    }
  },
  {
    separator: true
  },
  {
    label: 'Cerrar Sesión',
    icon: 'pi pi-sign-out',
    command: () => {
      auth.logout()
      toast.add({
        severity: 'success',
        summary: 'Sesión Cerrada',
        detail: 'Has cerrado sesión exitosamente',
        life: 3000
      })
      router.push('/login')
    }
  }
]

const toggleProfileMenu = (event: Event) => {
  menu.value.toggle(event)
}

const toggleMenu = () => {
  emit('toggle-menu')
}
</script>

<style scoped>
.layout-topbar {
  background: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
  padding: 0 2rem;
  height: 5rem;
  position: fixed;
  top: 0;
  left: 300px;
  right: 0;
  z-index: 997;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: left 0.3s ease;
}

.layout-topbar.sidebar-collapsed {
  left: 0;
}

.layout-topbar-logo {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.layout-topbar-logo-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--text-color);
  font-size: 1.5rem;
  font-weight: 600;
}

.layout-topbar-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

@media screen and (max-width: 992px) {
  .layout-topbar {
    left: 0;
  }
}
</style>