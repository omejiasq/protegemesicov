<template>
  <div class="layout-wrapper">
    <AppTopbar :sidebar-visible="sidebarVisible" @toggle-menu="toggleMenu" />
    <AppSidebar :visible="sidebarVisible" @hide="hideSidebar" />

    <div class="layout-main-container" :class="{ 'sidebar-collapsed': !sidebarVisible }">
      <div class="layout-main">
        <router-view />
      </div>
    </div>

    <Toast />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import AppTopbar from '../components/layout/AppTopbar.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'

const sidebarVisible = ref(true)
const auth = useAuthStore()

const toggleMenu = () => { sidebarVisible.value = !sidebarVisible.value }
const hideSidebar = () => { sidebarVisible.value = false }

const handleResize = () => {
  sidebarVisible.value = window.innerWidth > 992
}

onMounted(() => {
  // Si tu store tiene hydrate(), restauro token/enterprise_id del localStorage.
  // Si no lo usás, podés borrar esta línea: el guard ya cubre la sesión.
  if (auth.hydrate) auth.hydrate()

  handleResize()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>
