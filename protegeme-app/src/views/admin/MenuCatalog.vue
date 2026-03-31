<template>
  <div class="p-4">
    <div class="flex align-items-center justify-content-between mb-4">
      <h2 class="text-xl font-bold m-0">Catálogo Global de Opciones de Menú</h2>
      <Button label="Nueva opción" icon="pi pi-plus" class="p-button-sm" @click="openCreate" />
    </div>

    <p class="text-sm text-color-secondary mb-3">
      Desde aquí el superadmin puede agregar, editar o deshabilitar globalmente opciones de menú
      para todas las empresas. Las opciones deshabilitadas no pueden ser asignadas a ninguna empresa.
    </p>

    <DataTable
      :value="items"
      :loading="loading"
      responsive-layout="scroll"
      class="p-datatable-sm"
    >
      <Column field="label" header="Etiqueta" sortable />
      <Column field="key" header="Clave" sortable />
      <Column field="platform" header="Plataforma" sortable />
      <Column field="category" header="Categoría" sortable />
      <Column field="route" header="Ruta" />
      <Column field="order" header="Orden" sortable style="width:80px" />
      <Column header="Estado" style="width:90px">
        <template #body="{ data }">
          <Tag
            :value="data.enabled ? 'Activo' : 'Inactivo'"
            :severity="data.enabled ? 'success' : 'danger'"
          />
        </template>
      </Column>
      <Column header="Acciones" style="width:110px">
        <template #body="{ data }">
          <Button
            icon="pi pi-pencil"
            class="p-button-text p-button-sm"
            @click="openEdit(data)"
          />
          <Button
            :icon="data.enabled ? 'pi pi-eye-slash' : 'pi pi-eye'"
            :class="['p-button-text p-button-sm', data.enabled ? 'p-button-warning' : 'p-button-success']"
            @click="toggleItem(data)"
          />
        </template>
      </Column>
    </DataTable>

    <!-- Dialog crear/editar -->
    <Dialog
      v-model:visible="dlg.visible"
      modal
      :header="dlg.isEdit ? 'Editar opción' : 'Nueva opción de menú'"
      style="width: 500px"
    >
      <div class="grid">
        <div class="col-12">
          <label class="block mb-1">Clave única <span class="text-red-500">*</span></label>
          <InputText v-model="form.key" class="w-full" :disabled="dlg.isEdit" placeholder="ej: web_enlistment" />
        </div>
        <div class="col-12">
          <label class="block mb-1">Etiqueta <span class="text-red-500">*</span></label>
          <InputText v-model="form.label" class="w-full" placeholder="ej: Alistamientos" />
        </div>
        <div class="col-6">
          <label class="block mb-1">Plataforma</label>
          <Dropdown
            v-model="form.platform"
            :options="['web', 'mobile', 'both']"
            class="w-full"
          />
        </div>
        <div class="col-6">
          <label class="block mb-1">Categoría</label>
          <InputText v-model="form.category" class="w-full" placeholder="MANTENIMIENTOS" />
        </div>
        <div class="col-8">
          <label class="block mb-1">Ruta frontend</label>
          <InputText v-model="form.route" class="w-full" placeholder="/maintenance/enlistment" />
        </div>
        <div class="col-4">
          <label class="block mb-1">Orden</label>
          <InputNumber v-model="form.order" class="w-full" :min="1" :max="99" />
        </div>
        <div class="col-12">
          <label class="block mb-1">Ícono (PrimeIcons)</label>
          <InputText v-model="form.icon" class="w-full" placeholder="pi pi-list-check" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" class="p-button-text" @click="dlg.visible = false" />
        <Button
          :label="dlg.isEdit ? 'Actualizar' : 'Crear'"
          icon="pi pi-save"
          :loading="saving"
          @click="save"
        />
      </template>
    </Dialog>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Dropdown from 'primevue/dropdown';
import Toast from 'primevue/toast';
import Button from '../../components/ui/Button.vue';
import { useToast } from 'primevue/usetoast';
import { AuthserviceApi } from '../../api/auth.service';

const toast = useToast();
const loading = ref(false);
const saving = ref(false);
const items = ref<any[]>([]);

async function load() {
  loading.value = true;
  try {
    const { data } = await AuthserviceApi.getMenuCatalog() as any;
    items.value = data as any[];
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el catálogo', life: 3000 });
  } finally {
    loading.value = false;
  }
}

const dlg = reactive({ visible: false, isEdit: false, editId: '' });
const form = reactive({
  key: '', label: '', platform: 'web', category: 'GESTIÓN',
  route: '', icon: 'pi pi-circle', order: 99,
});

function resetForm() {
  Object.assign(form, { key: '', label: '', platform: 'web', category: 'GESTIÓN', route: '', icon: 'pi pi-circle', order: 99 });
}

function openCreate() {
  resetForm();
  dlg.isEdit = false;
  dlg.editId = '';
  dlg.visible = true;
}

function openEdit(item: any) {
  Object.assign(form, {
    key: item.key, label: item.label, platform: item.platform,
    category: item.category, route: item.route, icon: item.icon, order: item.order,
  });
  dlg.isEdit = true;
  dlg.editId = item._id;
  dlg.visible = true;
}

async function save() {
  if (!form.key.trim() || !form.label.trim()) {
    toast.add({ severity: 'warn', summary: 'Validación', detail: 'Clave y etiqueta son obligatorias', life: 3000 });
    return;
  }
  saving.value = true;
  try {
    if (dlg.isEdit) {
      await AuthserviceApi.updateMenuCatalogItem(dlg.editId, form);
    } else {
      await AuthserviceApi.createMenuCatalogItem(form);
    }
    toast.add({ severity: 'success', summary: 'Guardado', detail: 'Ítem guardado', life: 3000 });
    dlg.visible = false;
    await load();
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Error', detail: e?.response?.data?.message ?? 'Error al guardar', life: 3000 });
  } finally {
    saving.value = false;
  }
}

async function toggleItem(item: any) {
  try {
    await AuthserviceApi.updateMenuCatalogItem(item._id, { enabled: !item.enabled });
    await load();
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cambiar el estado', life: 3000 });
  }
}

onMounted(load);
</script>
