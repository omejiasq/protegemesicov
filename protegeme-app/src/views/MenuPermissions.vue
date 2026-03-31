<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">Permisos de Menú por Usuario</h2>

    <!-- Permisos de empresa -->
    <div class="card mb-4">
      <div class="flex align-items-center justify-content-between mb-3">
        <h3 class="text-lg font-semibold m-0">Permisos de la Empresa (defecto para todos los usuarios)</h3>
        <Button
          label="Guardar empresa"
          icon="pi pi-save"
          class="p-button-sm"
          :loading="savingEnterprise"
          @click="saveEnterprisePermissions"
        />
      </div>
      <p class="text-sm text-color-secondary mb-3">
        Si un usuario no tiene permisos individuales, se usarán estos. Deje vacío para permitir todo.
      </p>
      <div v-if="loadingCatalog" class="flex justify-content-center p-4">
        <ProgressSpinner style="width:40px;height:40px" />
      </div>
      <div v-else class="grid">
        <div
          v-for="item in webCatalog"
          :key="item.key"
          class="col-12 md:col-4 lg:col-3"
        >
          <div class="flex align-items-center gap-2 p-2">
            <Checkbox
              v-model="enterpriseKeys"
              :value="item.key"
              :inputId="`ent-${item.key}`"
            />
            <label :for="`ent-${item.key}`" class="cursor-pointer">
              <i :class="item.icon" class="mr-1 text-xs" />
              {{ item.label }}
              <span class="text-xs text-color-secondary ml-1">({{ item.category }})</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Selección de usuario -->
    <div class="card mb-3">
      <h3 class="text-lg font-semibold mb-3">Permisos individuales por usuario</h3>
      <div class="grid">
        <div class="col-12 md:col-4">
          <label class="block mb-1 font-medium">Seleccionar usuario</label>
          <Dropdown
            v-model="selectedUser"
            :options="allUserGroups"
            option-label="displayName"
            option-group-label="groupLabel"
            option-group-children="items"
            placeholder="Seleccione un usuario"
            class="w-full"
            filter
            @change="onUserSelect"
          />
        </div>
        <div v-if="selectedUser" class="col-12 md:col-8 flex align-items-end">
          <Button
            label="Heredar de empresa (limpiar)"
            icon="pi pi-refresh"
            class="p-button-sm p-button-outlined mr-2"
            @click="clearUserPermissions"
          />
          <Button
            label="Guardar usuario"
            icon="pi pi-save"
            class="p-button-sm"
            :loading="savingUser"
            @click="saveUserPermissions"
          />
        </div>
      </div>

      <template v-if="selectedUser">
        <div class="mt-3">
          <p class="text-sm text-color-secondary mb-2">
            Opciones habilitadas para
            <strong>{{ selectedUser.displayName }}</strong>.
            Si no selecciona ninguna, hereda los permisos de la empresa.
          </p>

          <!-- Opciones Web -->
          <div v-if="webCatalogForUser.length" class="mb-3">
            <p class="text-sm font-semibold mb-2" style="color:#1d4ed8">
              <i class="pi pi-desktop mr-1" /> Opciones Web
            </p>
            <div class="grid">
              <div
                v-for="item in webCatalogForUser"
                :key="item.key"
                class="col-12 md:col-4 lg:col-3"
              >
                <div class="flex align-items-center gap-2 p-2">
                  <Checkbox v-model="userKeys" :value="item.key" :inputId="`usr-${item.key}`" />
                  <label :for="`usr-${item.key}`" class="cursor-pointer">
                    <i :class="item.icon" class="mr-1 text-xs" />
                    {{ item.label }}
                    <span class="text-xs text-color-secondary ml-1">({{ item.category }})</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Opciones Mobile -->
          <div v-if="mobileCatalogForUser.length">
            <p class="text-sm font-semibold mb-2" style="color:#059669">
              <i class="pi pi-mobile mr-1" /> Opciones App Móvil
            </p>
            <div class="grid">
              <div
                v-for="item in mobileCatalogForUser"
                :key="item.key"
                class="col-12 md:col-4 lg:col-3"
              >
                <div class="flex align-items-center gap-2 p-2">
                  <Checkbox v-model="userKeys" :value="item.key" :inputId="`usr-${item.key}`" />
                  <label :for="`usr-${item.key}`" class="cursor-pointer">
                    <i :class="item.icon" class="mr-1 text-xs" />
                    {{ item.label }}
                    <span class="text-xs text-color-secondary ml-1">({{ item.category }})</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Button from '../components/ui/Button.vue';
import Dropdown from 'primevue/dropdown';
import Checkbox from 'primevue/checkbox';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '../stores/authStore';
import { AuthserviceApi } from '../api/auth.service';
import { DriversserviceApi } from '../api/drivers.service';

const toast = useToast();
const authStore = useAuthStore();

// ── Catálogo ─────────────────────────────────────────────────────────────────
const loadingCatalog = ref(true);
const webCatalog = ref<any[]>([]);
const mobileCatalog = ref<any[]>([]);
const fullCatalog = ref<any[]>([]);

async function loadCatalog() {
  loadingCatalog.value = true;
  try {
    const { data } = await AuthserviceApi.getMenuCatalog() as any;
    webCatalog.value = (data as any[]).filter(i => i.platform !== 'mobile');
    mobileCatalog.value = (data as any[]).filter(i => i.platform !== 'web');
    fullCatalog.value = data as any[];
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el catálogo', life: 3000 });
  } finally {
    loadingCatalog.value = false;
  }
}

// ── Permisos de empresa ───────────────────────────────────────────────────────
const enterpriseKeys = ref<string[]>([]);
const savingEnterprise = ref(false);

async function loadEnterprisePermissions() {
  try {
    const eid = authStore.enterpriseId!;
    const { data } = await AuthserviceApi.getEnterpriseMenuPermissions(eid) as any;
    enterpriseKeys.value = data.enterprise_menu_permissions ?? [];
  } catch { /* silencioso */ }
}

async function saveEnterprisePermissions() {
  savingEnterprise.value = true;
  try {
    await AuthserviceApi.setEnterpriseMenuPermissions(authStore.enterpriseId!, enterpriseKeys.value);
    toast.add({ severity: 'success', summary: 'Guardado', detail: 'Permisos de empresa actualizados', life: 3000 });
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar', life: 3000 });
  } finally {
    savingEnterprise.value = false;
  }
}

// ── Lista de usuarios (staff) ─────────────────────────────────────────────────
const staffList = ref<any[]>([]);
const driversList = ref<any[]>([]);

async function loadStaff() {
  try {
    const { data } = await AuthserviceApi.getEnterpriseStaff() as any;
    staffList.value = (data?.data ?? []).map((u: any) => ({
      ...u,
      _userType: 'staff',
      displayName: `${u.usuario?.nombre ?? ''} ${u.usuario?.apellido ?? ''} (${u.usuario?.usuario ?? ''})`.trim(),
    }));
  } catch { /* silencioso */ }
}

async function loadDriversWithAccess() {
  try {
    const { data } = await DriversserviceApi.list({ active: true }) as any;
    const items = data?.data ?? data?.items ?? (Array.isArray(data) ? data : []);
    driversList.value = items
      .filter((d: any) => d.usuario?.usuario)
      .map((d: any) => ({
        ...d,
        _userType: 'driver',
        displayName: `${d.usuario?.nombre ?? ''} (${d.usuario?.usuario ?? ''}) — Conductor`,
      }));
  } catch { /* silencioso */ }
}

const allUserGroups = computed(() => {
  const groups = [];
  if (staffList.value.length) groups.push({ groupLabel: 'Colaboradores', items: staffList.value });
  if (driversList.value.length) groups.push({ groupLabel: 'Conductores con acceso móvil', items: driversList.value });
  return groups;
});

const webCatalogForUser = computed(() => webCatalog.value);
const mobileCatalogForUser = computed(() => mobileCatalog.value);

// ── Permisos por usuario ──────────────────────────────────────────────────────
const selectedUser = ref<any>(null);
const userKeys = ref<string[]>([]);
const savingUser = ref(false);

async function onUserSelect() {
  if (!selectedUser.value) return;
  try {
    const { data } = await AuthserviceApi.getUserMenuPermissions(selectedUser.value._id) as any;
    userKeys.value = data.menu_permissions ?? [];
  } catch {
    userKeys.value = [];
  }
}

async function saveUserPermissions() {
  savingUser.value = true;
  try {
    console.log('[PERMISOS] Guardando para _id:', selectedUser.value._id, '| keys:', userKeys.value);
    const { data } = await AuthserviceApi.setUserMenuPermissions(selectedUser.value._id, userKeys.value) as any;
    console.log('[PERMISOS] Respuesta del servidor:', data);
    toast.add({ severity: 'success', summary: 'Guardado', detail: 'Permisos del usuario actualizados', life: 3000 });
  } catch (e: any) {
    console.error('[PERMISOS] Error al guardar:', e?.response?.data ?? e?.message);
    toast.add({ severity: 'error', summary: 'Error', detail: e?.response?.data?.message || 'No se pudo guardar', life: 3000 });
  } finally {
    savingUser.value = false;
  }
}

function clearUserPermissions() {
  userKeys.value = [];
}

onMounted(async () => {
  await Promise.all([loadCatalog(), loadEnterprisePermissions(), loadStaff(), loadDriversWithAccess()]);
});
</script>
