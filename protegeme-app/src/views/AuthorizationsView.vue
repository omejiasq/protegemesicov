<template>
  <div class="bolt-wrap">
    <!-- Header -->
    <div class="bolt-toolbar bolt-card p-3">
      <h2 class="title">Autorizaciones</h2>
      <Button
        label="Nueva autorización"
        icon="pi pi-plus"
        class="btn-dark-green"
        @click="openCreate"
      />
    </div>

    <!-- Filtros -->
    <div class="bolt-card p-3">
      <div class="grid">
        <div class="flex items-center gap-2 mb-3">
          <SearchBar
            v-model="filters.placa"
            :width="'420px'"
            placeholder="Buscar por placa (ej: ABC123)"
            @search="onSearch"
            @clear="onClear"
          />
        </div>
        <div
          class="field md:col-2 flex align-items-end justify-content-end gap-2"
        >
          <Button
            label="Buscar"
            icon="pi pi-search"
            class="btn-filter"
            :loading="listLoading"
            @click="onSearch"
          />
          <Button
            label="Limpiar"
            icon="pi pi-times"
            class="btn-filter"
            :disabled="listLoading"
            @click="onClear"
          />
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="bolt-card p-3">
      <DataTable
        :value="pageItems"
        :loading="list.loading"
        :paginator="true"
        :lazy="true"
        :rows="list.limit"
        :totalRecords="list.total"
        :first="table.first"
        @page="onPage"
        @update:rows="onRowsChange"
      >
        <Column
          field="idDespacho"
          header="ID Despacho"
          style="min-width: 140px"
        />
        <Column header="Placa" style="min-width: 120px">
          <template #body="{ data }">
            <span class="text-900">{{
              data?.placa || data?.autorizacion?.[0]?.placa || "—"
            }}</span>
          </template>
        </Column>
        <Column header="Fecha viaje" style="min-width: 140px">
          <template #body="{ data }">
            <span class="text-900">{{
              data?.autorizacion?.[0]?.fechaViaje || "—"
            }}</span>
          </template>
        </Column>
        <Column header="Origen/Destino" style="min-width: 220px">
          <template #body="{ data }">
            <span class="text-900">
              {{ data?.autorizacion?.[0]?.origen || "—" }} →
              {{ data?.autorizacion?.[0]?.destino || "—" }}
            </span>
          </template>
        </Column>
        <Column header="Nombre" style="min-width: 200px">
          <template #body="{ data }">
            <span class="text-900">{{
              data?.autorizacion?.[0]?.nombresApellidosNna || "—"
            }}</span>
          </template>
        </Column>
        <Column header="Estado" style="width: 130px">
          <template #body="{ data }">
            <Tag
              :severity="data?.estado ? 'success' : 'danger'"
              :value="data?.estado ? 'ACTIVO' : 'INACTIVO'"
            />
          </template>
        </Column>

        <!-- Acciones -->
        <Column header="Acciones" style="width: 160px">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button
                icon="pi pi-pencil"
                class="btn-icon-white statebutton"
                @click="openEdit(data)"
              />
              <Button
                :icon="data?.estado ? 'pi pi-ban' : 'pi pi-check'"
                class="btn-icon-white"
                @click="toggle(data._id)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Diálogo Crear/Editar -->
    <Dialog
      v-model:visible="dlg.visible"
      modal
      :header="isEditing ? 'Editar autorización' : 'Nueva autorización'"
      :style="{ width: '980px' }"
    >
      <div class="detail-pane">
        <div class="grid">
          <!-- Datos base -->
          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900">ID Despacho *</label>
            <InputText
              v-model="form.idDespacho"
              class="w-full pv-light"
              placeholder="12345"
              inputmode="numeric"
            />
          </div>
          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900">Placa</label>
            <InputText
              v-model="form.placa"
              class="w-full pv-light"
              placeholder="ABC123"
            />
          </div>
          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900">Fecha viaje</label>
            <Calendar
              v-model="form.fechaViaje"
              dateFormat="yy-mm-dd"
              class="w-full"
              inputClass="pv-light"
            />
          </div>
          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900">Origen</label>
            <InputText
              v-model="form.origen"
              class="w-full pv-light"
              placeholder="5001000"
            />
          </div>
          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900">Destino</label>
            <InputText
              v-model="form.destino"
              class="w-full pv-light"
              placeholder="5001001"
            />
          </div>

          <!-- NNA -->
          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900">Tipo ID NNA</label>
            <InputText
              v-model="form.tipoIdentificacionNna"
              class="w-full pv-light"
              inputmode="numeric"
            />
          </div>
          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900">Número ID NNA</label>
            <InputText
              v-model="form.numeroIdentificacionNna"
              class="w-full pv-light"
            />
          </div>
          <div class="field col-12 md:col-6">
            <label class="block mb-2 text-900">Nombre y Apellido NNA</label>
            <InputText
              v-model="form.nombresApellidosNna"
              class="w-full pv-light"
            />
          </div>

          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900"
              >¿Tiene discapacidad? (SI/NO)</label
            >
            <InputText
              v-model="form.situacionDiscapacidad"
              class="w-full pv-light"
              placeholder="SI / NO"
            />
          </div>
          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900"
              >Tipo discapacidad (código)</label
            >
            <InputText
              v-model="form.tipoDiscapacidad"
              class="w-full pv-light"
              inputmode="numeric"
            />
          </div>
          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900"
              >¿Comunidad étnica? (SI/NO)</label
            >
            <InputText
              v-model="form.perteneceComunidadEtnica"
              class="w-full pv-light"
              placeholder="SI / NO"
            />
          </div>
          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900"
              >Tipo población étnica (cód.)</label
            >
            <InputText
              v-model="form.tipoPoblacionEtnica"
              class="w-full pv-light"
              inputmode="numeric"
            />
          </div>

          <!-- Otorgante -->
          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900">Tipo ID Otorgante</label>
            <InputText
              v-model="form.tipoIdentificacionOtorgante"
              class="w-full pv-light"
              inputmode="numeric"
            />
          </div>
          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900">Número ID Otorgante</label>
            <InputText
              v-model="form.numeroIdentificacionOtorgante"
              class="w-full pv-light"
            />
          </div>
          <div class="field col-12 md:col-6">
            <label class="block mb-2 text-900"
              >Nombre y Apellido Otorgante</label
            >
            <InputText
              v-model="form.nombresApellidosOtorgante"
              class="w-full pv-light"
            />
          </div>
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900">Teléfono Otorgante</label>
            <InputText
              v-model="form.numeroTelefonicoOtorgante"
              class="w-full pv-light"
            />
          </div>
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900">Correo Otorgante</label>
            <InputText
              v-model="form.correoElectronicoOtorgante"
              class="w-full pv-light"
            />
          </div>
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900">Dirección Otorgante</label>
            <InputText
              v-model="form.direccionFisicaOtorgante"
              class="w-full pv-light"
            />
          </div>
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900">Sexo Otorgante (cód.)</label>
            <InputText
              v-model="form.sexoOtorgante"
              class="w-full pv-light"
              inputmode="numeric"
            />
          </div>
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900">Género Otorgante (cód.)</label>
            <InputText
              v-model="form.generoOtorgante"
              class="w-full pv-light"
              inputmode="numeric"
            />
          </div>
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900"
              >Calidad en que actúa (cód.)</label
            >
            <InputText
              v-model="form.calidadActua"
              class="w-full pv-light"
              inputmode="numeric"
            />
          </div>

          <!-- Autorizado a viajar -->
          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900">Tipo ID Autorizado Viajar</label>
            <InputText
              v-model="form.tipoIdentificacionAutorizadoViajar"
              class="w-full pv-light"
              inputmode="numeric"
            />
          </div>
          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900"
              >Número ID Autorizado Viajar</label
            >
            <InputText
              v-model="form.numeroIdentificacionAutorizadoViajar"
              class="w-full pv-light"
            />
          </div>
          <div class="field col-12 md:col-6">
            <label class="block mb-2 text-900"
              >Nombre y Apellido Autorizado Viajar</label
            >
            <InputText
              v-model="form.nombresApellidosAutorizadoViajar"
              class="w-full pv-light"
            />
          </div>
          <div class="field col-12 md:col-6">
            <label class="block mb-2 text-900"
              >Teléfono Autorizado Viajar</label
            >
            <InputText
              v-model="form.numeroTelefonicoAutorizadoViajar"
              class="w-full pv-light"
            />
          </div>
          <div class="field col-12 md:col-6">
            <label class="block mb-2 text-900"
              >Dirección Autorizado Viajar</label
            >
            <InputText
              v-model="form.direccionFisicaAutorizadoViajar"
              class="w-full pv-light"
            />
          </div>

          <!-- Autorizado a recoger -->
          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900"
              >Tipo ID Autorizado Recoger</label
            >
            <InputText
              v-model="form.tipoIdentificacionAutorizadoRecoger"
              class="w-full pv-light"
              inputmode="numeric"
            />
          </div>
          <div class="field col-12 md:col-3">
            <label class="block mb-2 text-900"
              >Número ID Autorizado Recoger</label
            >
            <InputText
              v-model="form.numeroIdentificacionAutorizadoRecoger"
              class="w-full pv-light"
            />
          </div>
          <div class="field col-12 md:col-6">
            <label class="block mb-2 text-900"
              >Nombre y Apellido Autorizado Recoger</label
            >
            <InputText
              v-model="form.nombresApellidosAutorizadoRecoger"
              class="w-full pv-light"
            />
          </div>
          <div class="field col-12 md:col-6">
            <label class="block mb-2 text-900"
              >Teléfono Autorizado Recoger</label
            >
            <InputText
              v-model="form.numeroTelefonicoAutorizadoRecoger"
              class="w-full pv-light"
            />
          </div>
          <div class="field col-12 md:col-6">
            <label class="block mb-2 text-900"
              >Dirección Autorizado Recoger</label
            >
            <InputText
              v-model="form.direccionFisicaAutorizadoRecoger"
              class="w-full pv-light"
            />
          </div>
          <div class="col-12">
            <h3 class="mt-3 mb-2">Documentos</h3>
          </div>

          <!-- Autorización de viaje -->
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900"
              >Autorización viaje - Nombre original</label
            >
            <InputText
              v-model="form.copiaAutorizacionViajeNombreOriginal"
              class="w-full pv-light"
              placeholder="autorizacion_viaje.pdf"
            />
          </div>
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900"
              >Autorización viaje - Documento</label
            >
            <InputText
              v-model="form.copiaAutorizacionViajeDocumento"
              class="w-full pv-light"
              placeholder="545225532.pdf"
            />
          </div>
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900">Autorización viaje - Ruta</label>
            <InputText
              v-model="form.copiaAutorizacionViajeRuta"
              class="w-full pv-light"
              placeholder="/sicov/890909459/"
            />
          </div>

          <!-- Documento de parentesco -->
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900"
              >Parentesco - Nombre original</label
            >
            <InputText
              v-model="form.copiaDocumentoParentescoNombreOriginal"
              class="w-full pv-light"
              placeholder="documento_parentesco.pdf"
            />
          </div>
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900">Parentesco - Documento</label>
            <InputText
              v-model="form.copiaDocumentoParentescoDocumento"
              class="w-full pv-light"
              placeholder="545225532.pdf"
            />
          </div>
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900">Parentesco - Ruta</label>
            <InputText
              v-model="form.copiaDocumentoParentescoRuta"
              class="w-full pv-light"
              placeholder="/sicov/890909459/"
            />
          </div>

          <!-- Documento identidad (autorizado) -->
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900"
              >Identidad Autorizado - Nombre original</label
            >
            <InputText
              v-model="form.copiaDocumentoIdentidadAutorizadoNombreOriginal"
              class="w-full pv-light"
              placeholder="documento_identidad.pdf"
            />
          </div>
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900"
              >Identidad Autorizado - Documento</label
            >
            <InputText
              v-model="form.copiaDocumentoIdentidadAutorizadoDocumento"
              class="w-full pv-light"
              placeholder="545225532.pdf"
            />
          </div>
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900"
              >Identidad Autorizado - Ruta</label
            >
            <InputText
              v-model="form.copiaDocumentoIdentidadAutorizadoRuta"
              class="w-full pv-light"
              placeholder="/sicov/890909459/"
            />
          </div>

          <!-- Constancia de entrega -->
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900"
              >Constancia Entrega - Nombre original</label
            >
            <InputText
              v-model="form.copiaConstanciaEntregaNombreOriginal"
              class="w-full pv-light"
              placeholder="constancia_entrega.pdf"
            />
          </div>
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900"
              >Constancia Entrega - Documento</label
            >
            <InputText
              v-model="form.copiaConstanciaEntregaDocumento"
              class="w-full pv-light"
              placeholder="545225532.pdf"
            />
          </div>
          <div class="field col-12 md:col-4">
            <label class="block mb-2 text-900">Constancia Entrega - Ruta</label>
            <InputText
              v-model="form.copiaConstanciaEntregaRuta"
              class="w-full pv-light"
              placeholder="/sicov/890909459/"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Cancelar" text @click="dlg.visible = false" />
        <Button
          v-if="!isEditing"
          label="Crear"
          icon="pi pi-save"
          class="btn-dark-green"
          :loading="saving"
          @click="save"
        />
        <Button
          v-else
          label="Guardar"
          icon="pi pi-save"
          class="btn-dark-green"
          :loading="saving"
          @click="saveEdit"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch } from "vue";
import { useAuthorizationStore } from "../stores/authorizationStore";
import InputText from "primevue/inputtext";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Dialog from "primevue/dialog";
import Calendar from "primevue/calendar";
import { useToast } from "primevue/usetoast";

import SearchBar from "../components/ui/SearchBar.vue";
import Button from "../components/ui/Button.vue";

const store = useAuthorizationStore();
const toast = useToast();

const list = computed(() => store.authorizationList);

console.log(
  "%cprotegeme-app\src\views\AuthorizationsView.vue:277 store.",
  "color: #007acc;",
  store.authorizationList
);

/* ====== Tabla & filtros ====== */
const items = computed(() => store.authorizationList.items || []);
const listLoading = computed(() => store.authorizationList.loading || false);
const page = ref(1);
const limit = ref(10);

const filters = reactive({
  placa: "", // SearchBar bind
});

const table = reactive({
  first: 0, // índice base 0-based
});

async function fetch(page?: number) {
  const p = typeof page === "number" ? page : store.authorizationList.page || 1;
  await store.authorizationFetchAll({ filters: { placa: filters.placa } });
  // reflejar en el DataTable
  table.first =
    (store.authorizationList.page - 1) * store.authorizationList.limit;
}

const first = ref(0); // índice 0-based del primer registro visible

const rows = computed(() => store.authorizationList.limit || 10);
const pageItems = computed(() => {
  console.log(
    "%cprotegeme-app\src\views\AuthorizationsView.vue:611 list",
    "color: #007acc;",
    list
  );
  const arr = list.value.items || [];
  console.log(
    "%cprotegeme-app\src\views\AuthorizationsView.vue:612 arr",
    "color: #007acc;",
    arr
  );
  return arr.slice(first.value, first.value + rows.value);
});

function onPage(e: any) {
  // PrimeVue entrega e.first y e.rows
  first.value = e.first;
}

function onRowsChange(r: any) {
  store.authorizationList.limit = r || 10;
  first.value = 0; // volvé a la primera página
}

async function onSearch() {
  store.authorizationList.page = 1;
  await fetch(1);
}

async function onClear() {
  filters.placa = "";
  store.authorizationList.page = 1;
  await fetch(1);
}

/* ====== Dialog Crear/Editar ====== */
const dlg = reactive({ visible: false });
const saving = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  idDespacho: "",
  placa: "",

  // autorizacion[0] - NNA / viaje
  fechaViaje: null as any,
  origen: "",
  destino: "",

  tipoIdentificacionNna: "",
  numeroIdentificacionNna: "",
  nombresApellidosNna: "",
  situacionDiscapacidad: "", // "SI" | "NO"
  tipoDiscapacidad: "", // number
  perteneceComunidadEtnica: "", // "SI" | "NO"
  tipoPoblacionEtnica: "", // number

  // Otorgante
  tipoIdentificacionOtorgante: "",
  numeroIdentificacionOtorgante: "",
  nombresApellidosOtorgante: "",
  numeroTelefonicoOtorgante: "",
  correoElectronicoOtorgante: "",
  direccionFisicaOtorgante: "",
  sexoOtorgante: "", // number
  generoOtorgante: "", // number
  calidadActua: "", // number

  // Autorizado a viajar
  tipoIdentificacionAutorizadoViajar: "",
  numeroIdentificacionAutorizadoViajar: "",
  nombresApellidosAutorizadoViajar: "",
  numeroTelefonicoAutorizadoViajar: "",
  direccionFisicaAutorizadoViajar: "",

  // Autorizado a recoger
  tipoIdentificacionAutorizadoRecoger: "",
  numeroIdentificacionAutorizadoRecoger: "",
  nombresApellidosAutorizadoRecoger: "",
  numeroTelefonicoAutorizadoRecoger: "",
  direccionFisicaAutorizadoRecoger: "",
  copiaAutorizacionViajeNombreOriginal: "",
  copiaAutorizacionViajeDocumento: "",
  copiaAutorizacionViajeRuta: "",

  // Documento de parentesco
  copiaDocumentoParentescoNombreOriginal: "",
  copiaDocumentoParentescoDocumento: "",
  copiaDocumentoParentescoRuta: "",

  // Documento de identidad (autorizado)
  copiaDocumentoIdentidadAutorizadoNombreOriginal: "",
  copiaDocumentoIdentidadAutorizadoDocumento: "",
  copiaDocumentoIdentidadAutorizadoRuta: "",

  // Constancia de entrega
  copiaConstanciaEntregaNombreOriginal: "",
  copiaConstanciaEntregaDocumento: "",
  copiaConstanciaEntregaRuta: "",
});

function openCreate() {
  isEditing.value = false;
  editingId.value = null;
  resetForm();
  dlg.visible = true;
}

function openEdit(row: any) {
  isEditing.value = true;
  editingId.value = row?._id || null;
  // Prefill seguro
  form.idDespacho = String(row?.idDespacho ?? form.idDespacho ?? "");
  form.placa = String(
    row?.placa || row?.autorizacion?.[0]?.placa || form.placa || ""
  );
  form.fechaViaje = row?.autorizacion?.[0]?.fechaViaje ?? null;
  form.origen = String(row?.autorizacion?.[0]?.origen ?? form.origen ?? "");
  form.destino = String(row?.autorizacion?.[0]?.destino ?? form.destino ?? "");
  form.tipoIdentificacionNna = String(
    row?.autorizacion?.[0]?.tipoIdentificacionNna ??
      form.tipoIdentificacionNna ??
      ""
  );
  form.numeroIdentificacionNna = String(
    row?.autorizacion?.[0]?.numeroIdentificacionNna ??
      form.numeroIdentificacionNna ??
      ""
  );
  form.nombresApellidosNna = String(
    row?.autorizacion?.[0]?.nombresApellidosNna ??
      form.nombresApellidosNna ??
      ""
  );
  dlg.visible = true;
}

async function save() {
  // Validaciones mínimas (como en tu Postman)
  const idDespacho = toInt(form.idDespacho);
  const fechaViaje = normDate(form.fechaViaje);
  const origen = (form.origen || "").trim();
  const destino = (form.destino || "").trim();
  const tipoIdentificacionNna = toInt(form.tipoIdentificacionNna);
  const numeroIdentificacionNna = (form.numeroIdentificacionNna || "")
    .toString()
    .trim();
  const nombresApellidosNna = (form.nombresApellidosNna || "").trim();

  if (!idDespacho) {
    toast.add({
      severity: "warn",
      summary: "Falta ID Despacho",
      detail: "idDespacho es requerido y numérico",
      life: 2500,
    });
    return;
  }
  if (
    !fechaViaje ||
    !origen ||
    !destino ||
    !tipoIdentificacionNna ||
    !numeroIdentificacionNna ||
    !nombresApellidosNna
  ) {
    toast.add({
      severity: "warn",
      summary: "Datos incompletos",
      detail: "Completá fecha, origen, destino y datos de NNA",
      life: 3000,
    });
    return;
  }

  // Armamos el item de autorizacion con TODO
  const item: any = {
    // requerido
    fechaViaje,
    origen,
    destino,
    tipoIdentificacionNna,
    numeroIdentificacionNna,
    nombresApellidosNna,
  };

  // Helpers
  const pushStr = (k: string, v: any) => {
    const s = (v ?? "").toString().trim();
    if (s) item[k] = s;
  };
  const pushInt = (k: string, v: any) => {
    const n = toInt(v);
    if (typeof n === "number") item[k] = n;
  };

  // Placa (el body que funciona la pide dentro del item)
  pushStr("placa", form.placa);

  // Extra NNA
  pushStr("situacionDiscapacidad", form.situacionDiscapacidad);
  pushInt("tipoDiscapacidad", form.tipoDiscapacidad);
  pushStr("perteneceComunidadEtnica", form.perteneceComunidadEtnica);
  pushInt("tipoPoblacionEtnica", form.tipoPoblacionEtnica);

  // Otorgante
  pushInt("tipoIdentificacionOtorgante", form.tipoIdentificacionOtorgante);
  pushStr("numeroIdentificacionOtorgante", form.numeroIdentificacionOtorgante);
  pushStr("nombresApellidosOtorgante", form.nombresApellidosOtorgante);
  pushStr("numeroTelefonicoOtorgante", form.numeroTelefonicoOtorgante);
  pushStr("correoElectronicoOtorgante", form.correoElectronicoOtorgante);
  pushStr("direccionFisicaOtorgante", form.direccionFisicaOtorgante);
  pushInt("sexoOtorgante", form.sexoOtorgante);
  pushInt("generoOtorgante", form.generoOtorgante);
  pushInt("calidadActua", form.calidadActua); // OJO: 'calidadActua' es el nombre que “anda” en la externa

  // Autorizado a viajar
  pushInt(
    "tipoIdentificacionAutorizadoViajar",
    form.tipoIdentificacionAutorizadoViajar
  );
  pushStr(
    "numeroIdentificacionAutorizadoViajar",
    form.numeroIdentificacionAutorizadoViajar
  );
  pushStr(
    "nombresApellidosAutorizadoViajar",
    form.nombresApellidosAutorizadoViajar
  );
  pushStr(
    "numeroTelefonicoAutorizadoViajar",
    form.numeroTelefonicoAutorizadoViajar
  );
  pushStr(
    "direccionFisicaAutorizadoViajar",
    form.direccionFisicaAutorizadoViajar
  );

  // Autorizado a recoger
  pushInt(
    "tipoIdentificacionAutorizadoRecoger",
    form.tipoIdentificacionAutorizadoRecoger
  );
  pushStr(
    "numeroIdentificacionAutorizadoRecoger",
    form.numeroIdentificacionAutorizadoRecoger
  );
  pushStr(
    "nombresApellidosAutorizadoRecoger",
    form.nombresApellidosAutorizadoRecoger
  );
  pushStr(
    "numeroTelefonicoAutorizadoRecoger",
    form.numeroTelefonicoAutorizadoRecoger
  );
  pushStr(
    "direccionFisicaAutorizadoRecoger",
    form.direccionFisicaAutorizadoRecoger
  );

  // ---- Documentos (4 x 3) ----
  // Autorización de viaje
  pushStr(
    "copiaAutorizacionViajeNombreOriginal",
    form.copiaAutorizacionViajeNombreOriginal
  );
  pushStr(
    "copiaAutorizacionViajeDocumento",
    form.copiaAutorizacionViajeDocumento
  );
  pushStr("copiaAutorizacionViajeRuta", form.copiaAutorizacionViajeRuta);

  // Documento de parentesco
  pushStr(
    "copiaDocumentoParentescoNombreOriginal",
    form.copiaDocumentoParentescoNombreOriginal
  );
  pushStr(
    "copiaDocumentoParentescoDocumento",
    form.copiaDocumentoParentescoDocumento
  );
  pushStr("copiaDocumentoParentescoRuta", form.copiaDocumentoParentescoRuta);

  // Documento identidad (autorizado)
  pushStr(
    "copiaDocumentoIdentidadAutorizadoNombreOriginal",
    form.copiaDocumentoIdentidadAutorizadoNombreOriginal
  );
  pushStr(
    "copiaDocumentoIdentidadAutorizadoDocumento",
    form.copiaDocumentoIdentidadAutorizadoDocumento
  );
  pushStr(
    "copiaDocumentoIdentidadAutorizadoRuta",
    form.copiaDocumentoIdentidadAutorizadoRuta
  );

  // Constancia de entrega
  pushStr(
    "copiaConstanciaEntregaNombreOriginal",
    form.copiaConstanciaEntregaNombreOriginal
  );
  pushStr(
    "copiaConstanciaEntregaDocumento",
    form.copiaConstanciaEntregaDocumento
  );
  pushStr("copiaConstanciaEntregaRuta", form.copiaConstanciaEntregaRuta);

  // Body final (MATCH Postman que te funciona)
  const body: any = {
    idDespacho,
    autorizacion: [item],
  };

  // (Opcional) si querés también mandarla en raíz para tu búsqueda local
  if ((form.placa || "").trim()) body.placa = form.placa.trim();

  saving.value = true;
  try {
    await store.authorizationCreate(body);
    toast.add({
      severity: "success",
      summary: "Creado",
      detail: "Autorización creada",
      life: 2500,
    });
    dlg.visible = false;
    await onSearch();
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || "No se pudo crear";
    toast.add({ severity: "error", summary: "Error", detail: msg, life: 3500 });
  } finally {
    saving.value = false;
  }
}

async function saveEdit() {
  if (!editingId.value) return;
  // Solo enviamos cambios presentes
  const changes: any = {};
  if (form.fechaViaje) changes.fechaViaje = normDate(form.fechaViaje);
  if ((form.origen || "").trim()) changes.origen = form.origen.trim();
  if ((form.destino || "").trim()) changes.destino = form.destino.trim();
  if (form.tipoIdentificacionNna !== "")
    changes.tipoIdentificacionNna = toInt(form.tipoIdentificacionNna);
  if ((form.numeroIdentificacionNna || "").trim())
    changes.numeroIdentificacionNna = form.numeroIdentificacionNna.trim();
  if ((form.nombresApellidosNna || "").trim())
    changes.nombresApellidosNna = form.nombresApellidosNna.trim();
  if ((form.placa || "").trim()) changes.placa = form.placa.trim();

  // Enviamos como { id, changes } (así lo espera el controller)
  saving.value = true;
  try {
    await store.authorizationUpdate(editingId.value, changes);
    toast.add({
      severity: "success",
      summary: "Actualizado",
      detail: "Autorización actualizada",
      life: 2500,
    });
    dlg.visible = false;
    await onSearch();
  } catch (e: any) {
    const msg =
      e?.response?.data?.message || e?.message || "No se pudo actualizar";
    toast.add({ severity: "error", summary: "Error", detail: msg, life: 3500 });
  } finally {
    saving.value = false;
  }
}

async function toggle(id: string) {
  try {
    const res = await store.authorizationToggle(id);
    const estadoTxt = res?.estado ? "activada" : "desactivada";
    toast.add({
      severity: res?.estado ? "success" : "warn",
      summary: "Estado",
      detail: `Autorización ${estadoTxt}`,
      life: 2500,
    });
    await onSearch();
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "No se pudo cambiar el estado";
    toast.add({ severity: "error", summary: "Error", detail: msg, life: 3500 });
  }
}

function resetForm() {
  form.idDespacho = "";
  form.placa = "";
  form.fechaViaje = null;
  form.origen = "";
  form.destino = "";
  form.tipoIdentificacionNna = "";
  form.numeroIdentificacionNna = "";
  form.nombresApellidosNna = "";
}

/* Helpers */
function toInt(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function normDate(v: any): string | undefined {
  if (!v) return undefined;
  try {
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, "0");
    const dd = `${d.getDate()}`.padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return undefined;
  }
}

onMounted(() => {
  onSearch();
  fetch(1);
});
watch(
  () => dlg.visible,
  (v) => {
    if (!v) {
      isEditing.value = false;
      editingId.value = null;
    }
  }
);
</script>

<style scoped>
.bolt-wrap {
  display: grid;
  gap: 1rem;
}

/* Cards claras con sombra suave */
.bolt-card {
  background: #ffffff !important;
  color: #111111 !important;
  border: 1px solid rgba(17, 17, 17, 0.06);
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(17, 17, 17, 0.05);
}

/* Toolbar */
.bolt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
}
.bolt-toolbar .title {
  margin: 0;
  font-weight: 700;
}
.bolt-toolbar .subtitle {
  margin: 0.125rem 0 0;
  color: #6b7280;
  font-size: 0.9rem;
}

/* Input con ícono dentro */
:deep(.p-input-icon-left) {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 100%;
}
:deep(.p-input-icon-left > i) {
  position: absolute;
  left: 0.75rem;
}
:deep(.p-input-icon-left .p-inputtext) {
  padding-left: 2.5rem;
  background: #fff !important;
  color: #111 !important;
}

/* DataTable en blanco: cabecera, filas y paginador */
.bolt-card :deep(.p-datatable),
.bolt-card :deep(.p-datatable-wrapper),
.bolt-card :deep(.p-datatable-header),
.bolt-card :deep(.p-datatable-thead > tr > th),
.bolt-card :deep(.p-datatable-tbody > tr),
.bolt-card :deep(.p-datatable-tbody > tr > td),
.bolt-card :deep(.p-paginator),
.bolt-card :deep(.p-paginator .p-paginator-pages .p-paginator-page),
.bolt-card :deep(.p-paginator .p-paginator-prev),
.bolt-card :deep(.p-paginator .p-paginator-next),
.bolt-card :deep(.p-paginator .p-paginator-first),
.bolt-card :deep(.p-paginator .p-paginator-last) {
  background: #ffffff !important;
  color: #111111 !important;
  border-color: rgba(17, 17, 17, 0.06) !important;
}

/* Dialog claro: textos en negro */
:deep(.p-dialog) {
  color: #111 !important;
}
:deep(.p-dialog .p-dialog-header),
:deep(.p-dialog .p-dialog-content),
:deep(.p-dialog .p-dialog-footer) {
  background: #fff !important;
  color: #111 !important;
}
:deep(.p-dialog label),
:deep(.p-dialog .p-inputtext),
:deep(.p-dialog .p-calendar),
:deep(.p-dialog .p-inputtextarea) {
  color: #111 !important;
  background: #fff !important;
}

/* Botones de la paleta */
:deep(.p-button.btn-dark-green) {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}

/* Ajustes menores */
.text-600 {
  color: #6b7280;
}
.text-900 {
  color: #111827;
}

:deep(.p-dialog .p-dialog-header),
:deep(.p-dialog .p-dialog-content) {
  background: #fff !important;
  color: #111 !important;
}

/* Apunta al contenedor del contenido del dialog (ya lo tenés con class="dialog-body") */
.dialog-body label {
  color: #111 !important;
}

.dialog-body .p-inputtext,
.dialog-body .p-inputtextarea,
.dialog-body .p-calendar {
  background: #fff !important;
  color: #111 !important;
}

.p-inputtext {
  background-color: #fff;
}

.label {
  color: black !important;
}

/* Para tags auxiliares dentro del modal, por si algún tema los deja pálidos */
.dialog-body .text-900,
.dialog-body .text-700 {
  color: #111 !important;
}

:deep(.p-datatable-tbody > tr > td),
:deep(.p-datatable-tbody > tr > td *) {
  color: #111 !important;
}
.bolt-card :deep(.p-datatable),
.bolt-card :deep(.p-datatable-wrapper),
.bolt-card :deep(.p-datatable-header),
.bolt-card :deep(.p-datatable-thead > tr > th),
.bolt-card :deep(.p-datatable-tbody > tr),
.bolt-card :deep(.p-datatable-tbody > tr > td),
.bolt-card :deep(.p-paginator) {
  background: #fff !important;
}
.detail-pane :deep(*) {
  color: #111 !important;
}
.detail-pane :deep(.p-tag) {
  color: #fff !important;
}

.dlg-2col :deep(.p-dialog-content) {
  max-height: none;
  overflow-y: visible;
}

.btn-icon-white {
  background: #ffffff !important; /* fondo blanco */
  border: 1px solid transparent !important;
  color: #000000 !important; /* texto (por si hubiera) */
  box-shadow: none !important;
  min-width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
}

/* icono dentro del botón */
.btn-icon-white .p-button-icon {
  color: #000000 !important; /* icono negro */
  font-size: 1.05rem;
}

/* hover / focus: pequeña sombra o borde tenue (opcional) */
.btn-icon-white:hover {
  background: #ffffff !important;
  border-color: #e6e6e6 !important;
}

/* si usás la clase statebutton en conjunto, asegurar prioridad del icon color */
.statebutton .p-button-icon,
.btn-icon-white.statebutton .p-button-icon {
  color: #000 !important;
}
label {
  color: #111 !important;
}
</style>
