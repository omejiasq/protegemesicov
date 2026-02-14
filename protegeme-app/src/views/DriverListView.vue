<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useToast } from "primevue/usetoast";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import { useDriversStore } from "../stores/driversStore";
import DriverFormView from "../views/DriverFormView.vue";

const toast = useToast();
const store = useDriversStore();

import { useRouter } from 'vue-router'

const router = useRouter()

const goToCreateDriver = () => {
  router.push({ name: 'drivercreate' })
}


const showForm = ref(false);
const editingId = ref<string | null>(null);

async function refresh() {
  try {
    await store.fetch(); // ✅ método real del store
  } catch (e: any) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: e?.response?.data?.message || "No se pudo cargar conductores",
      life: 3500,
    });
  }
}



function openCreate() {
  editingId.value = null;
  showForm.value = true;
}

function openEdit(row: any) {
  editingId.value = row?._id || null;
  showForm.value = true;
}

onMounted(refresh);

// helpers de presentación (acorde a tu payload)
const fullName = (d: any) =>
  [
    d?.usuario?.nombre,
    d?.usuario?.apellido,
  ]
    .filter(Boolean)
    .join(" ") || "—";

const docNumber = (d: any) => d?.usuario?.documentNumber || "—";
</script>

<template>
  <div class="grid">
    <div class="col-12 page-toolbar">
      <h2 class="m-0">Gestión de Conductores</h2>
      <Button
        label="Nuevo Conductor"
        icon="pi pi-plus"
        class="p-button-success"
        @click="goToCreateDriver"
      />
    </div>

    <div class="col-12 page-section table-card">
      <DataTable
        :value="store.items"
        :loading="store.loading"
        dataKey="_id"
        paginator
        :rows="10"
        responsiveLayout="scroll"
        class="dt-clean"
      >
        <Column header="Documento">
          <template #body="{ data }">
            {{ docNumber(data) }}
          </template>
        </Column>

        <Column header="Nombre">
          <template #body="{ data }">
            {{ fullName(data) }}
          </template>
        </Column>

        <Column header="Estado">
          <template #body="{ data }">
            <Tag
              :value="data?.active ? 'ACTIVO' : 'INACTIVO'"
              :severity="data?.active ? 'success' : 'danger'"
            />
          </template>
        </Column>


      </DataTable>
    </div>
  </div>

  <Dialog
    v-model:visible="showForm"
    modal
    :header="editingId ? 'Editar Conductor' : 'Nuevo Conductor'"
    style="width: 640px"
  >
    <DriverFormView
      :id="editingId"
      @saved="
        showForm = false;
        refresh();
      "
      @cancel="showForm = false"
    />
  </Dialog>
</template>
