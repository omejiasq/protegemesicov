<template>
  <div class="bolt-wrap">

    <!-- TOOLBAR -->
    <div class="bolt-toolbar bolt-card">
      <div>
        <h2 class="title">Salidas de Terminal</h2>
        <p class="subtitle">Registro de despachos desde terminal</p>
      </div>
      <div class="actions">
        <Button
          v-if="pendingCount > 0"
          label="Reintentar sync"
          icon="pi pi-sync"
          class="p-button-outlined p-button-warning"
          :loading="retrying"
          @click="onRetry"
        />
        <Button label="Nueva Salida" icon="pi pi-plus" class="btn-dark-green" @click="openCreate" />
      </div>
    </div>

    <!-- BANNER PENDIENTES -->
    <div v-if="pendingCount > 0" class="banner-warning">
      <i class="pi pi-exclamation-triangle"></i>
      <span>
        <strong>{{ pendingCount }}</strong> salida{{ pendingCount > 1 ? 's' : '' }} pendiente{{ pendingCount > 1 ? 's' : '' }} de envío a Supertransporte.
      </span>
    </div>

    <!-- FILTROS -->
    <div class="bolt-card p-3">
      <div class="grid gap-3 md:grid-cols-4">
        <div>
          <label>Fecha desde</label>
          <input type="date" v-model="filters.fechaDesde" class="p-inputtext w-full" />
        </div>
        <div>
          <label>Fecha hasta</label>
          <input type="date" v-model="filters.fechaHasta" class="p-inputtext w-full" />
        </div>
        <div>
          <label>Estado sync</label>
          <select v-model="filters.sync_status" class="p-inputtext w-full">
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="synced">Sincronizado</option>
            <option value="failed">Error</option>
          </select>
        </div>
        <div class="flex gap-2 items-end">
          <button class="p-button p-button-primary" @click="load">Filtrar</button>
          <button class="p-button p-button-secondary" @click="onClear">Limpiar</button>
        </div>
      </div>
    </div>

    <!-- TABLA -->
    <div class="bolt-card p-3">
      <DataTable :value="store.salidas.items" :loading="store.salidas.loading"
                 dataKey="_id" responsiveLayout="scroll"
                 class="p-datatable-sm">
        <Column field="idDespachoTerminal"  header="ID Despacho"   />
        <Column field="terminalDespacho"    header="Terminal"      />
        <Column field="nitEmpresaTransporte" header="NIT Empresa"  />
        <Column field="numeroPasajero"      header="Pasajeros"     />
        <Column header="Fecha">
          <template #body="{ data }">{{ fmt(data.createdAt) }}</template>
        </Column>
        <Column header="Sync">
          <template #body="{ data }">
            <Tag :value="syncLabel(data.sync_status)" :severity="syncSeverity(data.sync_status)" style="font-size:0.7rem" />
          </template>
        </Column>
        <Column header="Estado">
          <template #body="{ data }">
            <Tag :value="data.estado ? 'ACTIVO' : 'INACTIVO'" :severity="data.estado ? 'success' : 'danger'" />
          </template>
        </Column>
        <Column header="Acciones">
          <template #body="{ data }">
            <Button icon="pi pi-power-off" class="p-button-text p-button-sm"
                    v-tooltip="data.estado ? 'Desactivar' : 'Activar'"
                    @click="store.toggleSalida(data._id)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- MODAL NUEVA SALIDA -->
    <Dialog v-model:visible="showCreate" modal header="Nueva Salida de Terminal"
            :style="{ width: '600px' }">
      <div class="grid gap-3">
        <div class="col-12 md:col-6">
          <label>ID Despacho Terminal *</label>
          <InputText v-model="form.idDespachoTerminal" class="w-full" />
        </div>
        <div class="col-12 md:col-6">
          <label>Terminal de Despacho *</label>
          <InputText v-model="form.terminalDespacho" class="w-full" />
        </div>
        <div class="col-12 md:col-6">
          <label>NIT Empresa Transporte *
            <span v-if="enterpriseNit" class="field-auto-badge">auto</span>
          </label>
          <InputText v-model="form.nitEmpresaTransporte" class="w-full" disabled />
        </div>
        <div class="col-12 md:col-6">
          <label>Razón Social
            <span v-if="enterpriseName" class="field-auto-badge">auto</span>
          </label>
          <InputText v-model="form.razonSocial" class="w-full" disabled />
        </div>
        <div class="col-12 md:col-6">
          <label>N° Pasajeros</label>
          <InputNumber v-model="form.numeroPasajero" class="w-full" :min="0" />
        </div>
        <div class="col-12 md:col-6">
          <label>Valor Tiquete</label>
          <InputNumber v-model="form.valorTiquete" class="w-full" mode="currency" currency="COP" locale="es-CO" />
        </div>
        <div class="col-12 md:col-6">
          <label>Valor Total Tasa Uso</label>
          <InputNumber v-model="form.valorTotalTasaUso" class="w-full" mode="currency" currency="COP" locale="es-CO" />
        </div>
        <div class="col-12">
          <label>Observaciones</label>
          <Textarea v-model="form.observaciones" class="w-full" rows="2" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" class="p-button-outlined" @click="showCreate = false" />
        <Button label="Guardar" class="btn-dark-green" :loading="store.saving" @click="onSave" />
      </template>
    </Dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Textarea from "primevue/textarea";
import Tag from "primevue/tag";
import { useTerminalesStore } from "../../stores/terminalesStore";
import { useAuthStore } from "../../stores/authStore";
import { AuthserviceApi } from "../../api/auth.service";

const store      = useTerminalesStore();
const authStore  = useAuthStore();
const showCreate = ref(false);
const retrying   = ref(false);

const filters = ref({ fechaDesde: "", fechaHasta: "", sync_status: "" });

// Datos de la empresa en sesión — se cargan al montar
const enterpriseNit  = ref("");
const enterpriseName = ref("");

const emptyForm = () => ({
  idDespachoTerminal: "", terminalDespacho: "",
  nitEmpresaTransporte: enterpriseNit.value,
  razonSocial: enterpriseName.value,
  numeroPasajero: null as number | null,
  valorTiquete: null as number | null, valorTotalTasaUso: null as number | null,
  observaciones: "",
});
const form = ref(emptyForm());

const pendingCount = computed(() =>
  store.salidas.items.filter((x: any) => x.sync_status !== "synced").length,
);

function fmt(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleString("es-CO", { timeZone: "America/Bogota" });
}

function syncLabel(s: string) {
  return { pending: "Pendiente", synced: "Sincronizado", failed: "Error" }[s] ?? s;
}
function syncSeverity(s: string) {
  return { pending: "warning", synced: "success", failed: "danger" }[s] ?? "info";
}

function openCreate() {
  form.value = emptyForm();
  // emptyForm usa las refs que ya están cargadas en este momento
  form.value.nitEmpresaTransporte = enterpriseNit.value;
  form.value.razonSocial          = enterpriseName.value;
  showCreate.value = true;
}

async function load() {
  const p: any = {};
  if (filters.value.fechaDesde) p.fechaDesde = filters.value.fechaDesde;
  if (filters.value.fechaHasta) p.fechaHasta = filters.value.fechaHasta;
  if (filters.value.sync_status) p.sync_status = filters.value.sync_status;
  await store.fetchSalidas(p);
}

function onClear() {
  filters.value = { fechaDesde: "", fechaHasta: "", sync_status: "" };
  load();
}

async function onSave() {
  const payload: any = { ...form.value };
  // Limpiar nulos
  Object.keys(payload).forEach((k) => { if (payload[k] === null || payload[k] === "") delete payload[k]; });
  await store.createSalida(payload);
  showCreate.value = false;
  form.value = emptyForm();
  form.value.nitEmpresaTransporte = enterpriseNit.value;
  form.value.razonSocial          = enterpriseName.value;
  await load();
}

async function onRetry() {
  retrying.value = true;
  await store.retrySalidas().catch(() => {});
  retrying.value = false;
  await load();
}

async function loadEnterprise() {
  const id = authStore.enterpriseId;
  if (!id) return;
  try {
    const { data } = await AuthserviceApi.getEnterprise(id) as any;
    // La respuesta puede venir directa o anidada en data.data
    const ent = data?.data ?? data;
    enterpriseNit.value  = ent?.document_number ?? "";
    enterpriseName.value = ent?.name ?? "";
    // Actualizar el formulario ahora que ya tenemos los datos
    form.value.nitEmpresaTransporte = enterpriseNit.value;
    form.value.razonSocial          = enterpriseName.value;
  } catch { /* silencioso */ }
}

onMounted(async () => {
  await loadEnterprise();
  await load();
});
</script>

<style scoped>
.bolt-wrap { display: grid; gap: 1rem; }
.bolt-card { background: #fff; border: 1px solid rgba(17,17,17,.06); border-radius: .75rem; box-shadow: 0 2px 8px rgba(17,17,17,.05); }
.bolt-toolbar { display: flex; align-items: center; justify-content: space-between; padding: .75rem 1rem; }
.bolt-toolbar .title { margin: 0; font-weight: 700; }
.bolt-toolbar .subtitle { margin: .125rem 0 0; color: #6b7280; font-size: .9rem; }
.actions { display: flex; gap: .75rem; align-items: center; }
.banner-warning { background: #fff3cd; border: 1px solid #ffc107; color: #856404; border-radius: .5rem; padding: .75rem 1rem; display: flex; align-items: center; gap: .75rem; }
:deep(.p-button.btn-dark-green) { background: #16a34a; border-color: #16a34a; color: #fff; }
:deep(.p-button.btn-dark-green:hover) { background: #15803d; border-color: #15803d; }
.field-auto-badge { background: #dcfce7; color: #15803d; border-radius: 4px; font-size: 0.65rem; font-weight: 700; padding: 1px 5px; margin-left: 4px; vertical-align: middle; }
</style>
