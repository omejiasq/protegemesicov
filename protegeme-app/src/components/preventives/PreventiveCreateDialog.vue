<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    :header="isPlanned ? 'Planear mantenimiento preventivo' : 'Registrar mantenimiento preventivo'"
    class="w-11 md:w-8 lg:w-7"
    :closable="!saving"
  >
    <!-- MODO: Ejecutado ya / Planear para después -->
    <div class="mode-toggle mb-4">
      <button
        :class="['mode-btn', !isPlanned ? 'active-green' : '']"
        @click="isPlanned = false"
        type="button"
      >
        <i class="pi pi-check-circle" /> Ya ejecutado
      </button>
      <button
        :class="['mode-btn', isPlanned ? 'active-blue' : '']"
        @click="isPlanned = true"
        type="button"
      >
        <i class="pi pi-calendar" /> Planear para fecha futura
      </button>
    </div>

    <div v-if="isPlanned" class="info-banner-blue mb-3">
      <i class="pi pi-info-circle" />
      Este mantenimiento se guardará como <b>planeado</b>. Solo se enviará a Supertransporte
      cuando sea marcado como ejecutado.
    </div>

    <div class="formgrid grid">

      <!-- SELECTOR DE PROVEEDOR -->
      <div class="field col-12" v-if="proveedores.length">
        <label>Proveedor (opcional — autocompletar datos del centro)</label>
        <select class="w-full p-inputtext" v-model="selectedProveedorId" @change="onProveedorChange">
          <option value="">— Seleccionar proveedor —</option>
          <option v-for="p in proveedores" :key="p._id" :value="p._id">
            {{ p.razon_social }} (NIT: {{ p.nit }})
          </option>
        </select>
      </div>

      <!-- FILA 1 -->
      <div class="field col-12 sm:col-4">
        <label>Placa</label>
        <InputText
          v-model="form.placa"
          class="w-full"
          maxlength="6"
          placeholder="ABC123"
          :disabled="saving"
          @keyup.enter="buscarVehiculoPorPlaca"
        />
      </div>

      <div class="field col-12 sm:col-4">
        
        <InputDate v-model="form.fecha" :disabled="saving" />
      </div>

      <div class="field col-12 sm:col-4">
        <InputHour v-model="form.hora" label="Hora" :disabled="saving" />
      </div>

      <!-- FILA 2 -->
      <div class="field col-12 sm:col-4">
        <label>NIT - Centro especializado</label>
        <InputText
          v-model="form.nit"
          class="w-full"
          :disabled="saving"
          inputmode="numeric"
          maxlength="15"
          placeholder="Ej: 900416316"
          @input="form.nit = form.nit.replace(/\D/g, '')"
        />
      </div>

      <div class="field col-12 sm:col-8">
        <label>Razón Social - Centro especializado</label>
        <InputText v-model="form.razonSocial" class="w-full" :disabled="saving" />
      </div>

      <!-- FILA 3 -->
      <div class="field col-12 md:col-4">
        <label>Tipo identificación – Ingeniero mecánico</label>
        <UiDropdownBasic
          v-model="form.tipoIdentificacion"
          :options="documentTypeOptions"
          class="w-full"
          :disabled="saving"
        />
      </div>

      <div class="field col-12 md:col-4">
        <label>Número identificación – Ingeniero mecánico</label>
        <InputText v-model="form.numeroIdentificacion" class="w-full" :disabled="saving" />
      </div>

      <div class="field col-12 md:col-4">
        <label>Nombres y apellidos – Ingeniero mecánico</label>
        <InputText v-model="form.nombresResponsable" class="w-full" :disabled="saving" />
      </div>

      <!-- FILA FINAL -->
      <div class="field col-12">
        <label>Detalle de actividades</label>
        <Textarea
          v-model="form.detalleActividades"
          rows="3"
          class="w-full"
          :disabled="saving"
        />
      </div>
    </div>

    <div class="info-banner-gray">
      <i class="pi pi-image" />
      La foto de evidencia del taller se sube <b>después</b> de guardar el mantenimiento,
      desde el listado usando el botón <b>"Subir evidencia"</b>.
    </div>

    <template #footer>
      <Button
        label="Cancelar"
        class="p-button-text"
        :disabled="saving"
        @click="closeDialog"
      />
      <Button
        :label="isPlanned ? 'Guardar como planeado' : 'Crear'"
        :icon="isPlanned ? 'pi pi-calendar' : 'pi pi-save'"
        :class="isPlanned ? 'btn-blue' : 'btn-dark-green'"
        :loading="saving"
        :disabled="saving"
        @click="onSave"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { reactive, computed, watch, ref, onMounted } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import UiDropdownBasic from "../ui/Dropdown.vue";
import InputDate from "../../components/ui/InputDate.vue";
import InputHour from "../../components/ui/InputHour.vue";
import { useMaintenanceStore } from "../../stores/maintenanceStore";
import { MaintenanceserviceApi } from "../../api/maintenance.service";

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits(["update:visible", "save"]);

const saving = ref(false);
const analyzing = ref(false);
const isPlanned = ref(false);
const showAiPanel = ref(false);
const store = useMaintenanceStore();
const proveedores = ref<any[]>([]);
const selectedProveedorId = ref("");
const workshopFormats = ref<any[]>([]);
const selectedFormatId = ref("");
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const aiResult = ref<any>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const dialogVisible = computed({
  get: () => props.visible,
  set: (val: boolean) => emit("update:visible", val),
});

function onProveedorChange() {
  if (!selectedProveedorId.value) return;
  const p = proveedores.value.find((x) => x._id === selectedProveedorId.value);
  if (!p) return;
  form.nit = p.nit ?? "";
  form.razonSocial = p.razon_social ?? "";
  if (p.tipo_id_mecanico) form.tipoIdentificacion = Number(p.tipo_id_mecanico);
  form.numeroIdentificacion = p.num_id_mecanico ?? "";
  form.nombresResponsable = p.nombre_mecanico ?? "";
}

function validateForm(): boolean {
  const required: { field: keyof typeof form; label: string }[] = [
    { field: "placa", label: "Placa" },
    { field: "fecha", label: "Fecha" },
    { field: "hora", label: "Hora" },
    { field: "nit", label: "NIT" },
    { field: "razonSocial", label: "Razón Social" },
    { field: "tipoIdentificacion", label: "Tipo de identificación" },
    { field: "numeroIdentificacion", label: "Número de identificación" },
    { field: "nombresResponsable", label: "Nombres y apellidos" },
    { field: "detalleActividades", label: "Detalle de actividades" },
  ];
  for (const { field, label } of required) {
    const val = form[field];
    if (val === null || val === undefined || String(val).trim() === "") {
      alert(`El campo "${label}" es obligatorio`);
      return false;
    }
  }
  return true;
}

async function buscarVehiculoPorPlaca() {
  if (!form.placa) return;
  const placa = form.placa.trim().toUpperCase();
  form.placa = placa;
  try {
    const token = localStorage.getItem("token2");
    const response = await fetch(
      `https://sicov.protegeme.com.co/api/vehicles/vehicles/plate/${placa}`,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    if (!response.ok) throw new Error("Vehículo no encontrado");
    const vehiculo = await response.json();
    if (!selectedProveedorId.value) {
      form.nit = vehiculo?.enterprise?.specialized_center_document_number || "";
      form.razonSocial = vehiculo?.enterprise?.specialized_center_name || "";
      const docType = vehiculo?.enterprise?.mechanic_document_type;
      form.tipoIdentificacion = docType !== undefined && docType !== null ? Number(docType) : null;
      form.numeroIdentificacion = vehiculo?.enterprise?.mechanic_document_number || "";
      form.nombresResponsable = vehiculo?.enterprise?.mechanic_name || "";
    }
  } catch {
    if (!selectedProveedorId.value) {
      form.nit = "";
      form.razonSocial = "";
      form.tipoIdentificacion = null;
      form.numeroIdentificacion = "";
      form.nombresResponsable = "";
    }
  }
}

// ── CARGA DE ARCHIVO ──────────────────────────────────
function triggerFileInput() {
  fileInput.value?.click();
}

function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) setFile(file);
}

function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0];
  if (file) setFile(file);
}

function setFile(file: File) {
  if (file.size > 5 * 1024 * 1024) {
    alert("El archivo no puede superar 5 MB");
    return;
  }
  selectedFile.value = file;
  aiResult.value = null;
  if (file.type.startsWith("image/")) {
    previewUrl.value = URL.createObjectURL(file);
  } else {
    previewUrl.value = null;
  }
}

function removeFile() {
  selectedFile.value = null;
  previewUrl.value = null;
  aiResult.value = null;
  if (fileInput.value) fileInput.value.value = "";
}

// ── ANÁLISIS CON IA ───────────────────────────────────
async function analyzeWithAI() {
  if (!selectedFile.value) return;
  analyzing.value = true;
  try {
    const base64 = await fileToBase64(selectedFile.value);
    const mediaType = selectedFile.value.type as "image/jpeg" | "image/png";
    const { data } = await MaintenanceserviceApi.analyzeMaintenanceDocument({
      imageBase64: base64,
      mediaType,
      workshop_format_id: selectedFormatId.value || undefined,
    });

    const extracted = data?.analysis?.datos_extraidos ?? {};
    aiResult.value = {
      confianza: extracted.confianza ?? "baja",
      alertas: data?.alertas ?? [],
    };

    // Auto-completar campos si vienen datos
    if (extracted.placa && !form.placa) form.placa = extracted.placa;
    if (extracted.observaciones && !form.detalleActividades)
      form.detalleActividades = extracted.observaciones;
    if (extracted.fecha && !form.fecha) {
      const d = new Date(extracted.fecha);
      if (!isNaN(d.getTime())) form.fecha = d;
    }
  } catch (err) {
    alert("Error al analizar el documento con IA. Intente de nuevo.");
  } finally {
    analyzing.value = false;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Quitar el prefijo "data:image/jpeg;base64,"
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────────────
const documentTypeOptions = [
  { label: "Cédula de ciudadanía", value: 1 },
  { label: "Cédula de ciudadanía digital", value: 2 },
  { label: "Tarjeta de identidad", value: 3 },
  { label: "Registro civil", value: 4 },
  { label: "Cédula de extranjería", value: 5 },
  { label: "Pasaporte", value: 6 },
  { label: "Permiso Especial de Permanencia (PEP)", value: 7 },
  { label: "Documento de Identificación Extranjero (DIE)", value: 8 },
  { label: "Permiso por Protección Temporal (PPT)", value: 9 },
];

const emptyForm = () => ({
  placa: "",
  fecha: null as Date | null,
  hora: "",
  nit: "",
  razonSocial: "",
  tipoIdentificacion: null as number | null,
  numeroIdentificacion: "",
  nombresResponsable: "",
  detalleActividades: "",
});

const form = reactive(emptyForm());

function resetForm() {
  Object.assign(form, emptyForm());
  selectedProveedorId.value = "";
  selectedFormatId.value = "";
  selectedFile.value = null;
  previewUrl.value = null;
  aiResult.value = null;
  isPlanned.value = false;
  showAiPanel.value = false;
}

function closeDialog() {
  dialogVisible.value = false;
  resetForm();
}

async function onSave() {
  if (!validateForm()) return;
  saving.value = true;
  await emit("save", { ...form, isPlanned: isPlanned.value });
  saving.value = false;
}

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      try {
        proveedores.value = await store.proveedoresFetch();
        const { data } = await MaintenanceserviceApi.listWorkshopFormats();
        workshopFormats.value = Array.isArray(data) ? data : [];
      } catch {
        proveedores.value = [];
        workshopFormats.value = [];
      }
    } else {
      resetForm();
    }
  }
);

onMounted(async () => {
  try {
    proveedores.value = await store.proveedoresFetch();
    const { data } = await MaintenanceserviceApi.listWorkshopFormats();
    workshopFormats.value = Array.isArray(data) ? data : [];
  } catch {
    proveedores.value = [];
  }
});
</script>

<style scoped>
/* ── Modo toggle ──────────────────────────────── */
.mode-toggle {
  display: flex;
  gap: 0.5rem;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}
.mode-btn {
  flex: 1;
  padding: 0.6rem 1rem;
  border: none;
  background: #f9fafb;
  color: #374151;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  transition: background 0.15s;
}
.mode-btn.active-green {
  background: #16a34a;
  color: #fff;
  font-weight: 600;
}
.mode-btn.active-blue {
  background: #2563eb;
  color: #fff;
  font-weight: 600;
}

/* ── Banner gris info ────────────────────────── */
.info-banner-gray {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.6rem 1rem;
  color: #6b7280;
  font-size: 0.85rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

/* ── Banner info ─────────────────────────────── */
.info-banner-blue {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 0.6rem 1rem;
  color: #1e40af;
  font-size: 0.88rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

/* ── Sección IA ───────────────────────────────── */
.ai-section {
  margin-top: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
}
.ai-section-header {
  padding: 0.7rem 1rem;
  background: #f8faff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-weight: 600;
  color: #1e40af;
  font-size: 0.92rem;
  user-select: none;
}
.ai-section-header:hover { background: #eff6ff; }
.ai-section-body {
  padding: 1rem;
  background: #fff;
}
.ai-hint {
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
}

/* ── Upload zone ─────────────────────────────── */
.upload-zone {
  border: 2px dashed #93c5fd;
  border-radius: 10px;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  background: #f0f9ff;
  transition: border-color 0.2s;
  position: relative;
  min-height: 100px;
}
.upload-zone:hover { border-color: #3b82f6; }
.upload-icon { font-size: 2rem; color: #60a5fa; margin-bottom: 0.5rem; display: block; }
.upload-hint { font-size: 0.78rem; color: #9ca3af; }
.preview-container { position: relative; display: inline-block; }
.preview-img { max-height: 180px; max-width: 100%; border-radius: 8px; }
.remove-btn {
  position: absolute;
  top: -8px; right: -8px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 24px; height: 24px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem;
}

/* ── Resultado IA ────────────────────────────── */
.ai-actions {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}
.btn-ai {
  background: #7c3aed !important;
  border-color: #7c3aed !important;
  color: #fff !important;
}
.analyzing-text { font-size: 0.85rem; color: #7c3aed; }
.ai-result {
  margin-top: 0.75rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 0.75rem;
}
.ai-result-header {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}
.confianza-badge {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
}
.confianza-alta { background: #dcfce7; color: #166534; }
.confianza-media { background: #fef9c3; color: #854d0e; }
.confianza-baja { background: #fee2e2; color: #991b1b; }
.alerta-badge {
  font-size: 0.8rem;
  background: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
  border-radius: 12px;
  padding: 0.2rem 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.alertas-list { margin-bottom: 0.5rem; }
.alerta-item {
  font-size: 0.83rem;
  color: #c2410c;
  padding: 0.25rem 0;
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
}
.ai-extracted-note { font-size: 0.82rem; color: #15803d; margin: 0; }

/* ── Botones paleta ──────────────────────────── */
:deep(.p-button.btn-dark-green) {
  background: #16a34a; border-color: #16a34a; color: #fff;
}
:deep(.p-button.btn-blue) {
  background: #2563eb; border-color: #2563eb; color: #fff;
}
</style>
