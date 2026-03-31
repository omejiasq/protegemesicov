<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    header="Subir evidencia del mantenimiento"
    style="width: min(95vw, 680px)"
    :closable="!analyzing && !saving"
  >
    <div v-if="maintenance" class="evidence-body">

      <!-- Info del mantenimiento -->
      <div class="maint-info-bar">
        <span class="placa-tag">{{ maintenance.Placa }}</span>
        <span>{{ maintenance.Taller }}</span>
        <span class="date-tag">{{ maintenance.Fecha_ejecutada }}</span>
      </div>

      <!-- Selector de formato del taller -->
      <div class="field mb-3" v-if="workshopFormats.length">
        <label>Formato del taller <span class="hint">(opcional — mejora la extracción)</span></label>
        <select class="w-full p-inputtext" v-model="selectedFormatId">
          <option value="">— Formato genérico —</option>
          <option v-for="f in workshopFormats" :key="f._id" :value="f._id">
            {{ f.nombre }}
          </option>
        </select>
      </div>

      <!-- Upload zone -->
      <div class="upload-zone" @click="triggerFileInput" @dragover.prevent @drop.prevent="onDrop">
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          style="display:none"
          @change="onFileSelected"
        />
        <div v-if="!previewUrl" class="upload-placeholder">
          <i class="pi pi-upload upload-icon" />
          <p>Sube la foto del formato de inspección o la orden de servicio del taller</p>
          <span class="upload-hint">JPG, PNG o PDF · máx 5 MB · Recomendado: escanear con CamScanner</span>
        </div>
        <div v-else class="preview-container">
          <img :src="previewUrl" class="preview-img" alt="Vista previa" />
          <button class="remove-btn" type="button" @click.stop="removeFile">
            <i class="pi pi-times" />
          </button>
        </div>
      </div>

      <!-- Botón analizar -->
      <div class="analyze-row">
        <Button
          label="Analizar con IA"
          icon="pi pi-sparkles"
          class="btn-ai"
          :loading="analyzing"
          :disabled="!selectedFile || analyzing"
          @click="analyzeWithAI"
        />
        <span v-if="analyzing" class="analyzing-text">Claude está analizando el documento...</span>
      </div>

      <!-- Resultado IA -->
      <div v-if="aiResult" class="ai-result-card">
        <div class="ai-result-header">
          <h4>Hallazgos del análisis</h4>
          <span class="confianza-badge" :class="`confianza-${aiResult.confianza}`">
            Confianza: {{ aiResult.confianza }}
          </span>
        </div>

        <!-- Alertas de fallas recurrentes -->
        <div v-if="aiResult.alertas?.length" class="alertas-section">
          <div class="alertas-title">
            <i class="pi pi-exclamation-triangle" />
            Fallas recurrentes detectadas
          </div>
          <div v-for="(a, i) in aiResult.alertas" :key="i" class="alerta-item">
            {{ a }}
          </div>
        </div>

        <!-- Campos extraídos -->
        <div class="extracted-fields">
          <div v-if="aiResult.placa" class="field-row">
            <span class="field-key">Placa:</span>
            <span class="field-val">{{ aiResult.placa }}</span>
          </div>
          <div v-if="aiResult.fecha" class="field-row">
            <span class="field-key">Fecha del documento:</span>
            <span class="field-val">{{ aiResult.fecha }}</span>
          </div>
          <div v-if="aiResult.observaciones" class="field-row col">
            <span class="field-key">Observaciones / Fallas:</span>
            <span class="field-val observaciones">{{ aiResult.observaciones }}</span>
          </div>
          <div v-if="aiResult.firma_inspector" class="field-row">
            <span class="field-key">Inspector:</span>
            <span class="field-val">{{ aiResult.firma_inspector }}</span>
          </div>
        </div>

        <!-- Notas adicionales del usuario -->
        <div class="field mt-3">
          <label>Notas adicionales (opcional)</label>
          <Textarea v-model="userNotes" rows="2" class="w-full" placeholder="Comentarios adicionales sobre este mantenimiento..." />
        </div>
      </div>

      <!-- Sin análisis: solo notas -->
      <div v-if="!aiResult && selectedFile" class="field mt-3">
        <label>Notas (opcional)</label>
        <Textarea v-model="userNotes" rows="2" class="w-full" placeholder="Observaciones sobre este mantenimiento..." />
      </div>

    </div>

    <template #footer>
      <Button label="Cancelar" class="p-button-text" :disabled="analyzing || saving" @click="closeDialog" />
      <Button
        label="Guardar evidencia"
        icon="pi pi-save"
        class="btn-dark-green"
        :loading="saving"
        :disabled="!selectedFile || saving"
        @click="onSave"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Textarea from "primevue/textarea";
import { MaintenanceserviceApi } from "../../api/maintenance.service";

const props = defineProps<{
  visible: boolean;
  maintenance: any | null; // fila del grid con _id, Placa, Taller, etc.
}>();
const emit = defineEmits(["update:visible", "saved"]);

const analyzing = ref(false);
const saving = ref(false);
const workshopFormats = ref<any[]>([]);
const selectedFormatId = ref("");
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const aiResult = ref<any>(null);
const userNotes = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit("update:visible", val),
});

// ── Carga formatos al abrir ───────────────────────────
watch(() => props.visible, async (val) => {
  if (val) {
    try {
      const { data } = await MaintenanceserviceApi.listWorkshopFormats();
      workshopFormats.value = Array.isArray(data) ? data : [];
    } catch { workshopFormats.value = []; }
  } else {
    reset();
  }
});

// ── Manejo de archivo ─────────────────────────────────
function triggerFileInput() { fileInput.value?.click(); }

function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) setFile(file);
}

function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0];
  if (file) setFile(file);
}

function setFile(file: File) {
  if (file.size > 5 * 1024 * 1024) { alert("El archivo no puede superar 5 MB"); return; }
  selectedFile.value = file;
  aiResult.value = null;
  previewUrl.value = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
}

function removeFile() {
  selectedFile.value = null;
  previewUrl.value = null;
  aiResult.value = null;
  if (fileInput.value) fileInput.value.value = "";
}

// ── Análisis con IA ───────────────────────────────────
async function analyzeWithAI() {
  if (!selectedFile.value) return;
  analyzing.value = true;
  try {
    const base64 = await fileToBase64(selectedFile.value);
    const { data } = await MaintenanceserviceApi.analyzeMaintenanceDocument({
      imageBase64: base64,
      mediaType: selectedFile.value.type as "image/jpeg" | "image/png",
      workshop_format_id: selectedFormatId.value || undefined,
      preventive_id: props.maintenance?._id,
    });

    const extracted = data?.analysis?.datos_extraidos ?? {};
    aiResult.value = {
      confianza: extracted.confianza ?? "baja",
      placa: extracted.placa ?? null,
      fecha: extracted.fecha ?? null,
      observaciones: extracted.observaciones ?? null,
      firma_inspector: extracted.firma_inspector ?? null,
      alertas: data?.alertas ?? [],
    };
  } catch {
    alert("Error al analizar con IA. Intente de nuevo.");
  } finally {
    analyzing.value = false;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Guardar evidencia ─────────────────────────────────
async function onSave() {
  if (!selectedFile.value) return;
  saving.value = true;
  try {
    // 1. Si aún no se analizó, analizar automáticamente antes de guardar
    if (!aiResult.value) {
      await analyzeWithAI();
    }

    // 2. Subir el archivo físico al servidor (usa el endpoint existente de files)
    const { data: fileData } = await MaintenanceserviceApi.uploadFile(selectedFile.value);

    // 3. Guardar referencia en el mantenimiento preventivo
    await MaintenanceserviceApi.updatePreventive(props.maintenance._id, {
      evidencia_foto: fileData?.url ?? fileData?.path ?? null,
      notas_evidencia: userNotes.value || null,
    });

    emit("saved", { maintenance: props.maintenance, aiResult: aiResult.value });
    closeDialog();
  } catch {
    alert("Error al guardar la evidencia. Intente de nuevo.");
  } finally {
    saving.value = false;
  }
}

function reset() {
  selectedFormatId.value = "";
  selectedFile.value = null;
  previewUrl.value = null;
  aiResult.value = null;
  userNotes.value = "";
  if (fileInput.value) fileInput.value.value = "";
}

function closeDialog() {
  dialogVisible.value = false;
  reset();
}
</script>

<style scoped>
.evidence-body { display: flex; flex-direction: column; gap: 1rem; }

.maint-info-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.9rem;
  background: #f8faff;
  border: 1px solid #e0e7ff;
  border-radius: 8px;
  font-size: 0.88rem;
  color: #374151;
  flex-wrap: wrap;
}
.placa-tag {
  font-weight: 700;
  background: #1e40af;
  color: #fff;
  border-radius: 5px;
  padding: 0.15rem 0.55rem;
  font-size: 0.85rem;
}
.date-tag { color: #6b7280; margin-left: auto; }
.hint { color: #9ca3af; font-size: 0.78rem; font-weight: 400; }

/* Upload */
.upload-zone {
  border: 2px dashed #93c5fd;
  border-radius: 12px;
  padding: 2rem 1.5rem;
  text-align: center;
  cursor: pointer;
  background: #f0f9ff;
  transition: border-color 0.2s;
  position: relative;
}
.upload-zone:hover { border-color: #3b82f6; background: #e0f2fe; }
.upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.upload-icon { font-size: 2.5rem; color: #60a5fa; }
.upload-zone p { color: #374151; font-size: 0.92rem; margin: 0; max-width: 380px; }
.upload-hint { font-size: 0.78rem; color: #9ca3af; }
.preview-container { position: relative; display: inline-block; }
.preview-img { max-height: 200px; max-width: 100%; border-radius: 8px; }
.remove-btn {
  position: absolute; top: -8px; right: -8px;
  background: #ef4444; color: #fff; border: none;
  border-radius: 50%; width: 24px; height: 24px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem;
}

/* Botón IA */
.analyze-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.25rem;
}
.btn-ai { background: #7c3aed !important; border-color: #7c3aed !important; color: #fff !important; }
.analyzing-text { font-size: 0.85rem; color: #7c3aed; font-style: italic; }

/* Resultado IA */
.ai-result-card {
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
}
.ai-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.ai-result-header h4 { margin: 0; font-size: 0.95rem; font-weight: 700; color: #111; }
.confianza-badge {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 10px;
}
.confianza-alta { background: #dcfce7; color: #166534; }
.confianza-media { background: #fef9c3; color: #854d0e; }
.confianza-baja { background: #fee2e2; color: #991b1b; }

/* Alertas */
.alertas-section {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}
.alertas-title {
  font-weight: 700;
  color: #c2410c;
  font-size: 0.88rem;
  margin-bottom: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.alerta-item {
  font-size: 0.83rem;
  color: #9a3412;
  padding: 0.2rem 0;
  border-bottom: 1px solid #fed7aa;
}
.alerta-item:last-child { border-bottom: none; }

/* Campos extraídos */
.extracted-fields { display: flex; flex-direction: column; gap: 0.35rem; }
.field-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.87rem;
}
.field-row.col { flex-direction: column; gap: 0.2rem; }
.field-key { font-weight: 600; color: #374151; min-width: 160px; }
.field-val { color: #111; }
.field-val.observaciones {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

:deep(.p-button.btn-dark-green) { background: #16a34a; border-color: #16a34a; color: #fff; }
</style>
