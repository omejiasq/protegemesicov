<template>
  <div class="bolt-wrap">

    <!-- ===================== -->
    <!-- TOOLBAR -->
    <!-- ===================== -->
    <div class="bolt-toolbar bolt-card">
      <div>
        <h2 class="title">Mantenimientos — Alistamientos</h2>
        <p class="subtitle">Listado y registro de alistamientos</p>
      </div>
      <div class="actions">
        <Button
          label="Exportar Excel"
          icon="pi pi-file-excel"
          class="btn-blue"
          @click="exportExcel"
        />
        <Button
          label="Nuevo Alistamiento"
          icon="pi pi-plus"
          class="btn-dark-green"
          @click="openCreate"
        />
      </div>
    </div>

<!-- ===================== -->
<!-- FILTROS -->
<!-- ===================== -->
<div class="bolt-card p-3">
  <div class="grid align-items-end">

    <!-- PLACA -->
    <div class="col-12 md:col-3">
      <label>Placa</label>
      <InputText
        v-model="filters.placa"
        placeholder="ABC123"
        class="w-full"
        @keyup.enter="refresh"
      />
    </div>

    <!-- FECHA DESDE -->
    <div class="col-12 md:col-3">
      <label>Fecha desde</label>
      <Calendar
        v-model="filters.fechaDesde"
        dateFormat="yy-mm-dd"
        showIcon
        class="w-full"
      />
    </div>

    <!-- FECHA HASTA -->
    <div class="col-12 md:col-3">
      <label>Fecha hasta</label>
      <Calendar
        v-model="filters.fechaHasta"
        dateFormat="yy-mm-dd"
        showIcon
        class="w-full"
      />
    </div>

    <!-- BOTONES -->
    <div class="col-12 md:col-3 flex gap-2">
      <Button
        label="Filtrar"
        icon="pi pi-search"
        class="btn-blue"
        @click="refresh"
      />
      <Button
        label="Limpiar"
        icon="pi pi-times"
        class="p-button-outlined"
        @click="onClear"
      />
    </div>

  </div>
</div>


    <!-- ===================== -->
    <!-- TABLA -->
    <!-- ===================== -->
    <div class="bolt-card p-3">
      <DataTable
        :value="rowsFiltered"
        :loading="loading"
        dataKey="_id"
        responsive-layout="scroll"
        :paginator="true"
        :rows="limit"
        :totalRecords="total"
        :first="(page - 1) * limit"
        class="p-datatable-sm"
      >
        <Column field="placa" header="Placa" />
        <Column field="nombresConductor" header="Conductor" />
        <Column field="numeroIdentificacion" header="Documento" />
        <Column header="Fecha">
          <template #body="{ data }">{{ fmtDate(data.createdAt) }}</template>
        </Column>
        <Column header="Estado">
          <template #body="{ data }">
            <Tag
              :value="data.estado ? 'ACTIVO' : 'INACTIVO'"
              :severity="data.estado ? 'success' : 'danger'"
            />
          </template>
        </Column>
        <Column header="Acciones">
          <template #body="{ data }">
            <Button
              icon="pi pi-eye"
              class="btn-icon-white"
              @click="openViewEnlistment(data)"
            />
          </template>
        </Column>
      </DataTable>

    <Paginator
      :rows="limit"
      :totalRecords="total"
      :first="(page - 1) * limit"
      :rowsPerPageOptions="[10, 20, 50, 100]"
      @page="onPage"
    />

    </div>

    <!-- ===================== -->
    <!-- MODAL -->
    <!-- ===================== -->
    <Dialog
      v-model:visible="dlg.visible"
      modal
      header="Nuevo alistamiento"
      class="dialog-form"
      :style="{ width: '95vw', maxWidth: '900px' }"
    >
      <div class="form-card">

        <!-- PLACA + RESPONSABLE -->
        <div class="grid">
          <div class="col-12 md:col-3">
            <label>Placa</label>
            
            <InputText
              v-model="form.placa"
              class="w-full"
              maxlength="6"
              placeholder="ABC123"
              @input="onPlacaInput"
            />
          </div>

          <div class="col-12 md:col-3">
            <label>Tipo Doc. Responsable</label>
            <UiDropdownBasic
              v-model="form.tipoIdentificacion"
              :options="documentTypeOptions"
              class="w-full"
            />
          </div>

          <div class="col-12 md:col-3">
            <label>N° Documento</label>
            <InputText v-model="form.numeroIdentificacion" class="w-full" />
          </div>

          <div class="col-12 md:col-3">
            <label>Nombre Responsable</label>
            <InputText v-model="form.nombresResponsable" class="w-full" />
          </div>
        </div>

        <!-- CONDUCTOR -->
        <div class="grid mt-3">
          <div class="col-12 md:col-4">
            <label>Tipo Doc. Conductor</label>
            <UiDropdownBasic
              v-model="form.tipoIdentificacionConductor"
              :options="documentTypeOptions"
              class="w-full"
            />
          </div>

          <div class="col-12 md:col-4">
            <label>N° Documento</label>
            <InputText
              v-model="form.numeroIdentificacionConductor"
              class="w-full"
            />
          </div>

          <div class="col-12 md:col-4">
            <label>Nombre Conductor</label>
            <InputText
              v-model="form.nombresConductor"
              class="w-full"
            />
          </div>
        </div>

        <!-- ACTIVIDADES -->
        <div class="mt-4">
          <h3 class="section-title">
            Detalle de actividades a chequear del vehículo
          </h3>

            <DataTable
              :value="activitiesWithCheck"
              responsive-layout="scroll"

              class="p-datatable-sm activities-table"
            >
            <Column style="width: 60px">
              <template #body="{ data }">
                <Checkbox
                  v-model="form.actividades"
                  :value="data.id"
                />
              </template>
            </Column>
            <Column field="nombre" header="Actividad" />
          </DataTable>
        </div>

        <!-- NOTAS -->
        <div class="mt-4">
          <label>Notas del estado del vehículo</label>
          <Textarea
            v-model="form.detalleActividades"
            rows="4"
            class="w-full"
            autoResize
          />
        </div>
      </div>

      <template #footer>
        <Button label="Cancelar" class="p-button-text" @click="dlg.visible=false" />
        <Button
          label="Guardar"
          icon="pi pi-save"
          class="btn-dark-green"
          :loading="saving"
          @click="save"
        />
      </template>
    </Dialog>
  </div>
</template>


<script setup lang="ts">

import { reactive, ref, computed, onMounted } from "vue";
import { useMaintenanceStore } from "../../stores/maintenanceStore";
import InputText from "primevue/inputtext";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Dialog from "primevue/dialog";
import UiDropdownBasic from "../../components/ui/Dropdown.vue";
import { MaintenanceserviceApi } from "../../api/maintenance.service";
import Calendar from "primevue/calendar";
import Textarea from "primevue/textarea";
import Checkbox from "primevue/checkbox";
import { useToast } from "primevue/usetoast";
import { watch } from "vue";

import SearchBar from "../../components/ui/SearchBar.vue";
import InputDate from "../../components/ui/InputDate.vue";
import InputHour from "../../components/ui/InputHour.vue";
import Button from "../../components/ui/Button.vue";

/* 👇 SOLO AQUÍ */
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


const toast = useToast();

const store = useMaintenanceStore();

const selectedFile = ref<File | null>(null);
function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] || null;
  selectedFile.value = f;
}

const total = computed(() => store.enlistmentList.total);
const page = ref(1);
const limit = ref(10);
const searchPlate = ref("");

const documentTypeOptions = [
  { label: "Cédula de ciudadanía", value: 1 },
  { label: "Cédula de ciudadanía digital", value: 2 },
  { label: "Tarjeta de identidad", value: 3 },
  { label: "Registro civil", value: 4 },
  { label: "Cédula de extranjería", value: 5 },
  { label: "Pasaporte", value: 6 },
  { label: "Permiso Especial de Permanencia (PEP)", value: 7 },
  { label: "Documento de Identificación Extranjero (DIE)", value: 8 },
];

function onPage(e: any) {
  page.value = Math.floor(e.first / e.rows) + 1;
  limit.value = e.rows;
  refresh();
}


// ===============================
// ACTIVIDADES (CHECKLIST)
// ===============================
const activitiesWithCheck = computed(() => {
  const acts = (store.enlistment?.activities || []);

  return acts.map((a: any) => ({
    id: Number(a.id ?? a._id),
    nombre: a.nombre ?? a.name ?? "Actividad",
  }));
});


const isEditingEnlistment = ref(false);
const editingEnlistmentId = ref<string | null>(null);

const viewMode = ref(false);
const dialogTitle = computed(() =>
  viewMode.value ? "Detalle de alistamiento" : "Nuevo alistamiento"
);

async function fetchEnlistmentById(id: string) {
  if (typeof (store as any).enlistmentGetDetail === "function") {
    return await (store as any).enlistmentGetDetail(id);
  }
  const local = (store.enlistmentList.items || []).find(
    (x: any) => x?._id === id
  );
  if (local) return local;
  await store.enlistmentFetchList({ id });
  return (
    (store.enlistmentList.items || []).find((x: any) => x?._id === id) || null
  );
}

function exportExcel() {
  if (!rowsFiltered.value.length) return;

  const data = rowsFiltered.value.map((r: any) => ({
    Placa: r.placa || "",
    Conductor: r.nombresConductor || "",
    Documento: r.numeroIdentificacion || "",
    Responsable: r.nombresResponsable || "",
    Fecha: r.createdAt
      ? new Date(r.createdAt).toLocaleDateString()
      : "",
    Estado: r.estado ? "ACTIVO" : "INACTIVO",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Alistamientos");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([excelBuffer], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, `alistamientos_${Date.now()}.xlsx`);
}

function clearFormForNew() {
  // Limpiar solo los campos de entrada, NO las actividades
  form.placa = "";
  form.tipoIdentificacion = "";
  form.numeroIdentificacion = "";
  form.nombresResponsable = "";
  form.tipoIdentificacionConductor = "";
  form.numeroIdentificacionConductor = "";
  form.nombresConductor = "";
  form.detalleActividades = "";
  // NO limpiar: form.actividades = [] - mantener las actividades precargadas
}

function fillFormFromRow(row: any) {
  form.placa = row?.placa ?? "";
  form.fecha = row?.fecha ?? row?.createdAt ?? null;
  form.hora = row?.hora ?? null;

  form.tipoIdentificacion = row?.tipoIdentificacion ?? "";
  form.numeroIdentificacion = row?.numeroIdentificacion ?? "";
  form.nombresResponsable = row?.nombresResponsable ?? row?.responsable ?? "";

  form.tipoIdentificacionConductor = row?.tipoIdentificacionConductor ?? "";
  form.numeroIdentificacionConductor = row?.numeroIdentificacionConductor ?? "";
  form.nombresConductor = row?.nombresConductor ?? row?.conductor ?? "";

  form.detalleActividades = row?.detalleActividades ?? "";

  // Actividades guardadas -> IDs numéricos para que el Checkbox (value=+act.id) marque
  const raw = Array.isArray(row?.actividades) ? row.actividades : [];
  form.actividades = raw
    .map((v: any) => {
      const id = typeof v === "object" ? (v.id ?? v._id ?? v.value) : v;
      const n = Number(id);
      return Number.isFinite(n) ? n : null;
    })
    .filter((n: number | null) => n !== null) as number[];
}

function onPlacaInput(e: Event) {
  const input = e.target as HTMLInputElement;

  // Solo letras y números
  let value = input.value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);

  form.placa = value;
}


async function openViewEnlistment(row: any) {
  viewMode.value = true;
  const id = row?._id;
  const full = id ? await fetchEnlistmentById(id) : row;
  fillFormFromRow(full || row);
  dlg.visible = true;
}

// Abre modal en modo edición y precarga SOLO campos editables
function openEditEnlistment(row: any) {
  isEditingEnlistment.value = true;
  editingEnlistmentId.value = row?._id || null;

  // Precarga; NO tocamos mantenimientoId ni placa si en tu flujo no se editan
  form.fecha = row?.fecha ?? form.fecha;
  form.hora = row?.hora ?? form.hora;
  form.tipoIdentificacion = row?.tipoIdentificacion ?? form.tipoIdentificacion;
  form.numeroIdentificacion =
    row?.numeroIdentificacion ?? form.numeroIdentificacion;
  form.nombresResponsable = row?.nombresResponsable ?? form.nombresResponsable;
  form.detalleActividades = row?.detalleActividades ?? form.detalleActividades;
  if ("actividades" in form)
    form.actividades = row?.actividades ?? form.actividades;

  dlg.visible = true;
}

// Guarda edición usando la STORE
async function saveEditEnlistment() {
  if (!editingEnlistmentId.value) return;

  // Payload SOLO con campos editables (misma lógica que venías usando)
  const payload: any = {};
  if (form.fecha) payload.fecha = normDate(form.fecha);
  if (form.hora) payload.hora = normTime(form.hora);
  if (
    form.tipoIdentificacion !== undefined &&
    form.tipoIdentificacion !== null &&
    form.tipoIdentificacion !== ""
  )
    payload.tipoIdentificacion =
      typeof toInt === "function"
        ? toInt(form.tipoIdentificacion)
        : form.tipoIdentificacion;
  if (form.numeroIdentificacion)
    payload.numeroIdentificacion = String(form.numeroIdentificacion).trim();
  if (form.nombresResponsable)
    payload.nombresResponsable = String(form.nombresResponsable).trim();
  if (form.detalleActividades)
    payload.detalleActividades = String(form.detalleActividades).trim();
  if ("actividades" in form && form.actividades !== undefined)
    payload.actividades = form.actividades;

  saving.value = true;
  try {
    // ✅ usa la store (que llama al maintenance.service.ts)
    await store.enlistmentUpdateDetail(editingEnlistmentId.value, payload);

    toast.add({
      severity: "success",
      summary: "Actualizado",
      detail: "Alistamiento actualizado",
      life: 2500,
    });
    dlg.visible = false;
    await refresh();
  } catch (e: any) {
    const msg =
      e?.response?.data?.message || e?.message || "No se pudo actualizar";
    toast.add({ severity: "error", summary: "Error", detail: msg, life: 3500 });
  } finally {
    saving.value = false;
  }
}

// Activar/Desactivar usando la STORE
async function toggleEnlistment(id: string) {
  try {
    const res = await store.enlistmentToggle(id);
    const estadoTxt = res?.estado ? "activado" : "desactivado";
    toast.add({
      severity: res?.estado ? "success" : "warn",
      summary: "Estado",
      detail: `Alistamiento ${estadoTxt}`,
      life: 2500,
    });
    await refresh();
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "No se pudo cambiar el estado";
    toast.add({ severity: "error", summary: "Error", detail: msg, life: 3500 });
  }
}

function onSearch() {
  page.value = 1;
  refresh();
}


function onClear() {
  filters.placa = "";
  filters.fechaDesde = null;
  filters.fechaHasta = null;
  refresh();
}


const isEditingCorrective = ref(false);
const editingCorrectiveId = ref<string | null>(null);

function setIfExists<K extends string>(key: K, value: any) {
  // setea solo si el campo existe en tu form
  if (key in (form as any)) {
    (form as any)[key] = value ?? (form as any)[key];
  }
}

function pushStringIfExists(payload: any, key: string) {
  if (key in (form as any)) {
    const raw = (form as any)[key];
    if (raw !== undefined && raw !== null) {
      const v = String(raw).trim();
      if (v !== "") payload[key] = v;
    }
  }
}

// --- REEMPLAZO 1: openEditCorrective ---
function openEditCorrective(row: any) {
  isEditingCorrective.value = true;
  editingCorrectiveId.value = row?._id || null;

  // fechas/horas (si existen en tu form)
  if ("fecha" in (form as any))
    (form as any).fecha = row?.fecha ?? (form as any).fecha;
  if ("hora" in (form as any))
    (form as any).hora = row?.hora ?? (form as any).hora;

  // campos opcionales: solo seteamos si existen en form
  setIfExists("nit", row?.nit);
  setIfExists("razonSocial", row?.razonSocial);
  setIfExists("descripcionFalla", row?.descripcionFalla);
  setIfExists("accionesRealizadas", row?.accionesRealizadas);
  setIfExists("detalleActividades", row?.detalleActividades);

  dlg.visible = true;
}

// --- REEMPLAZO 2: saveEditCorrective ---
async function saveEditCorrective() {
  if (!editingCorrectiveId.value) return;

  const payload: any = {};

  // fecha/hora (respetando tus normalizadores si existen)
  if ("fecha" in (form as any) && (form as any).fecha) {
    payload.fecha =
      typeof normDate === "function"
        ? normDate((form as any).fecha)
        : (form as any).fecha;
  }
  if ("hora" in (form as any) && (form as any).hora) {
    payload.hora =
      typeof normTime === "function"
        ? normTime((form as any).hora)
        : (form as any).hora;
  }

  // nit -> número (usa tu toIntOrUndef/toInt si existen; si no, fallback)
  if ("nit" in (form as any)) {
    const rawNit = (form as any).nit;
    const parsedNit =
      typeof toIntOrUndef === "function"
        ? toIntOrUndef(rawNit)
        : typeof toInt === "function"
        ? toInt(rawNit)
        : Number.isFinite(Number(rawNit))
        ? Number(rawNit)
        : undefined;
    if (parsedNit !== undefined) payload.nit = parsedNit;
  }

  // strings opcionales (solo si existen en form)
  pushStringIfExists(payload, "razonSocial");
  pushStringIfExists(payload, "descripcionFalla");
  pushStringIfExists(payload, "accionesRealizadas");
  pushStringIfExists(payload, "detalleActividades");

  saving.value = true;
  try {
    // Usamos la STORE (que llama a /api/maintenance.service.ts)
    await store.correctiveUpdateDetail(editingCorrectiveId.value, payload);

    toast.add({
      severity: "success",
      summary: "Actualizado",
      detail: "Correctivo actualizado",
      life: 2500,
    });
    dlg.visible = false;
    isEditingCorrective.value = false;
    editingCorrectiveId.value = null;
    await refresh();
  } catch (e: any) {
    const msg =
      e?.response?.data?.message || e?.message || "No se pudo actualizar";
    toast.add({ severity: "error", summary: "Error", detail: msg, life: 3500 });
  } finally {
    saving.value = false;
  }
}

async function toggleCorrective(id: string) {
  try {
    const hasStore =
      store && typeof (store as any).correctiveToggle === "function";
    const res = hasStore
      ? await (store as any).correctiveToggle(id)
      : (await MaintenanceserviceApi.toggleCorrective(id)).data;

    const estadoTxt = res?.estado ? "activado" : "desactivado";
    toast.add({
      severity: res?.estado ? "success" : "warn",
      summary: "Estado",
      detail: `Correctivo ${estadoTxt}`,
      life: 2500,
    });
    await refresh();
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "No se pudo cambiar el estado";
    toast.add({ severity: "error", summary: "Error", detail: msg, life: 3500 });
  }
}

//type EnlistmentFilters = { mantenimientoId: string; placa: string };
//const filters = reactive<EnlistmentFilters>({ mantenimientoId: "", placa: "" });
type EnlistmentFilters = {
  mantenimientoId: string;
  placa: string;
  fechaDesde: Date | null;
  fechaHasta: Date | null;
};

const filters = reactive<EnlistmentFilters>({
  mantenimientoId: "",
  placa: "",
  fechaDesde: null,
  fechaHasta: null,
});


const saving = ref(false);
const dlg = reactive({ visible: false });
watch(
  () => dlg.visible,
  (v) => {
    if (!v) {
      isEditingEnlistment.value = false;
      editingEnlistmentId.value = null;
      if (!v) viewMode.value = false;
    }
  }
);
const form = reactive({
  placa: "",
  fecha: null as any,
  hora: null as any,
  tipoIdentificacion: "",
  numeroIdentificacion: "",
  nombresResponsable: "",
  tipoIdentificacionConductor: "",
  numeroIdentificacionConductor: "",
  nombresConductor: "",
  detalleActividades: "",
  actividades: [] as number[],
});

const fileInputRef = ref<HTMLInputElement | null>(null);

function resetForm() {
  Object.assign(form, {
    mantenimientoId: "",
    placa: "",
    fecha: null as any,
    hora: null as any,

    // Responsable
    tipoIdentificacion: "",
    numeroIdentificacion: "",
    nombresResponsable: "",

    // Conductor
    tipoIdentificacionConductor: "",
    numeroIdentificacionConductor: "",
    nombresConductor: "",

    detalleActividades: "",
    actividades: [] as number[],
  });
  selectedFile.value = null;
  if (fileInputRef.value) fileInputRef.value.value = "";
}

const loading = computed(() => store.enlistmentList.loading);
const rows = computed(() => (store.enlistmentList.items || []).map(normalize));

const rowsFiltered = computed(() => {
  let data = rows.value;

  if (filters.fechaDesde) {
    const desde = new Date(filters.fechaDesde).setHours(0, 0, 0, 0);
    data = data.filter((r: any) => {
      if (!r.createdAt) return false;
      return new Date(r.createdAt).getTime() >= desde;
    });
  }

  if (filters.fechaHasta) {
    const hasta = new Date(filters.fechaHasta).setHours(23, 59, 59, 999);
    data = data.filter((r: any) => {
      if (!r.createdAt) return false;
      return new Date(r.createdAt).getTime() <= hasta;
    });
  }

  return data;
});


const maintenanceOptsType3 = computed(() =>
  (store.maintenanceList.items || [])
    .filter((m: any) => Number(m?.tipoId) === 3) // 👈 SOLO tipo 3
    .map((m: any) => ({
      label: formatMaintLabel(m),
      value: m?._id,
    }))
);

function normalize(r: any) {
  const estadoBool =
    typeof r.estado === "boolean"
      ? r.estado
      : r.estado === "ACTIVO" || r.estado === 1 || r.estado === "1";
  return {
    _id: r._id,
    mantenimientoId: r.mantenimientoId,
    fecha: r.fecha ?? r.createdAt ?? null,
    estado: estadoBool,
    ...r,
  };
}

function fmtDate(s?: string) {
  if (!s) return "—";
  // YYYY-MM-DD → DD/MM/YYYY (sin TZ, sin corrimientos)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  // Si no viene en YMD estricto, caemos a parseo normal
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString();
}

async function refresh() {
  const params: any = {
    page: page.value,
    numero_items: limit.value,
  };

  if (filters.placa?.trim()) {
    params.plate = filters.placa.trim();
  }

  if (filters.fechaDesde) {
    params.fechaDesde = normDate(filters.fechaDesde);
  }

  if (filters.fechaHasta) {
    params.fechaHasta = normDate(filters.fechaHasta);
  }

  await store.enlistmentFetchList(params);
}



function normDate(v: any): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v.slice(0, 10);
  const d = new Date(v);
  if (isNaN(+d)) return undefined;
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, "0"),
    dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function normTime(v: any): string | undefined {
  if (!v) return undefined;
  try {
    if (v instanceof Date) {
      const hh = String(v.getHours()).padStart(2, "0");
      const mm = String(v.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
    const m = String(v).match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      const hh = String(m[1]).padStart(2, "0");
      return `${hh}:${m[2]}`;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function toInt(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function clearFilters() {
  filters.mantenimientoId = "";
  filters.placa = ""; // 👈 importante
  refresh();
}

function toIntOrUndef(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function clean<T extends Record<string, any>>(obj: T) {
  const out: any = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === "" || v === null || v === undefined) return;
    out[k] = v;
  });
  return out;
}

function openCreate() {
  //clearFormForNew();
  //Object.assign(form, { mantenimientoId: "" });
  form.placa = "";
  form.fecha = null;
  form.hora = null;
  form.tipoIdentificacion = "";
  form.numeroIdentificacion = "";
  form.nombresResponsable = "";
  form.tipoIdentificacionConductor = "";
  form.numeroIdentificacionConductor = "";
  form.nombresConductor = "";
  form.detalleActividades = "";
  
  // IMPORTANTE: Precaragar TODAS las actividades automáticamente
  form.actividades = activitiesWithCheck.value.map(a => a.id);

  dlg.visible = true;
  ensureMaintenances();

}

async function save() {
  const payload: any = clean({
    // opcionales para tu UI/flujo interno
    placa: form.placa?.trim() || undefined,
    fecha: normDate(form.fecha),
    hora: normTime(form.hora),

    // Responsable
    tipoIdentificacion: toInt(form.tipoIdentificacion),
    numeroIdentificacion:
      form.numeroIdentificacion?.toString().replace(/\D+/g, "") || undefined,
    nombresResponsable: form.nombresResponsable?.trim() || undefined,

    // Conductor (NUEVO)
    tipoIdentificacionConductor: toInt(form.tipoIdentificacionConductor),
    numeroIdentificacionConductor:
      form.numeroIdentificacionConductor?.toString().replace(/\D+/g, "") ||
      undefined,
    nombresConductor: form.nombresConductor?.trim() || undefined,

    // Alistamiento
    detalleActividades: form.detalleActividades?.trim() || undefined,
    actividades: Array.isArray(form.actividades)
      ? form.actividades.map(Number)
      : undefined,
  });

  // Requeridos reales para guardar-alistamiento
  const req = [
    "tipoIdentificacion",
    "numeroIdentificacion",
    "nombresResponsable",
    "tipoIdentificacionConductor",
    "numeroIdentificacionConductor",
    "nombresConductor",
    "detalleActividades",
    "actividades",
  ];
  for (const k of req) {
    if (!payload[k] || (Array.isArray(payload[k]) && payload[k].length === 0)) {
      alert(`Falta completar: ${k}`);
      return;
    }
  }

  saving.value = true;

  try {
    if (selectedFile.value) {
      await store.createEnlistmentWithProgram({
        maintenancePayload: payload,
        file: selectedFile.value,
      });
    } else {
      await store.enlistmentCreate(payload);
    }
    dlg.visible = false;
    
    // ✅ Limpiar el formulario pero mantener actividades precargadas
    clearFormForNew();

    toast.add({
      severity: "success",
      summary: "Alistamiento creado",
      detail: "Se guardó correctamente.",
      life: 2500,
    });
    await refresh();
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "No se pudo crear el alistamiento";
    toast.add({
      severity: "error",
      summary: "Error al crear",
      detail: msg,
      life: 4500,
    });
  } finally {
    saving.value = false;
  }

}

function formatMaintLabel(m: any) {
  const placa = (m?.placa || "").toString().toUpperCase();
  const tipo = m?.tipoId ?? "-";
  return `${placa || "(sin placa)"} — Tipo ${tipo}`;
}

async function ensureMaintenances() {
  await store.maintenanceFetchList({ page: 1, limit: 100, tipoId: 3 });
}

const enlistmentOptsLoading = ref(false);
const hasEnlistment = ref(new Set<string>());

const enlistmentMaintenanceOpts = computed(() => {
  const maints = store.maintenanceList.items || [];
  return maints
    .filter((m: any) => hasEnlistment.value.has(String(m._id)))
    .map((m: any) => ({ label: formatMaintLabel(m), value: m._id }));
});

async function ensureEnlistmentOpts() {
  if (!store.maintenanceList.items?.length) {
    await store.maintenanceFetchList({ page: 1, limit: 200 });
  }
  enlistmentOptsLoading.value = true;
  try {
    for (const m of store.maintenanceList.items) {
      const id = String(m._id);
      if (hasEnlistment.value.has(id)) continue;
      try {
        const { data } = await MaintenanceserviceApi.viewEnlistment({
          mantenimientoId: id,
        });
        if (data && (data._id || data?.mantenimientoId))
          hasEnlistment.value.add(id);
      } catch {
        /* si no existe, ignorar */
      }
    }
  } finally {
    enlistmentOptsLoading.value = false;
  }
}

function onFilterPick(val: any) {
  const id =
    typeof val === "object"
      ? val?._id || val?.value || val?.id || ""
      : val || "";
  filters.mantenimientoId = String(id);
  refresh();
}

function onPickMaintenance(id: string | number | null) {
  if (!id) return;
  const m = store.maintenanceList.items.find(
    (x: any) => String(x._id) === String(id)
  );
  if (m) {
    form.placa = m.placa || "";
  }
}

onMounted(async () => {
  // traer actividades (sigue siendo útil)
  //await store.enlistmentFetchActivities();
  await store.enlistmentFetchActivities();
  form.actividades = activitiesWithCheck.value.map(a => a.id);

  // traer la lista de alistamientos **al montar** (sin filtros)
  await store.enlistmentFetchList();

  // logs útiles para debug — podés borrar después
  console.log("store.enlistment.activities ->", (store.enlistment.activities));
  console.log("store.enlistmentList.items ->",JSON.stringify(store.enlistmentList.items));
});
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

/* =====================================
   TABLA ACTIVIDADES – MODERNA SUAVE
   ===================================== */
.activities-table {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(13, 110, 253, 0.12);
}

/* Header */
.activities-table :deep(.p-datatable-thead > tr > th) {
  background: linear-gradient(
    135deg,
    #e7f1ff,
    #dbeafe
  );
  color: #1e3a8a !important;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.75rem;
  border: none;
}

/* Redondeo SOLO arriba */
.activities-table :deep(.p-datatable-thead > tr > th:first-child) {
  border-top-left-radius: 12px;
}
.activities-table :deep(.p-datatable-thead > tr > th:last-child) {
  border-top-right-radius: 12px;
}

/* Texto header (forzado) */
.activities-table :deep(.p-datatable-thead span),
.activities-table :deep(.p-datatable-thead div) {
  color: #1e3a8a !important;
}

/* Body */
.activities-table :deep(.p-datatable-tbody > tr > td) {
  background: #ffffff;
  padding: 0.7rem;
  font-size: 0.9rem;
}

/* Hover sutil */
.activities-table :deep(.p-datatable-tbody > tr:hover) {
  background: #f8fbff;
}

/* Checkbox centrado */
.activities-table :deep(.p-datatable-tbody > tr > td:first-child) {
  text-align: center;
}

/* Quitar líneas duras */
.activities-table :deep(.p-datatable-tbody > tr > td) {
  border-bottom: 1px solid #eef2ff;
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
:deep(.p-button.btn-dark-green:hover) {
  background: #15803d;
  border-color: #15803d;
}
:deep(.p-button.btn-blue) {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
:deep(.p-button.btn-blue:hover) {
  background: #1d4ed8;
  border-color: #1d4ed8;
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

:deep(.p-checkbox-box.p-highlight),
:deep(.p-checkbox.p-checkbox-checked .p-checkbox-box),
:deep(.p-checkbox.p-highlight .p-checkbox-box) {
  background: #16a34a !important;
  border-color: #16a34a !important;
}
:deep(.p-checkbox .p-checkbox-icon) {
  color: #fff !important;
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

.is-view-mode :deep(.p-inputtext),
.is-view-mode :deep(.p-dropdown),
.is-view-mode :deep(.p-calendar .p-inputtext),
.is-view-mode :deep(.p-checkbox-box),
.is-view-mode :deep(textarea),
.is-view-mode :deep(input),
.is-view-mode :deep(select) {
  filter: grayscale(100%);
  opacity: 0.75;
  pointer-events: none;
}

.is-view-mode :deep(.p-checkbox-box.p-highlight),
.is-view-mode :deep(.p-checkbox.p-checkbox-checked .p-checkbox-box),
.is-view-mode :deep(.p-checkbox.p-highlight .p-checkbox-box) {
  background: #9ca3af !important;
  border-color: #9ca3af !important;
}
</style>
