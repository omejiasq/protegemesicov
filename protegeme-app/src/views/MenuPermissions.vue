<template>
  <div class="perms-wrap">

    <!-- ══════════════════════════════════════
         SECCIÓN 1 – PERMISOS DE LA EMPRESA
         (aplican a todos los usuarios que no
          tienen permisos individuales)
    ══════════════════════════════════════ -->
    <div class="pcard">
      <div class="pcard-header">
        <div>
          <h2 class="pcard-title">Permisos por defecto de la Empresa</h2>
          <p class="pcard-sub">
            Se aplican a cualquier usuario que no tenga permisos individuales.
            Deje todo sin marcar para que los usuarios hereden acceso total
            a las opciones estándar (pero <strong>nunca</strong> a módulos
            restringidos como Terminales/DESPACHOS).
          </p>
        </div>
        <Button label="Guardar empresa" icon="pi pi-save" class="p-button-sm btn-save"
                :loading="savingEnterprise" @click="saveEnterprisePermissions" />
      </div>

      <div v-if="loadingCatalog" class="flex justify-content-center p-4">
        <ProgressSpinner style="width:40px;height:40px" />
      </div>
      <template v-else>
        <!-- Opciones Web -->
        <div class="platform-header">
          <i class="pi pi-desktop" /> Opciones Web
        </div>
        <div v-for="cat in webGroupedCatalog" :key="'ew-'+cat.category" class="cat-block">
          <div class="cat-label">
            <Checkbox v-model="selectedCategories" :value="cat.category"
                      :inputId="`cat-ent-${cat.category}`"
                      @change="toggleCategory(cat.category, 'enterprise')" />
            <label :for="`cat-ent-${cat.category}`" class="cat-title cursor-pointer">{{ cat.category }}</label>
          </div>
          <div class="items-grid">
            <div v-for="item in cat.items" :key="item.key" class="perm-item">
              <Checkbox v-model="enterpriseKeys" :value="item.key"
                        :inputId="`ent-${item.key}`"
                        @change="syncCategoryCheck(cat.category, 'enterprise')" />
              <label :for="`ent-${item.key}`" class="cursor-pointer">
                <i :class="item.icon" class="mr-1 text-xs" /> {{ item.label }}
              </label>
            </div>
          </div>
        </div>

        <!-- Opciones App Móvil -->
        <div v-if="mobileGroupedCatalog.length" class="platform-header platform-header-mobile mt-3">
          <i class="pi pi-mobile" /> Opciones App Móvil
        </div>
        <div v-for="cat in mobileGroupedCatalog" :key="'em-'+cat.category" class="cat-block">
          <div class="cat-label">
            <Checkbox v-model="selectedCategories" :value="'mob_'+cat.category"
                      :inputId="`cat-ent-mob-${cat.category}`"
                      @change="toggleCategory(cat.category, 'enterprise')" />
            <label :for="`cat-ent-mob-${cat.category}`" class="cat-title cursor-pointer">{{ cat.category }}</label>
          </div>
          <div class="items-grid">
            <div v-for="item in cat.items" :key="item.key" class="perm-item">
              <Checkbox v-model="enterpriseKeys" :value="item.key"
                        :inputId="`ent-${item.key}`"
                        @change="syncCategoryCheck(cat.category, 'enterprise')" />
              <label :for="`ent-${item.key}`" class="cursor-pointer">
                <i :class="item.icon" class="mr-1 text-xs" /> {{ item.label }}
              </label>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ══════════════════════════════════════
         SECCIÓN 2 – PERMISOS POR USUARIO
    ══════════════════════════════════════ -->
    <div class="pcard">
      <h2 class="pcard-title">Permisos individuales por usuario</h2>
      <p class="pcard-sub">
        Los permisos individuales <strong>reemplazan</strong> completamente
        los de la empresa para ese usuario. Para revocar una opción específica,
        seleccione el usuario, desmarque esa opción y guarde.
      </p>

      <!-- Selector de usuario -->
      <div class="user-selector">
        <div class="field-wrap">
          <label class="field-label">Seleccionar usuario</label>
          <Dropdown
            v-model="selectedUser"
            :options="allUserGroups"
            option-label="displayName"
            option-group-label="groupLabel"
            option-group-children="items"
            placeholder="Seleccione un usuario..."
            class="w-full"
            filter
            @change="onUserSelect"
          />
        </div>
      </div>

      <!-- Panel de permisos del usuario -->
      <template v-if="selectedUser">
        <div class="user-info-bar">
          <span>
            <strong>{{ selectedUser.displayName }}</strong>
          </span>
          <span :class="userHasIndividual ? 'badge-individual' : 'badge-inherited'">
            {{ userHasIndividual ? 'Permisos individuales activos' : 'Heredando permisos de empresa' }}
          </span>
        </div>

        <p class="text-sm text-color-secondary mb-3" style="color:#6b7280">
          <template v-if="userHasIndividual">
            Este usuario tiene permisos propios. Lo que seleccione aquí
            reemplaza los de la empresa.
          </template>
          <template v-else>
            Actualmente este usuario hereda los permisos de la empresa (marcados en gris).
            Si guarda una selección aquí, se convertirán en permisos individuales.
          </template>
        </p>

        <!-- Acciones rápidas -->
        <div class="quick-actions mb-3">
          <Button label="Marcar igual que empresa" icon="pi pi-copy" size="small"
                  class="p-button-outlined p-button-sm mr-2"
                  @click="copyFromEnterprise" />
          <Button label="Marcar todo" icon="pi pi-check-circle" size="small"
                  class="p-button-outlined p-button-sm mr-2"
                  @click="selectAll" />
          <Button label="Desmarcar todo" icon="pi pi-times-circle" size="small"
                  class="p-button-outlined p-button-sm p-button-danger mr-2"
                  @click="clearUserPermissions" />
          <Button label="Restaurar herencia (quitar permisos individuales)" icon="pi pi-refresh"
                  size="small" class="p-button-outlined p-button-sm p-button-warning"
                  v-tooltip="'Elimina los permisos individuales. El usuario vuelve a usar los de la empresa.'"
                  @click="resetToInheritance" />
        </div>

        <!-- Opciones Web -->
        <div class="platform-header">
          <i class="pi pi-desktop" /> Opciones Web
        </div>
        <div v-for="cat in webGroupedCatalog" :key="'uw-'+cat.category" class="cat-block">
          <div class="cat-label">
            <Checkbox v-model="selectedUserCategories" :value="cat.category"
                      :inputId="`cat-usr-${cat.category}`"
                      @change="toggleCategory(cat.category, 'user')" />
            <label :for="`cat-usr-${cat.category}`" class="cat-title cursor-pointer">{{ cat.category }}</label>
          </div>
          <div class="items-grid">
            <div v-for="item in cat.items" :key="item.key"
                 :class="['perm-item', { 'perm-inherited': !userHasIndividual && enterpriseKeys.includes(item.key) }]">
              <Checkbox v-model="userKeys" :value="item.key"
                        :inputId="`usr-${item.key}`"
                        @change="syncCategoryCheck(cat.category, 'user')" />
              <label :for="`usr-${item.key}`" class="cursor-pointer">
                <i :class="item.icon" class="mr-1 text-xs" /> {{ item.label }}
                <span v-if="!userHasIndividual && enterpriseKeys.includes(item.key)" class="inherited-badge">empresa</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Opciones App Móvil -->
        <div v-if="mobileGroupedCatalog.length" class="platform-header platform-header-mobile mt-3">
          <i class="pi pi-mobile" /> Opciones App Móvil
        </div>
        <div v-for="cat in mobileGroupedCatalog" :key="'um-'+cat.category" class="cat-block">
          <div class="cat-label">
            <Checkbox v-model="selectedUserCategories" :value="'mob_'+cat.category"
                      :inputId="`cat-usr-mob-${cat.category}`"
                      @change="toggleCategory(cat.category, 'user')" />
            <label :for="`cat-usr-mob-${cat.category}`" class="cat-title cursor-pointer">{{ cat.category }}</label>
          </div>
          <div class="items-grid">
            <div v-for="item in cat.items" :key="item.key"
                 :class="['perm-item', { 'perm-inherited': !userHasIndividual && enterpriseKeys.includes(item.key) }]">
              <Checkbox v-model="userKeys" :value="item.key"
                        :inputId="`usr-${item.key}`"
                        @change="syncCategoryCheck(cat.category, 'user')" />
              <label :for="`usr-${item.key}`" class="cursor-pointer">
                <i :class="item.icon" class="mr-1 text-xs" /> {{ item.label }}
                <span v-if="!userHasIndividual && enterpriseKeys.includes(item.key)" class="inherited-badge">empresa</span>
              </label>
            </div>
          </div>
        </div>

        <div class="save-bar">
          <Button label="Guardar permisos del usuario" icon="pi pi-save"
                  class="p-button-lg btn-save"
                  :loading="savingUser" @click="saveUserPermissions" />
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

const toast      = useToast();
const authStore  = useAuthStore();

// ── Catálogo agrupado por categoría ──────────────────────────────────────────
const loadingCatalog = ref(true);
const fullCatalog    = ref<any[]>([]);

function buildGroups(items: any[]) {
  const map = new Map<string, any[]>();
  for (const item of items) {
    if (!map.has(item.category)) map.set(item.category, []);
    map.get(item.category)!.push(item);
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}

// Solo ítems web (platform !== 'mobile')
const webGroupedCatalog = computed(() =>
  buildGroups(fullCatalog.value.filter(i => i.platform !== 'mobile'))
);
// Solo ítems móviles (platform !== 'web')
const mobileGroupedCatalog = computed(() =>
  buildGroups(fullCatalog.value.filter(i => i.platform !== 'web'))
);
// Todos los grupos combinados (para los helpers de categoría)
const groupedCatalog = computed(() => buildGroups(fullCatalog.value));

async function loadCatalog() {
  loadingCatalog.value = true;
  try {
    const { data } = await AuthserviceApi.getMenuCatalog() as any;
    fullCatalog.value = data as any[];
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el catálogo', life: 3000 });
  } finally {
    loadingCatalog.value = false;
  }
}

// ── Permisos de empresa ───────────────────────────────────────────────────────
const enterpriseKeys      = ref<string[]>([]);
const selectedCategories  = ref<string[]>([]); // para los checkboxes de categoría (empresa)
const savingEnterprise    = ref(false);

async function loadEnterprisePermissions() {
  try {
    const { data } = await AuthserviceApi.getEnterpriseMenuPermissions(authStore.enterpriseId!) as any;
    enterpriseKeys.value = data.enterprise_menu_permissions ?? [];
    syncAllCategoryChecks('enterprise');
  } catch { /* silencioso */ }
}

async function saveEnterprisePermissions() {
  savingEnterprise.value = true;
  try {
    await AuthserviceApi.setEnterpriseMenuPermissions(authStore.enterpriseId!, enterpriseKeys.value);
    toast.add({ severity: 'success', summary: 'Guardado', detail: 'Permisos de empresa actualizados. Los usuarios deben volver a iniciar sesión para ver los cambios.', life: 4000 });
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar', life: 3000 });
  } finally {
    savingEnterprise.value = false;
  }
}

// ── Lista de usuarios ─────────────────────────────────────────────────────────
const staffList   = ref<any[]>([]);
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
  const groups: any[] = [];
  if (staffList.value.length)   groups.push({ groupLabel: 'Colaboradores', items: staffList.value });
  if (driversList.value.length) groups.push({ groupLabel: 'Conductores con acceso móvil', items: driversList.value });
  return groups;
});

// ── Permisos por usuario ──────────────────────────────────────────────────────
const selectedUser          = ref<any>(null);
const userKeys              = ref<string[]>([]);
const userHasIndividual     = ref(false);   // true = tiene permisos propios guardados
const selectedUserCategories = ref<string[]>([]);
const savingUser            = ref(false);

async function onUserSelect() {
  if (!selectedUser.value) return;
  try {
    const { data } = await AuthserviceApi.getUserMenuPermissions(selectedUser.value._id) as any;
    const saved: string[] = data.menu_permissions ?? [];
    userHasIndividual.value = saved.length > 0;
    // Si tiene permisos individuales → mostrarlos
    // Si hereda de empresa → pre-marcar con los de empresa para que el admin
    //   pueda ver qué tiene el usuario y desmarcar lo que quiera revocar
    userKeys.value = saved.length > 0 ? [...saved] : [...enterpriseKeys.value];
    syncAllCategoryChecks('user');
  } catch {
    userKeys.value = [...enterpriseKeys.value];
    userHasIndividual.value = false;
    syncAllCategoryChecks('user');
  }
}

async function saveUserPermissions() {
  savingUser.value = true;
  try {
    await AuthserviceApi.setUserMenuPermissions(selectedUser.value._id, userKeys.value);
    userHasIndividual.value = userKeys.value.length > 0;
    toast.add({ severity: 'success', summary: 'Guardado', detail: 'Permisos del usuario actualizados. El usuario debe volver a iniciar sesión para ver los cambios.', life: 4000 });
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e?.response?.data?.message || 'No se pudo guardar', life: 3000 });
  } finally {
    savingUser.value = false;
  }
}

/** Elimina los permisos individuales (el usuario vuelve a heredar los de empresa) */
async function resetToInheritance() {
  savingUser.value = true;
  try {
    await AuthserviceApi.setUserMenuPermissions(selectedUser.value._id, []);
    userKeys.value = [...enterpriseKeys.value];
    userHasIndividual.value = false;
    syncAllCategoryChecks('user');
    toast.add({ severity: 'info', summary: 'Listo', detail: 'El usuario vuelve a heredar los permisos de la empresa.', life: 4000 });
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e?.response?.data?.message || 'No se pudo guardar', life: 3000 });
  } finally {
    savingUser.value = false;
  }
}

function copyFromEnterprise()  { userKeys.value = [...enterpriseKeys.value]; syncAllCategoryChecks('user'); }
function selectAll()           { userKeys.value = fullCatalog.value.map(i => i.key); syncAllCategoryChecks('user'); }
function clearUserPermissions(){ userKeys.value = []; syncAllCategoryChecks('user'); }

// ── Helpers de checkboxes por categoría ──────────────────────────────────────
function toggleCategory(category: string, target: 'enterprise' | 'user') {
  const keys   = target === 'enterprise' ? enterpriseKeys   : userKeys;
  const selCat = target === 'enterprise' ? selectedCategories : selectedUserCategories;
  const catItems = groupedCatalog.value.find(c => c.category === category)?.items ?? [];
  const catKeys  = catItems.map((i: any) => i.key);

  if (selCat.value.includes(category)) {
    // marcar toda la categoría
    for (const k of catKeys) {
      if (!keys.value.includes(k)) keys.value.push(k);
    }
  } else {
    // desmarcar toda la categoría
    keys.value = keys.value.filter(k => !catKeys.includes(k));
  }
}

function syncCategoryCheck(category: string, target: 'enterprise' | 'user') {
  const keys   = target === 'enterprise' ? enterpriseKeys   : userKeys;
  const selCat = target === 'enterprise' ? selectedCategories : selectedUserCategories;
  const catItems = groupedCatalog.value.find(c => c.category === category)?.items ?? [];
  const catKeys  = catItems.map((i: any) => i.key);
  const allChecked = catKeys.every(k => keys.value.includes(k));

  if (allChecked) {
    if (!selCat.value.includes(category)) selCat.value.push(category);
  } else {
    selCat.value = selCat.value.filter(c => c !== category);
  }
}

function syncAllCategoryChecks(target: 'enterprise' | 'user') {
  for (const cat of groupedCatalog.value) {
    syncCategoryCheck(cat.category, target);
  }
}

onMounted(async () => {
  await Promise.all([loadCatalog(), loadEnterprisePermissions(), loadStaff(), loadDriversWithAccess()]);
});
</script>

<style scoped>
.perms-wrap { display: grid; gap: 1.5rem; padding: 1rem; }

.pcard {
  background: #fff; border: 1px solid rgba(17,17,17,.07);
  border-radius: .75rem; padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(17,17,17,.05);
}
.pcard-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.pcard-title  { font-size: 1.15rem; font-weight: 700; margin: 0 0 .25rem; color: #111; }
.pcard-sub    { font-size: .85rem; color: #6b7280; margin: 0; }

.cat-block { margin-bottom: 1.25rem; }
.cat-label  { display: flex; align-items: center; gap: .5rem; margin-bottom: .5rem; }
.cat-title  { font-size: .8rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #374151; }
.items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap: .35rem .75rem; padding-left: 1.5rem; }
.perm-item  { display: flex; align-items: center; gap: .4rem; padding: .2rem 0; font-size: .87rem; color: #374151; }
.perm-inherited { opacity: .65; }
.inherited-badge {
  font-size: .65rem; font-weight: 700; background: #e0f2fe; color: #0369a1;
  border-radius: 4px; padding: 1px 5px; margin-left: 4px; vertical-align: middle;
}

.user-selector  { margin-bottom: 1.25rem; }
.field-wrap     { max-width: 420px; }
.field-label    { display: block; font-size: .85rem; font-weight: 600; margin-bottom: .35rem; }

.user-info-bar  { display: flex; align-items: center; gap: .75rem; margin-bottom: .5rem; }
.badge-individual { background: #dcfce7; color: #15803d; border-radius: 6px; font-size: .72rem; font-weight: 700; padding: 2px 8px; }
.badge-inherited  { background: #fef9c3; color: #92400e; border-radius: 6px; font-size: .72rem; font-weight: 700; padding: 2px 8px; }

.quick-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
.save-bar { display: flex; justify-content: flex-end; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #f3f4f6; }

:deep(.btn-save.p-button) { background: #1d4ed8; border-color: #1d4ed8; }
:deep(.btn-save.p-button:hover) { background: #1e40af; border-color: #1e40af; }

.platform-header {
  display: flex; align-items: center; gap: .4rem;
  font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .6px;
  color: #1d4ed8; padding: .4rem 0 .6rem;
  border-bottom: 2px solid #dbeafe; margin-bottom: .75rem;
}
.platform-header-mobile { color: #059669; border-bottom-color: #d1fae5; }
.mt-3 { margin-top: 1.25rem; }
</style>
