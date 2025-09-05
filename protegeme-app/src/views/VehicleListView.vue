<script setup lang="ts">
import { onMounted, ref, reactive, watch } from "vue";
import { useToast } from "primevue/usetoast";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Button from "primevue/button";
import Tag from "primevue/tag";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
import Dialog from "primevue/dialog";
import { useVehiclesStore } from "../stores/vehiclesStore";
import VehicleFormView from "../views/VehicleFormView.vue";

const toast = useToast();
const store = useVehiclesStore();

console.log(store.items);

const query = reactive({
  placa: "",
  estado: null as null | boolean,
});
const dtPage = ref(1);
const dtRows = ref(10);

const showForm = ref(false);
const editingId = ref<string | null>(null);

function refresh() {
  store.fetch({
    page: dtPage.value,
    numero_items: dtRows.value,
    placa: query.placa || undefined,
    estado: query.estado ?? undefined,
  });
}

function openCreate() {
  editingId.value = null;
  showForm.value = true;
}
function openEdit(row: any) {
  editingId.value = row?._id || null;
  showForm.value = true;
}

async function toggle(id: string) {
  try {
    await store.toggle(id);
    toast.add({
      severity: "success",
      summary: "Actualizado",
      detail: "Estado actualizado",
      life: 2500,
    });
  } catch (e: any) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: e?.response?.data?.message || "No se pudo actualizar",
      life: 3500,
    });
  }
}

// watchers
watch([dtPage, dtRows], refresh);
onMounted(refresh);
</script>

<template>
  <div class="grid">
    <div class="col-12 page-toolbar">
      <h2 class="m-0">Gestión de Vehículos</h2>
      <Button
        label="Nuevo Vehículo"
        icon="pi pi-plus"
        class="p-button-success"
        @click="openCreate"
      />
    </div>

    <div class="col-12 page-section table-card">
      <!-- Barra de filtros clara -->
      <div class="filters-bar">
        <div class="grid formgrid">
          <div class="col-12 md:col-5">
            <span class="p-input-icon-left w-full search-field">
              <i class="pi pi-search" />
              <InputText
                v-model="query.placa"
                placeholder="Buscar por documento o nombre…"
                class="w-full"
                @keydown.enter="refresh"
              />
            </span>
          </div>
          <div class="col-12 md:col-3">
            <Dropdown
              class="w-full"
              :options="[
                { label: 'Todos los estados', value: null },
                { label: 'Activos', value: true },
                { label: 'Inactivos', value: false },
              ]"
              optionLabel="label"
              optionValue="value"
              v-model="query.estado"
              placeholder="Estado"
              @change="refresh"
            />
          </div>
          <div class="col-6 md:col-2">
            <Button
              label="Filtrar"
              icon="pi pi-filter"
              class="w-full"
              @click="refresh"
            />
          </div>
          <div class="col-6 md:col-2">
            <Button
              label="Limpiar"
              icon="pi pi-times"
              class="w-full p-button-secondary"
              @click="
                query.placa = '';
                query.estado = null;
                dtPage = 1;
                refresh();
              "
            />
          </div>
        </div>
      </div>

      <!-- Tabla limpia -->
      <DataTable
        :value="store.items"
        :loading="store.loading"
        dataKey="_id"
        paginator
        :rows="dtRows"
        :first="(dtPage - 1) * dtRows"
        :totalRecords="store.total"
        @page="
          (e) => {
            dtPage = Math.floor(e.first / e.rows) + 1;
            dtRows = e.rows;
          }
        "
        class="dt-clean"
        responsiveLayout="scroll"
        removableSort
      >
        <Column field="placa" header="Placa" sortable />
        <Column field="clase" header="Clase" />
        <Column field="nivelServicio" header="Nivel de Servicio" />
        <Column header="Vencimientos">
          <template #body="{ data }">
            <div class="flex gap-2 flex-wrap">
              <Tag
                :value="
                  data?.soat?.fechaVencimiento
                    ? `SOAT: ${data.soat.fechaVencimiento}`
                    : 'SOAT — s/d'
                "
                severity="info"
              />
              <Tag
                :value="
                  data?.rtm?.fechaVencimiento
                    ? `RTM: ${data.rtm.fechaVencimiento}`
                    : 'RTM — s/d'
                "
                severity="help"
              />
              <Tag
                :value="
                  data?.to?.fechaVencimiento
                    ? `TO: ${data.to.fechaVencimiento}`
                    : 'TO — s/d'
                "
                severity="warning"
              />
            </div>
          </template>
        </Column>
        <Column header="Estado">
          <template #body="{ data }">
            <Tag
              :value="data?.estado ? 'ACTIVO' : 'INACTIVO'"
              :severity="data?.estado ? 'success' : 'danger'"
            />
          </template>
        </Column>
        <Column header="Acciones" style="width: 160px">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button
                icon="pi pi-pencil"
                severity="secondary"
                text
                @click="openEdit(data)"
              />
              <Button
                :icon="data?.estado ? 'pi pi-ban' : 'pi pi-check'"
                :severity="data?.estado ? 'danger' : 'success'"
                text
                @click="toggle(data._id)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>

  <!-- Dialog de alta/edición -->
  <Dialog
    v-model:visible="showForm"
    modal
    :header="editingId ? 'Editar Vehículo' : 'Nuevo Vehículo'"
    style="width: 650px"
  >
    <VehicleFormView
      :id="editingId"
      @saved="
        showForm = false;
        refresh();
      "
      @cancel="showForm = false"
    />
  </Dialog>
</template>
<style scoped>
.search-field:deep(.p-inputtext) {
  width: 100%;
  padding-left: 2.25rem; /* espacio para la lupa a la izquierda */
}
.search-field {
  position: relative;      /* asegura posicionamiento del icono */
  display: block;          /* que respete width:100% */
}
.search-field > i {
  position: absolute;      /* coloca la lupa DENTRO del input */
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}
</style>