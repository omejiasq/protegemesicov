<template>
  <Sidebar
    v-model:visible="visible"
    position="left"
    :class="['layout-sidebar', { 'sidebar-hidden': !visible }]"
    :modal="false"
    :show-close-icon="false"
  >
    <div class="layout-sidebar-content">
      <div class="layout-sidebar-logo">
        <img src="/logoProtegeme.png" alt="Logo" style="height: 2rem" />
        <span></span>
      </div>

      <div class="layout-menu">
        <ul class="layout-menu-root-list">

          <!-- ═══════════════ PRINCIPAL (todos) ═══════════════ -->
          <li class="layout-menuitem-category">
            <div class="layout-menuitem-root-text">PRINCIPAL</div>
            <ul>
              <li>
                <router-link
                  to="/dashboard"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.name === 'dashboard' }"
                >
                  <i class="pi pi-home layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Dashboard</span>
                </router-link>
              </li>
            </ul>
          </li>

          <!-- ═══════════════ GESTIÓN ═══════════════ -->
          <li class="layout-menuitem-category">
            <div class="layout-menuitem-root-text">GESTIÓN</div>
            <ul>

              <!-- MANTENIMIENTOS -->
              <li class="layout-menuitem-category">
                <div class="layout-menuitem-root-text">MANTENIMIENTOS</div>
                <ul>

                  <li v-if="can('web_enlistment')">
                    <router-link
                      to="/maintenance/enlistment"
                      class="layout-menuitem-link"
                      :class="{ 'active-menuitem': $route.path.includes('/maintenance/enlistment') }"
                    >
                      <i class="pi pi-list-check layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Alistamientos</span>
                    </router-link>
                  </li>

                  <li v-if="can('web_corrective')">
                    <router-link
                      to="/maintenance/corrective"
                      class="layout-menuitem-link"
                      :class="{ 'active-menuitem': $route.path.includes('/maintenance/corrective') }"
                    >
                      <i class="pi pi-wrench layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Correctivos</span>
                    </router-link>
                  </li>

                  <li v-if="can('web_preventive')">
                    <router-link
                      to="/maintenance/preventive"
                      class="layout-menuitem-link"
                      :class="{ 'active-menuitem': $route.path.includes('/maintenance/preventive') }"
                    >
                      <i class="pi pi-shield layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Preventivos</span>
                    </router-link>
                  </li>

                  <li v-if="can('web_calendar')">
                    <router-link
                      to="/maintenance/maintenancecalendar"
                      class="layout-menuitem-link"
                      :class="{ 'active-menuitem': $route.path.includes('/maintenance/maintenancecalendar') }"
                    >
                      <i class="pi pi-calendar layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Calendario</span>
                    </router-link>
                  </li>

                  <li v-if="can('web_maint_types')">
                    <router-link
                      to="/maintenance/types"
                      class="layout-menuitem-link"
                      :class="{ 'active-menuitem': $route.path === '/maintenance/types' }"
                    >
                      <i class="pi pi-list layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Partes mant.</span>
                    </router-link>
                  </li>

                  <li v-if="can('web_inspection_types')">
                    <router-link
                      to="/maintenance/inspection-types"
                      class="layout-menuitem-link"
                      :class="{ 'active-menuitem': $route.path.includes('/maintenance/inspection-types') }"
                    >
                      <i class="pi pi-clipboard layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Partes alist.</span>
                    </router-link>
                  </li>

                  <li v-if="tieneFuec && can('web_fuec')">
                    <router-link
                      to="/maintenance/fuec"
                      class="layout-menuitem-link"
                      :class="{ 'active-menuitem': $route.path.includes('/maintenance/fuec') }"
                    >
                      <i class="pi pi-file-export layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">FUEC</span>
                    </router-link>
                  </li>

                  <li v-if="can('web_suppliers')">
                    <router-link
                      to="/maintenance/suppliers"
                      class="layout-menuitem-link"
                      :class="{ 'active-menuitem': $route.path.includes('/maintenance/suppliers') }"
                    >
                      <i class="pi pi-building layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Proveedores</span>
                    </router-link>
                  </li>

                  <li v-if="can('web_response_types')">
                    <router-link
                      to="/maintenance/response-types"
                      class="layout-menuitem-link"
                      :class="{ 'active-menuitem': $route.path.includes('/maintenance/response-types') }"
                    >
                      <i class="pi pi-check-square layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Tipos respuesta</span>
                    </router-link>
                  </li>

                </ul>
              </li>

              <!-- CONFIG -->
              <li class="layout-menuitem-category" v-if="can('web_vehicles') || can('web_drivers') || can('web_users') || can('web_enterprise') || (isAdmin && can('web_menu_perms')) || (esEspecialOMixto && can('web_data_sync'))">
                <div class="layout-menuitem-root-text">Config</div>
                <ul>
                  <li v-if="can('web_vehicles')">
                    <router-link
                      to="/vehicles"
                      class="layout-menuitem-link"
                      :class="{ 'active-menuitem': $route.path.includes('/vehicles') }"
                    >
                      <i class="pi pi-car layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Vehículos</span>
                    </router-link>
                  </li>

                  <li v-if="can('web_drivers')">
                    <router-link
                      to="/drivers"
                      class="layout-menuitem-link"
                      :class="{ 'active-menuitem': $route.path.includes('/drivers') }"
                    >
                      <i class="pi pi-users layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Conductores</span>
                    </router-link>
                  </li>

                  <li v-if="can('web_users')">
                    <router-link
                      to="/staff"
                      class="layout-menuitem-link"
                      :class="{ 'active-menuitem': $route.path.includes('/staff') }"
                    >
                      <i class="pi pi-id-card layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Usuarios</span>
                    </router-link>
                  </li>

                  <li v-if="can('web_enterprise')">
                    <router-link
                      to="/enterprise/settings"
                      class="layout-menuitem-link"
                      :class="{ 'active-menuitem': $route.path.includes('/enterprise/settings') }"
                    >
                      <i class="pi pi-building layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Mi Empresa</span>
                    </router-link>
                  </li>

                  <li v-if="isAdmin && can('web_menu_perms')">
                    <router-link
                      to="/enterprise/menu-permissions"
                      class="layout-menuitem-link"
                      :class="{ 'active-menuitem': $route.path.includes('/enterprise/menu-permissions') }"
                    >
                      <i class="pi pi-lock layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Permisos Menú</span>
                    </router-link>
                  </li>

                  <li v-if="esEspecialOMixto && can('web_data_sync')">
                    <router-link
                      to="/enterprise/data-sync"
                      class="layout-menuitem-link"
                      :class="{ 'active-menuitem': $route.path.includes('/enterprise/data-sync') }"
                    >
                      <i class="pi pi-sync layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Integración Datos</span>
                    </router-link>
                  </li>
                </ul>
              </li>

            </ul>
          </li>

          <!-- ═══════════════ PESV ═══════════════ -->
          <li class="layout-menuitem-category" v-if="esEspecialOMixto && can('web_pesv')">
            <button class="layout-menuitem-group-btn" @click="pesvOpen = !pesvOpen">
              <span class="layout-menuitem-root-text">PESV</span>
              <i :class="`pi pi-chevron-${pesvOpen ? 'up' : 'down'} group-arrow`"></i>
            </button>
            <ul v-show="pesvOpen">

              <li>
                <router-link
                  to="/pesv/dashboard"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path === '/pesv/dashboard' }"
                >
                  <i class="pi pi-chart-bar layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Dashboard F2</span>
                </router-link>
              </li>

              <li>
                <router-link
                  to="/pesv/working-hours"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path === '/pesv/working-hours' }"
                >
                  <i class="pi pi-clock layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Horas Conducidas</span>
                </router-link>
              </li>

              <li>
                <router-link
                  to="/pesv/habits"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path === '/pesv/habits' }"
                >
                  <i class="pi pi-car layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Hábitos de Conducción</span>
                </router-link>
              </li>

              <li>
                <router-link
                  to="/pesv/breathalyzer"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path === '/pesv/breathalyzer' }"
                >
                  <i class="pi pi-heart layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Alcoholemia</span>
                </router-link>
              </li>

              <li>
                <router-link
                  to="/pesv/training"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path === '/pesv/training' }"
                >
                  <i class="pi pi-book layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Capacitaciones</span>
                </router-link>
              </li>

              <li>
                <router-link
                  to="/pesv/evidence"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path === '/pesv/evidence' }"
                >
                  <i class="pi pi-file-check layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Evidencias F2</span>
                </router-link>
              </li>

              <li>
                <router-link
                  to="/pesv/f1"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path === '/pesv/f1' }"
                >
                  <i class="pi pi-microphone layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Formulario F1</span>
                  <span class="badge-new">IA+Voz</span>
                </router-link>
              </li>

              <!-- ── NUEVOS MÓDULOS PESV (Fase 1 + Fase 2 demo) ── -->
              <li>
                <router-link
                  to="/pesv/non-conformities"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path === '/pesv/non-conformities' }"
                >
                  <i class="pi pi-ban layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">No Conformidades</span>
                  <span class="badge-new">NCAC</span>
                </router-link>
              </li>

              <li>
                <router-link
                  to="/pesv/km-importer"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path === '/pesv/km-importer' }"
                >
                  <i class="pi pi-map layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Kilometraje GPS</span>
                </router-link>
              </li>

              <li>
                <router-link
                  to="/pesv/incidents"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path === '/pesv/incidents' }"
                >
                  <i class="pi pi-car layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Siniestros y Costos</span>
                  <span class="badge-fase2">F2</span>
                </router-link>
              </li>

              <li>
                <router-link
                  to="/pesv/risk-matrix"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path === '/pesv/risk-matrix' }"
                >
                  <i class="pi pi-exclamation-triangle layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Riesgos Viales</span>
                  <span class="badge-fase2">F2</span>
                </router-link>
              </li>

              <li>
                <router-link
                  to="/pesv/annual-plan"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path === '/pesv/annual-plan' }"
                >
                  <i class="pi pi-calendar layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Metas y Plan Anual</span>
                  <span class="badge-fase2">F2</span>
                </router-link>
              </li>

            </ul>
          </li>

          <!-- ═══════════════ ALERTAS DE DOCUMENTOS ═══════════════ -->
          <li class="layout-menuitem-category" v-if="esEspecialOMixto && (can('web_doc_alerts') || isAdmin)">
            <div class="layout-menuitem-root-text">ALERTAS</div>
            <ul>
              <li>
                <router-link
                  to="/maintenance/document-alerts"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path.includes('/maintenance/document-alerts') }"
                >
                  <i class="pi pi-bell layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Docs. Vencidos</span>
                </router-link>
              </li>
            </ul>
          </li>

          <!-- ═══════════════ DESPACHOS (CARRETERA/MIXTO · asignado por superadmin) ═══════════════ -->
          <li class="layout-menuitem-category"
              v-if="esCarretera && (canStrict('web_despachos_salidas') || canStrict('web_despachos_llegadas') || canStrict('web_despachos_novedades'))">
            <div class="layout-menuitem-root-text">DESPACHOS</div>
            <ul>
              <li v-if="canStrict('web_despachos_salidas')">
                <router-link
                  to="/despachos/salidas"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path.includes('/despachos/salidas') }"
                >
                  <i class="pi pi-arrow-up-right layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Salidas Terminal</span>
                </router-link>
              </li>
              <li v-if="canStrict('web_despachos_llegadas')">
                <router-link
                  to="/despachos/llegadas"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path.includes('/despachos/llegadas') }"
                >
                  <i class="pi pi-arrow-down-left layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Llegadas Terminal</span>
                </router-link>
              </li>
              <li v-if="canStrict('web_despachos_novedades')">
                <router-link
                  to="/despachos/novedades"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path.includes('/despachos/novedades') }"
                >
                  <i class="pi pi-exclamation-circle layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Novedades Terminal</span>
                </router-link>
              </li>
            </ul>
          </li>

          <!-- ═══════════════ REPORTES ═══════════════ -->
          <li class="layout-menuitem-category" v-if="can('web_audit')">
            <div class="layout-menuitem-root-text">REPORTES</div>
            <ul>
              <li>
                <router-link
                  to="/audit-report"
                  class="layout-menuitem-link"
                  :class="{ 'active-menuitem': $route.path.includes('/audit-report') }"
                >
                  <i class="pi pi-history layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Auditoría SICOV</span>
                </router-link>
              </li>
            </ul>
          </li>

          <!-- ═══════════════ SUPERADMIN ═══════════════ -->
          <template v-if="isSuperAdmin">
            <li class="layout-menuitem-category">
              <div class="layout-menuitem-root-text">ADMINISTRACIÓN</div>
              <ul>
                <li>
                  <router-link
                    to="/admin/enterprises"
                    class="layout-menuitem-link"
                    :class="{ 'active-menuitem': $route.path.includes('/admin/enterprises') }"
                  >
                    <i class="pi pi-building layout-menuitem-icon"></i>
                    <span class="layout-menuitem-text">Empresas</span>
                  </router-link>
                </li>
                <li>
                  <router-link
                    to="/admin/menu-catalog"
                    class="layout-menuitem-link"
                    :class="{ 'active-menuitem': $route.path.includes('/admin/menu-catalog') }"
                  >
                    <i class="pi pi-list layout-menuitem-icon"></i>
                    <span class="layout-menuitem-text">Catálogo Menú</span>
                  </router-link>
                </li>
              </ul>
            </li>
          </template>

        </ul>
      </div>
    </div>
  </Sidebar>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Sidebar from "primevue/sidebar";
import { useAuthStore } from "../../stores/authStore";

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ hide: [] }>();

const authStore = useAuthStore();

const pesvOpen = ref(true)  // abierto por defecto cuando está en una ruta PESV

const isAdmin = computed(() =>
  ['admin', 'superadmin'].includes(authStore.user?.roleType ?? '')
);

const isSuperAdmin = computed(() => authStore.user?.roleType === 'superadmin');

const tieneFuec = computed(() =>
  ['ESPECIAL', 'MIXTO'].includes(authStore.user?.tipo_habilitacion ?? 'CARRETERA')
);

// PESV e Integración Datos solo visibles para empresas ESPECIAL o MIXTO
const esEspecialOMixto = computed(() =>
  ['ESPECIAL', 'MIXTO'].includes(authStore.user?.tipo_habilitacion ?? '')
);

// Despachos (terminales): visible para CARRETERA y MIXTO mientras se prueba.
// En producción el acceso real queda controlado por enterprise_menu_permissions
// que solo puede asignar el superadmin.
const esCarretera = computed(() =>
  ['CARRETERA', 'MIXTO'].includes(authStore.user?.tipo_habilitacion ?? '')
);

/** Verifica si el usuario tiene permiso para una clave de menú */
function can(key: string): boolean {
  return authStore.canAccess(key);
}

/**
 * Verificación estricta: siempre requiere que la clave esté
 * explícitamente asignada en enterprise_menu_permissions.
 * Usar solo para módulos que el superadmin debe habilitar uno a uno.
 * (Los superadmins sí tienen acceso automático para gestionar el sistema.)
 */
function canStrict(key: string): boolean {
  if (authStore.user?.roleType === 'superadmin') return true;
  const perms = authStore.user?.menu_permissions ?? [];
  return perms.includes(key);
}

const visible = computed({
  get: () => props.visible,
  set: (value) => { if (!value) emit("hide"); },
});
</script>

<style scoped>
.layout-sidebar :deep(.p-sidebar) {
  background: #1e40af;
  border: none;
  width: 300px;
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  z-index: 999;
}
.layout-sidebar :deep(.p-sidebar-header) { display: none; }
.layout-sidebar-content { height: 100%; display: flex; flex-direction: column; }
.layout-sidebar-logo {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 2rem 1.5rem; font-size: 1.2rem; font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.layout-sidebar-logo img { height: 4rem; }
.layout-menu { flex: 1; padding: 1rem 0; }
.layout-menu-root-list { list-style: none; margin: 0; padding: 0; }
.layout-menuitem-category { margin-bottom: 1rem; }
.layout-menuitem-root-text {
  color: rgba(255, 255, 255, 0.6); font-size: 0.75rem;
  font-weight: 600; text-transform: uppercase;
  padding: 0 1.5rem; margin-bottom: 0.5rem; letter-spacing: 0.5px;
}
.layout-menuitem-category ul { list-style: none; margin: 0; padding: 0; }
.layout-menuitem-link {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.75rem 1.5rem; color: rgba(255, 255, 255, 0.87);
  text-decoration: none; transition: all 0.2s;
  border-left: 3px solid transparent;
}
.layout-menuitem-link:hover { background: rgba(255, 255, 255, 0.1); color: white; }
.layout-menuitem-link.active-menuitem {
  background: rgba(255, 255, 255, 0.1);
  border-left-color: #60a5fa; color: white;
}
.layout-menuitem-icon { font-size: 1rem; width: 1rem; }

/* Botón de grupo colapsable PESV */
.layout-menuitem-group-btn {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; background: none; border: none; cursor: pointer;
  padding: 0 1.5rem; margin-bottom: 0.5rem;
}
.layout-menuitem-group-btn .layout-menuitem-root-text {
  padding: 0; margin: 0;
}
.group-arrow {
  color: rgba(255,255,255,0.5); font-size: 0.7rem; transition: transform 0.2s;
}
.badge-new {
  margin-left: auto; font-size: 0.6rem; font-weight: 700;
  background: #8b5cf6; color: white; padding: 1px 6px; border-radius: 10px; letter-spacing: 0.3px;
}
.badge-fase2 {
  margin-left: auto; font-size: 0.6rem; font-weight: 700;
  background: #0ea5e9; color: white; padding: 1px 6px; border-radius: 10px; letter-spacing: 0.3px;
}
.layout-menuitem-text { font-weight: 500; }
@media screen and (max-width: 992px) {
  .layout-sidebar :deep(.p-sidebar) {
    position: fixed; transform: translateX(-100%); transition: transform 0.2s;
  }
  .layout-sidebar.p-sidebar-active :deep(.p-sidebar) { transform: translateX(0); }
}
</style>