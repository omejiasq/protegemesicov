<template>
  <div class="bolt-wrap">

    <div class="bolt-toolbar bolt-card">
      <div>
        <h2 class="title">Novedades de Terminal</h2>
        <p class="subtitle">Incidentes y novedades en terminales</p>
      </div>
      <div class="actions">
        <Button v-if="pendingCount > 0" label="Reintentar sync" icon="pi pi-sync"
                class="p-button-outlined p-button-warning" :loading="retrying" @click="onRetry" />
        <Button label="Nueva Novedad" icon="pi pi-plus" class="btn-dark-green" @click="openCreate" />
      </div>
    </div>

    <div v-if="pendingCount > 0" class="banner-warning">
      <i class="pi pi-exclamation-triangle"></i>
      <span><strong>{{ pendingCount }}</strong> novedad{{ pendingCount > 1 ? 'es' : '' }} pendiente{{ pendingCount > 1 ? 's' : '' }} de sincronización.</span>
    </div>

    <!-- FILTROS -->
    <div class="bolt-card p-3">
      <div class="grid gap-3 md:grid-cols-4">
        <div><label>Fecha desde</label>
          <input type="date" v-model="filters.fechaDesde" class="p-inputtext w-full" /></div>
        <div><label>Fecha hasta</label>
          <input type="date" v-model="filters.fechaHasta" class="p-inputtext w-full" /></div>
        <div><label>Estado sync</label>
          <select v-model="filters.sync_status" class="p-inputtext w-full">
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="synced">Sincronizado</option>
            <option value="partial">Parcial</option>
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
      <DataTable :value="store.novedades.items" :loading="store.novedades.loading"
                 dataKey="_id" responsiveLayout="scroll" class="p-datatable-sm">
        <Column field="id_despacho"      header="ID Despacho"   />
        <Column field="tipo_novedad_id"  header="Tipo Novedad"  />
        <Column field="descripcion"      header="Descripción"   />
        <Column header="Vehículo">
          <template #body="{ data }">{{ data.vehiculo?.placa ?? '—' }}</template>
        </Column>
        <Column header="Conductor">
          <template #body="{ data }">
            {{ data.conductor ? `${data.conductor.primerNombreConductor ?? ''} ${data.conductor.primerApellidoConductor ?? ''}`.trim() : '—' }}
          </template>
        </Column>
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
                    @click="store.toggleNovedad(data._id)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- MODAL: 3 pestañas -->
    <Dialog v-model:visible="showCreate" modal header="Nueva Novedad de Terminal"
            :style="{ width: '760px' }">
      <TabView>
        <!-- PESTAÑA 1: Novedad principal -->
        <TabPanel header="Novedad">
          <div class="grid gap-3">
            <div class="col-12 md:col-6">
              <label>ID Despacho *</label>
              <InputNumber v-model="form.id_despacho" class="w-full" :min="1" />
            </div>
            <div class="col-12 md:col-6">
              <label>Tipo Novedad ID *</label>
              <InputNumber v-model="form.tipo_novedad_id" class="w-full" :min="1" />
            </div>
            <div class="col-12">
              <label>Descripción</label>
              <Textarea v-model="form.descripcion" class="w-full" rows="3" />
            </div>
            <div class="col-12">
              <label>Otros</label>
              <Textarea v-model="form.otros" class="w-full" rows="2" />
            </div>
          </div>
        </TabPanel>

        <!-- PESTAÑA 2: Vehículo -->
        <TabPanel header="Vehículo">
          <div class="grid gap-3">
            <div class="col-12 md:col-6">
              <label>Placa <span class="hint-text">— presione Enter para cargar datos</span></label>
              <div class="p-inputgroup">
                <InputText
                  v-model="form.vehiculo.placa"
                  class="w-full"
                  maxlength="6"
                  placeholder="ABC123"
                  @input="onPlacaInput"
                  @keyup.enter="buscarVehiculoPorPlaca"
                />
                <Button
                  icon="pi pi-search"
                  class="p-button-outlined"
                  :loading="placaLoading"
                  @click="buscarVehiculoPorPlaca"
                  v-tooltip="'Buscar vehículo por placa'"
                />
              </div>
              <small :class="placaMsg.startsWith('✓') ? 'msg-ok' : 'msg-warn'">{{ placaMsg }}</small>
            </div>
            <div class="col-12 md:col-6"><label>Clase <span v-if="form.vehiculo.clase" class="field-auto-badge">auto</span></label>
              <InputText v-model="form.vehiculo.clase" class="w-full" /></div>
            <div class="col-12 md:col-6"><label>Nivel Servicio <span v-if="form.vehiculo.nivelServicio" class="field-auto-badge">auto</span></label>
              <InputText v-model="form.vehiculo.nivelServicio" class="w-full" /></div>
            <div class="col-12 md:col-6"><label>SOAT <span v-if="form.vehiculo.soat" class="field-auto-badge">auto</span></label>
              <InputText v-model="form.vehiculo.soat" class="w-full" /></div>
            <div class="col-12 md:col-6"><label>Vencimiento SOAT <span v-if="form.vehiculo.fechaVencimientoSoat" class="field-auto-badge">auto</span></label>
              <input type="date" v-model="form.vehiculo.fechaVencimientoSoat" class="p-inputtext w-full" /></div>
            <div class="col-12 md:col-6"><label>Revisión Técnico-Mecánica</label>
              <InputText v-model="form.vehiculo.revisionTecnicoMecanica" class="w-full" /></div>
            <div class="col-12 md:col-6"><label>Fecha RTM <span v-if="form.vehiculo.fechaRevisionTecnicoMecanica" class="field-auto-badge">auto</span></label>
              <input type="date" v-model="form.vehiculo.fechaRevisionTecnicoMecanica" class="p-inputtext w-full" /></div>
            <div class="col-12 md:col-6"><label>Tarjeta de Operación <span v-if="form.vehiculo.tarjetaOperacion" class="field-auto-badge">auto</span></label>
              <InputText v-model="form.vehiculo.tarjetaOperacion" class="w-full" /></div>
            <div class="col-12 md:col-6"><label>Fecha Tarjeta Op. <span v-if="form.vehiculo.fechaTarjetaOperacion" class="field-auto-badge">auto</span></label>
              <input type="date" v-model="form.vehiculo.fechaTarjetaOperacion" class="p-inputtext w-full" /></div>
            <div class="col-12"><label>Observaciones</label>
              <Textarea v-model="form.vehiculo.observaciones" class="w-full" rows="2" /></div>
          </div>
        </TabPanel>

        <!-- PESTAÑA 3: Conductor -->
        <TabPanel header="Conductor">
          <div class="grid gap-3">
            <div class="col-12 md:col-6">
              <label>N° Identificación <span class="hint-text">— escriba para buscar conductor</span></label>
              <AutoComplete
                v-model="conductorDocSearch"
                :suggestions="conductorSuggestions"
                placeholder="Digite la cédula o nombre..."
                class="w-full"
                input-class="w-full"
                @complete="onConductorDocSearch"
                @item-select="onConductorSelect"
              >
                <template #option="{ option }">
                  <span>{{ option }} — {{ conductorMap.get(option)?.nombre }} {{ conductorMap.get(option)?.apellido }}</span>
                </template>
              </AutoComplete>
            </div>
            <div class="col-12 md:col-6"><label>Tipo ID Conductor <span v-if="form.conductor.tipoIdentificacionConductor" class="field-auto-badge">auto</span></label>
              <InputNumber v-model="form.conductor.tipoIdentificacionConductor" class="w-full" /></div>
            <div class="col-12 md:col-4"><label>Primer Nombre <span v-if="form.conductor.primerNombreConductor" class="field-auto-badge">auto</span></label>
              <InputText v-model="form.conductor.primerNombreConductor" class="w-full" /></div>
            <div class="col-12 md:col-4"><label>Segundo Nombre</label>
              <InputText v-model="form.conductor.segundoNombreConductor" class="w-full" /></div>
            <div class="col-12 md:col-4"><label>Primer Apellido <span v-if="form.conductor.primerApellidoConductor" class="field-auto-badge">auto</span></label>
              <InputText v-model="form.conductor.primerApellidoConductor" class="w-full" /></div>
            <div class="col-12 md:col-4"><label>Segundo Apellido</label>
              <InputText v-model="form.conductor.segundoApellidoConductor" class="w-full" /></div>
            <div class="col-12 md:col-6"><label>Licencia de Conducción</label>
              <InputText v-model="form.conductor.licenciaConduccion" class="w-full" /></div>
            <div class="col-12 md:col-6"><label>ID Prueba Alcoholimetría</label>
              <InputNumber v-model="form.conductor.idPruebaAlcoholimetria" class="w-full" /></div>
            <div class="col-12 md:col-6"><label>Resultado Alcoholimetría</label>
              <InputText v-model="form.conductor.resultadoPruebaAlcoholimetria" class="w-full" /></div>
            <div class="col-12 md:col-6"><label>Fecha Última Prueba</label>
              <input type="date" v-model="form.conductor.fechaUltimaPruebaAlcoholimetria" class="p-inputtext w-full" /></div>
            <div class="col-12 md:col-6"><label>ID Examen Médico</label>
              <InputNumber v-model="form.conductor.idExamenMedico" class="w-full" /></div>
            <div class="col-12 md:col-6"><label>Fecha Último Examen</label>
              <input type="date" v-model="form.conductor.fechaUltimoExamenMedico" class="p-inputtext w-full" /></div>
            <div class="col-12"><label>Observaciones</label>
              <Textarea v-model="form.conductor.observaciones" class="w-full" rows="2" /></div>
          </div>
        </TabPanel>
      </TabView>

      <template #footer>
        <Button label="Cancelar" class="p-button-outlined" @click="showCreate = false" />
        <Button label="Registrar Novedad" class="btn-dark-green" :loading="store.saving" @click="onSave" />
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
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import AutoComplete from "primevue/autocomplete";
import { useTerminalesStore } from "../../stores/terminalesStore";
import { VehiclesserviceApi } from "../../api/vehicles.service";
import { AuthserviceApi } from "../../api/auth.service";

const store      = useTerminalesStore();
const showCreate = ref(false);
const retrying   = ref(false);
const filters    = ref({ fechaDesde: "", fechaHasta: "", sync_status: "" });

// ─── Estado autocomplete placa ────────────────────────────────────────────────
const placaLoading = ref(false);
const placaMsg     = ref("");

// ─── Autocomplete conductor ───────────────────────────────────────────────────
const conductorDocSearch   = ref("");
const conductorSuggestions = ref<string[]>([]);
const conductorMap = ref(new Map<string, { nombre: string; apellido: string; document_type: number | null }>());

const emptyVehiculo  = () => ({
  placa:"", clase:"", nivelServicio:"", soat:"",
  fechaVencimientoSoat:"", revisionTecnicoMecanica:"",
  fechaRevisionTecnicoMecanica:"", tarjetaOperacion:"",
  fechaTarjetaOperacion:"", observaciones:"",
});
const emptyConductor = () => ({
  tipoIdentificacionConductor: null as number | null,
  numeroIdentificacion:"", primerNombreConductor:"", segundoNombreConductor:"",
  primerApellidoConductor:"", segundoApellidoConductor:"",
  licenciaConduccion:"", idPruebaAlcoholimetria: null as number | null,
  resultadoPruebaAlcoholimetria:"", fechaUltimaPruebaAlcoholimetria:"",
  idExamenMedico: null as number | null, fechaUltimoExamenMedico:"", observaciones:"",
});
const emptyForm = () => ({
  id_despacho: null as number | null,
  tipo_novedad_id: null as number | null,
  descripcion:"", otros:"",
  vehiculo: emptyVehiculo(),
  conductor: emptyConductor(),
});
const form = ref(emptyForm());

const pendingCount = computed(() =>
  store.novedades.items.filter((x: any) => x.sync_status !== "synced").length,
);

function fmt(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleString("es-CO", { timeZone: "America/Bogota" });
}
function syncLabel(s: string) { return { pending:"Pendiente", synced:"Sincronizado", partial:"Parcial", failed:"Error" }[s] ?? s; }
function syncSeverity(s: string) { return { pending:"warning", synced:"success", partial:"info", failed:"danger" }[s] ?? "info"; }

function openCreate() {
  form.value = emptyForm();
  conductorDocSearch.value = "";
  placaMsg.value = "";
  showCreate.value = true;
}

// ─── Búsqueda de vehículo por placa ──────────────────────────────────────────
function onPlacaInput(e: Event) {
  const input = e.target as HTMLInputElement;
  form.value.vehiculo.placa = input.value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  placaMsg.value = "";
}

async function buscarVehiculoPorPlaca() {
  const placa = form.value.vehiculo.placa.trim().toUpperCase();
  if (!placa) return;
  form.value.vehiculo.placa = placa;
  placaLoading.value = true;
  placaMsg.value = "";
  try {
    const { data } = await VehiclesserviceApi.getByPlate(placa) as any;
    const v = data?.vehicle ?? data;

    form.value.vehiculo.clase          = v?.clase ?? "";
    form.value.vehiculo.nivelServicio  = v?.nivelServicio != null ? String(v.nivelServicio) : "";
    form.value.vehiculo.soat           = v?.no_soat ?? "";
    form.value.vehiculo.tarjetaOperacion = v?.no_tarjeta_opera ?? "";

    const toDate = (d: any) => d ? new Date(d).toISOString().slice(0, 10) : "";
    form.value.vehiculo.fechaVencimientoSoat          = toDate(v?.expiration_soat);
    form.value.vehiculo.fechaTarjetaOperacion         = toDate(v?.expiration_tarjeta_opera);
    form.value.vehiculo.fechaRevisionTecnicoMecanica  = toDate(v?.expiration_rtm);

    // Pre-llenar conductor si el vehículo tiene uno asignado
    const drv = v?.driver?.usuario ?? v?.driver;
    if (drv) {
      form.value.conductor.tipoIdentificacionConductor = drv.document_type ?? null;
      form.value.conductor.numeroIdentificacion        = drv.documentNumber ?? "";
      form.value.conductor.primerNombreConductor       = drv.nombre ?? "";
      form.value.conductor.primerApellidoConductor     = drv.apellido ?? "";
      conductorDocSearch.value = drv.documentNumber ?? "";
    }

    placaMsg.value = v ? "✓ Vehículo encontrado" : "";
  } catch {
    form.value.vehiculo = { ...emptyVehiculo(), placa };
    placaMsg.value = "⚠ Placa no encontrada en el sistema";
  } finally {
    placaLoading.value = false;
  }
}

// ─── Autocomplete conductor ───────────────────────────────────────────────────
async function onConductorDocSearch(event: { query: string }) {
  const q = event.query?.trim();
  if (!q || q.length < 2) { conductorSuggestions.value = []; return; }
  try {
    const { data } = await AuthserviceApi.searchDrivers(q) as any;
    conductorMap.value.clear();
    conductorSuggestions.value = (data?.data ?? []).map((d: any) => {
      const docNum: string = d.usuario?.documentNumber ?? "";
      conductorMap.value.set(docNum, {
        nombre:        d.usuario?.nombre   ?? "",
        apellido:      d.usuario?.apellido ?? "",
        document_type: d.usuario?.document_type ?? null,
      });
      return docNum;
    });
  } catch {
    conductorSuggestions.value = [];
  }
}

function onConductorSelect(event: { value: string }) {
  const docNum = event.value;
  const drv = conductorMap.value.get(docNum);
  form.value.conductor.numeroIdentificacion = docNum;
  if (drv) {
    form.value.conductor.tipoIdentificacionConductor = drv.document_type;
    form.value.conductor.primerNombreConductor       = drv.nombre;
    form.value.conductor.primerApellidoConductor     = drv.apellido;
  }
}

// ─── Carga y guardado ────────────────────────────────────────────────────────
function cleanObj(o: any) {
  const r: any = {};
  for (const k of Object.keys(o)) {
    if (o[k] !== null && o[k] !== undefined && o[k] !== "") r[k] = o[k];
  }
  return r;
}

async function load() {
  const p: any = {};
  if (filters.value.fechaDesde) p.fechaDesde = filters.value.fechaDesde;
  if (filters.value.fechaHasta) p.fechaHasta = filters.value.fechaHasta;
  if (filters.value.sync_status) p.sync_status = filters.value.sync_status;
  await store.fetchNovedades(p);
}

function onClear() { filters.value = { fechaDesde:"", fechaHasta:"", sync_status:"" }; load(); }

async function onSave() {
  const payload: any = {
    id_despacho:     form.value.id_despacho,
    tipo_novedad_id: form.value.tipo_novedad_id,
    descripcion:     form.value.descripcion,
    otros:           form.value.otros,
    vehiculo:  cleanObj(form.value.vehiculo),
    conductor: cleanObj(form.value.conductor),
  };
  if (!Object.keys(payload.vehiculo).length)  delete payload.vehiculo;
  if (!Object.keys(payload.conductor).length) delete payload.conductor;

  await store.createNovedad(payload);
  showCreate.value = false;
  await load();
}

async function onRetry() {
  retrying.value = true;
  await store.retryNovedades().catch(() => {});
  retrying.value = false;
  await load();
}

onMounted(load);
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
.hint-text { font-size: 0.75rem; font-weight: 400; color: #9ca3af; }
.msg-ok   { font-size: 0.78rem; color: #16a34a; margin-top: 2px; display: block; }
.msg-warn { font-size: 0.78rem; color: #d97706; margin-top: 2px; display: block; }
:deep(.p-autocomplete-input) { width: 100%; }
</style>
