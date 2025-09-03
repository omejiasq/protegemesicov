<script setup lang="ts">
import { onMounted, ref, reactive, watch } from "vue";
import { useToast } from "primevue/usetoast";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import { useDriversStore } from "../stores/driversStore";
import DriverFormView from "../views/DriverFormView.vue";

function mapEstadoToParam(v: any): 'true' | 'false' | undefined {
  if (v === true || v === 'true' || v === 'Activos' || v === 'activos' || v === 1 || v === '1') return 'true';
  if (v === false || v === 'false' || v === 'Inactivos' || v === 'inactivos' || v === 0 || v === '0') return 'false';
  return undefined; // "Todos" u otro valor → no filtra
}

const drivers = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);

const toast = useToast();
const store = useDriversStore();
console.log(store.items);

const query = reactive({
  q: '',
  estado: null as boolean | string | null,
  page: 1,
  numero_items: 10,
});

const dtPage = ref(1);
const dtRows = ref(10);

const showForm = ref(false);
const editingId = ref<string | null>(null);

async function refresh() {
  loading.value = true;
  try {
    const params: any = {
      page: query.page,
      numero_items: query.numero_items,
    };

    if (query.q?.trim()) {
      // ⬇⬇⬇ ANTES: params.q = query.q.trim();
      params.numeroIdentificacion = query.q.trim();
    }

    const estadoParam = mapEstadoToParam(query.estado);
    if (estadoParam !== undefined) {
      params.estado = estadoParam; // 'true' | 'false'
    }

    const res = await store.list(params);
    drivers.value = res.items ?? [];
    total.value = res.total ?? 0;
  } finally {
    loading.value = false;
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

watch([dtPage, dtRows], refresh);
onMounted(refresh);

// helpers de presentación acorde a TU payload
const fullName = (d: any) => {
  return (
    [
      d?.primerNombrePrincipal,
      d?.segundoNombrePrincipal,
      d?.primerApellidoPrincipal,
      d?.segundoApellidoPrincipal,
    ]
      .filter(Boolean)
      .join(" ") || "—"
  );
};
const docNumber = (d: any) => d?.numeroIdentificacion || "—";
const licenseNum = (d: any) => d?.licenciaConduccion || "—";

function licenseExpiry(row: any) {
  const v = row.licenciaVencimiento;
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;

  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-AR");
}
</script>

<template>
  <div class="grid">
    <div class="col-12 page-toolbar">
      <h2 class="m-0">Gestión de Conductores</h2>
      <Button
        label="Nuevo Conductor"
        icon="pi pi-plus"
        class="p-button-success"
        @click="openCreate"
      />
    </div>

    <div class="col-12 page-section table-card">
      <!-- Filtros -->
      <div class="filters-bar">
        <div class="grid formgrid">
          <div class="col-12 md:col-5">
            <span class="p-input-icon-left w-full search-field">
              <i class="pi pi-search" />
              <InputText
                v-model="query.q"
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
                query.q = '';
                query.estado = null;
                dtPage = 1;
                refresh();
              "
            />
          </div>
        </div>
      </div>

      <!-- Tabla -->
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
        <!-- Documento: numeroIdentificacion -->
        <Column header="Documento" sortable>
          <template #body="{ data }">
            {{ docNumber(data) }}
          </template>
        </Column>

        <!-- Nombre: concat de nombres/apellidos principales -->
        <Column header="Nombre">
          <template #body="{ data }">
            {{ fullName(data) }}
          </template>
        </Column>

        <!-- Licencia: licenciaConduccion -->
        <Column header="Licencia">
          <template #body="{ data }">
            {{ licenseNum(data) }}
          </template>
        </Column>

        <!-- Vence: usamos fechaUltimoExamenMedico (no viene vencimiento de licencia) -->
        <Column header="Vence">
          <template #body="{ data }">
            {{ licenseExpiry(data) }}
          </template>
        </Column>

        <!-- Estado -->
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