<template>
  <div class="layout-wrapper">
    <AppTopbar :sidebar-visible="sidebarVisible" :unread-count="unreadAlerts" @toggle-menu="toggleMenu" />
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
import { useToast } from 'primevue/usetoast'
import AppTopbar from '../components/layout/AppTopbar.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'

const sidebarVisible = ref(true)
const unreadAlerts   = ref(0)
const auth  = useAuthStore()
const toast = useToast()

const API = import.meta.env.VITE_API_MAINTENANCE ?? 'http://localhost:4004'

const toggleMenu  = () => { sidebarVisible.value = !sidebarVisible.value }
const hideSidebar = () => { sidebarVisible.value = false }
const handleResize = () => { sidebarVisible.value = window.innerWidth > 992 }

// ── Polling de alertas de documentos ─────────────────────────────────────
let pollTimer: ReturnType<typeof setInterval> | null = null

async function fetchUnreadCount() {
  if (!auth.token) return
  try {
    const res = await fetch(`${API}/maintenance/document-alerts/unread-count`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    if (!res.ok) return
    const { count } = await res.json()
    const prev = unreadAlerts.value
    unreadAlerts.value = count

    // Si aparecen nuevas alertas → toast de notificación
    if (count > prev && prev >= 0) {
      const newCount = count - prev
      toast.add({
        severity: 'warn',
        summary: '⚠ Documento vencido detectado',
        detail: `${newCount} nueva${newCount > 1 ? 's' : ''} alerta${newCount > 1 ? 's' : ''} de documento${newCount > 1 ? 's' : ''} en la app móvil`,
        life: 8000,
      })
    }
  } catch { /* silencioso — es polling */ }
}

onMounted(() => {
  if (auth.hydrate) auth.hydrate()
  handleResize()
  window.addEventListener('resize', handleResize)

  // Primera carga y luego cada 60 s
  fetchUnreadCount()
  pollTimer = setInterval(fetchUnreadCount, 60_000)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (pollTimer) clearInterval(pollTimer)
})
</script>
