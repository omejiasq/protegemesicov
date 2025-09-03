import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const routes: RouteRecordRaw[] = [
  // RUTA PÚBLICA
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true }
  },

  // RUTAS PRIVADAS ENVUELTAS POR EL LAYOUT
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'), // << PARENT
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
      { path: 'vehicles', name: 'vehicles', component: () => import('../views/VehicleListView.vue') },
      { path: 'drivers',  name: 'drivers',  component: () => import('../views/DriverListView.vue') },

    ]
  },

  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()

  if (to.meta?.public) {
    if (to.name === 'login' && auth.isAuthenticated) return next({ name: 'dashboard', replace: true })
    return next()
  }
  if (to.meta?.requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'login', replace: true })
  }
  return next()
})

export default router
