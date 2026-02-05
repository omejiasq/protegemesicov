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
          <li class="layout-menuitem-category">
            <div class="layout-menuitem-root-text">PRINCIPAL</div>
            <ul>
              <li>
                <router-link
                  to="/dashboard"
                  class="layout-menuitem-link"
                  :class="{
                    'active-menuitem': $route.name === 'dashboard-home',
                  }"
                >
                  <i class="pi pi-home layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Dashboard</span>
                </router-link>
              </li>
            </ul>
          </li>

          <li class="layout-menuitem-category">
            <div class="layout-menuitem-root-text">GESTIÓN</div> 
            <ul>
 
              
              <li class="layout-menuitem-category">
                <div class="layout-menuitem-root-text">MANTENIMIENTOS</div>
                <ul>

                <!--
                  <li>
                    <router-link
                      to="/maintenance/program"
                      class="layout-menuitem-link"
                      :class="{
                        'active-menuitem': $route.path.includes(
                          '/maintenance/preventive'
                        ),
                      }"
                    >
                      <i class="pi pi-calendar layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Programas</span>
                    </router-link>
                  </li>
                -->

                  <li>
                    <router-link
                      to="/maintenance/enlistment"
                      class="layout-menuitem-link"
                      :class="{
                        'active-menuitem': $route.path.includes(
                          '/maintenance/enlistment'
                        ),
                      }"
                    >
                      <i class="pi pi-list-check layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Alistamientos</span>
                    </router-link>
                  </li>
                  <li>
                    <router-link
                      to="/maintenance/corrective"
                      class="layout-menuitem-link"
                      :class="{
                        'active-menuitem': $route.path.includes(
                          '/maintenance/corrective'
                        ),
                      }"
                    >
                      <i class="pi pi-wrench layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Correctivos</span>
                    </router-link>
                  </li>
                  <li>
                    <router-link
                      to="/maintenance/preventive"
                      class="layout-menuitem-link"
                      :class="{
                        'active-menuitem': $route.path.includes(
                          '/maintenance/preventive'
                        ),
                      }"
                    >
                      <i class="pi pi-shield layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Preventivos</span>
                    </router-link>
                  </li>


                  <li>
                    <router-link
                      to="/maintenance/maintenancecalendar"
                      class="layout-menuitem-link"
                      :class="{
                        'active-menuitem': $route.path.includes(
                          '/maintenance/maintenancecalendar'
                        ),
                      }"
                    >
                      <i class="pi pi-list-check layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Calendario de mantenimientos</span>
                    </router-link>
                  </li>


                </ul>
              </li>
              <!--
              <li class="layout-menuitem-category">
                <div class="layout-menuitem-root-text">AUTORIZACIONES</div>
                <ul>
                  <li>
                    <router-link
                      to="/authorizations"
                      class="layout-menuitem-link"
                      :class="{
                        'active-menuitem': $route.path.includes(
                          '/authorizations'
                        ),
                      }"
                    >
                      <i class="pi pi-lock layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Autorizaciones</span>
                    </router-link>
                  </li>
                </ul>
              </li>
            

              <li class="layout-menuitem-category">
                <div class="layout-menuitem-root-text">NOVEDADES</div>
                <ul>
                  <li>
                    <router-link
                      to="/incidents"
                      class="layout-menuitem-link"
                      :class="{
                        'active-menuitem': $route.path.includes(
                          '/incidents'
                        ),
                      }"
                    >
                      <i class="pi pi-info-circle layout-menuitem-icon"></i>
                      <span class="layout-menuitem-text">Novedades</span>
                    </router-link>
                  </li>
                </ul>
              </li>
            -->

         <li class="layout-menuitem-category">
            <div class="layout-menuitem-root-text">Config</div> 
            <ul>
               <li>
                <router-link
                  to="/vehicles"
                  class="layout-menuitem-link"
                  :class="{
                    'active-menuitem': $route.path.includes('/vehicles'),
                  }"
                >
                  <i class="pi pi-car layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Vehículos</span>
                </router-link>
              </li>

              <li>
                <router-link
                  to="/drivers"
                  class="layout-menuitem-link"
                  :class="{
                    'active-menuitem': $route.path.includes('/drivers'),
                  }"
                >
                  <i class="pi pi-users layout-menuitem-icon"></i>
                  <span class="layout-menuitem-text">Conductores</span>
                </router-link>
              </li> 
            </ul>
          </li>


            </ul>
          </li>
        </ul>
      </div>
    </div>
  </Sidebar>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Sidebar from "primevue/sidebar";

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  hide: [];
}>();

const visible = computed({
  get: () => props.visible,
  set: (value) => {
    if (!value) {
      emit("hide");
    }
  },
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

.layout-sidebar :deep(.p-sidebar-header) {
  display: none;
}

.layout-sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.layout-sidebar-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 1.5rem;
  font-size: 1.2rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.layout-sidebar-logo img {
  height: 4rem;
}

.layout-menu {
  flex: 1;
  padding: 1rem 0;
}

.layout-menu-root-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.layout-menuitem-category {
  margin-bottom: 1rem;
}

.layout-menuitem-root-text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0 1.5rem;
  margin-bottom: 0.5rem;
  letter-spacing: 0.5px;
}

.layout-menuitem-category ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.layout-menuitem-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  color: rgba(255, 255, 255, 0.87);
  text-decoration: none;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.layout-menuitem-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.layout-menuitem-link.active-menuitem {
  background: rgba(255, 255, 255, 0.1);
  border-left-color: #60a5fa;
  color: white;
}

.layout-menuitem-icon {
  font-size: 1rem;
  width: 1rem;
}

.layout-menuitem-text {
  font-weight: 500;
}

@media screen and (max-width: 992px) {
  .layout-sidebar :deep(.p-sidebar) {
    position: fixed;
    transform: translateX(-100%);
    transition: transform 0.2s;
  }

  .layout-sidebar.p-sidebar-active :deep(.p-sidebar) {
    transform: translateX(0);
  }
}
</style>
