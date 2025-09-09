<template>
  <div class="grid gap-3">
    <!-- KPIs -->
    <div class="col-12">
      <div class="grid">

        <div class="col-12 md:col-4">
          <div
            class="surface-0 kpi-card p-3 border-round shadow-1 flex align-items-center justify-content-between"
          >
            <div>
              <div class="text-900 text-sm is-green">Preventivos activos</div>
              <div class="text-900 text-3xl font-bold">
                {{ kpi.preventiveOpenLabel }}
              </div>
            </div>
            <span class="kpi-icon is-green"><i class="pi pi-shield"></i></span>  
          </div>
        </div>

        <div class="col-12 md:col-4">
          <div
            class="surface-0 kpi-card is-amber p-3 border-round shadow-1 flex align-items-center justify-content-between"
          >
            <div>
              <div class="text-900 text-sm">Correctivos activos</div>
              <div class="text-900 text-3xl font-bold">
                {{ kpi.correctiveOpenLabel }}
              </div>
            </div>
            <span class="kpi-icon is-amber"><i class="pi pi-wrench"></i></span>
          </div>
        </div>

        <div class="col-12 md:col-4">
          <div
            class="surface-0 kpi-card is-purple p-3 border-round shadow-1 flex align-items-center justify-content-between"
          >
            <div>
              <div class="text-900 text-sm">Alistamientos activos</div>
              <div class="text-900 text-3xl font-bold">
                {{ kpi.enlistmentsLabel }}
              </div>
            </div>
            <span class="kpi-icon is-purple"><i class="pi pi-list"></i></span> 
          </div>
        </div>
      </div>
    </div>

    <!-- Accesos rápidos -->
    <div class="col-12">
      <div class="surface-0 kpi-card p-3 border-round shadow-1">
        <div class="flex align-items-center justify-content-between mb-3">
          <h3 class="m-0 text-lg text-900">Accesos rápidos</h3>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            class="btn-blue"
            label="Nueva Transacción"
            severity="success"
            icon="pi pi-wrench"
            @click="goNew('maintenance')"
          />
          <Button
            class="btn-blue"
            label="Nuevo Preventivo"
            icon="pi pi-tools"
            severity="success"
            @click="goNew('corrective')"
          />
          <Button
            class="btn-blue"
            label="Nuevo Correctivo"
            icon="pi pi-verified"
            severity="success"
            @click="goNew('enlistment')"
          />
          <Button
            class="btn-blue"
            label="Nuevo Alistamiento"
            icon="pi pi-verified"
            severity="success"
            @click="goNew('enlistment')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, computed } from "vue";
import Button from "primevue/button";
import { useRouter } from "vue-router";
import { useMaintenanceStore } from "../../stores/maintenanceStore";
import { MaintenanceserviceApi } from "../../api/maintenance.service";

const counts = reactive({
  preventive: null as number | null,
  corrective: null as number | null,
  enlistment: null as number | null,
});

const router = useRouter();
const store = useMaintenanceStore();

const state = reactive({
  loadingKPIs: false,
});

// Cargamos sólo lo que hoy soporta tu service: Programas (list)
async function loadKPIs() {
  state.loadingKPIs = true;
  try {
    // Si ya usabas esto, lo dejamos
    await store.programsFetch();

    // Traemos sólo el total de activos por tipo
    const q = { estado: true, page: 1, numero_items: 1 };

    const [p, c, e] = await Promise.all([
      MaintenanceserviceApi.listPreventives(q),
      MaintenanceserviceApi.listCorrectives(q),
      MaintenanceserviceApi.listEnlistments(q),
    ]);

    const getTotal = (res: any) =>
      typeof res?.data?.total === "number"
        ? res.data.total
        : Array.isArray(res?.data)
        ? res.data.length
        : Array.isArray(res?.data?.items)
        ? res.data.items.length
        : 0;

    counts.preventive = getTotal(p);
    counts.corrective = getTotal(c);
    counts.enlistment = getTotal(e);
  } finally {
    state.loadingKPIs = false;
  }
}


const kpi = computed(() => {
  const programs = store.programs.items?.length ?? 0;

  const preventiveOpenLabel =
    counts.preventive == null ? "—" : String(counts.preventive);

  const correctiveOpenLabel =
    counts.corrective == null ? "—" : String(counts.corrective);

  const enlistmentsLabel =
    counts.enlistment == null ? "—" : String(counts.enlistment);

  return {
    programs,
    preventiveOpenLabel,
    correctiveOpenLabel,
    enlistmentsLabel,
  };
});

function goNew(kind: "preventive" | "corrective" | "enlistment" | "maintenance") {
  // Ajustá rutas si las tenés con nombre distinto
  if (kind === "maintenance")
    router.push({ path: "/maintenance/maintenance" });
  if (kind === "preventive")
    router.push({ path: "/maintenance/preventive" });
  if (kind === "corrective")
    router.push({ path: "/maintenance/corrective" });
  if (kind === "enlistment")
    router.push({ path: "/maintenance/enlistment" });
}

onMounted(loadKPIs);
</script>

<style scoped>
/* Mantiene tarjetas blancas (por si no lo tenías) */
.panel-white {
  background: #ffffff !important;
  color: #ffffff !important;
  border: 1px solid rgba(17,17,17,0.06);
}

/* ===== KPI tipo Bolt ===== */
.kpi-card { /* contenedor del KPI */
  background: #ffffff !important;
  color: #ffffff !important;
  border: 1px solid rgba(17,17,17,0.06);
}
.kpi-card .kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex: 0 0 44px;
}
.kpi-card .kpi-icon.is-blue   { background: #3b82f6; color: #ffffff; } /* azul */
.kpi-card .kpi-icon.is-green  { background: #10b981; color: #ffffff; } /* verde */
.kpi-card .kpi-icon.is-amber  { background: #f59e0b; color: #ffffff; } /* ámbar */
.kpi-card .kpi-icon.is-purple { background: #8b5cf6; color: #ffffff; } /* morado */

/* opcional si querés usar clases de texto dentro del KPI */
.kpi-card .kpi-value { font-weight: 700; font-size: 1.5rem; line-height: 1; color: #ffffff; }
.kpi-card .kpi-label { font-size: .875rem; color: #6b7280; }

/* ===== Botones de accesos rápidos ===== */
/* Oscuros → texto blanco */
:deep(.p-button.btn-dark-green)  { background:#16a34a; border-color:#16a34a; color:#ffffff; }
:deep(.p-button.btn-dark-green:hover)  { background:#15803d; border-color:#15803d; }

:deep(.p-button.btn-dark-purple) { background:#7c3aed; border-color:#7c3aed; color:#ffffff; }
:deep(.p-button.btn-dark-purple:hover) { background:#6d28d9; border-color:#6d28d9; }

:deep(.p-button.btn-blue)        { background:#2563eb; border-color:#2563eb; color:#ffffff; }
:deep(.p-button.btn-blue:hover)  { background:#1d4ed8; border-color:#1d4ed8; }

/* Verde claro → texto negro */
:deep(.p-button.btn-light-green) { background:#a7f3d0; border-color:#a7f3d0; color:#ffffff; }
:deep(.p-button.btn-light-green:hover) { background:#86efac; border-color:#86efac; }

/* Neutro (ghost) → fondo claro, texto negro */
:deep(.p-button.btn-ghost)       { background:#eef2f7; border-color:#eef2f7; color:#ffffff; }
:deep(.p-button.btn-ghost:hover) { background:#e5e7eb; border-color:#e5e7eb; }

.kpi-card {
  background: #ffffff !important;
  border: 1px solid rgba(17,17,17,0.06);
  color: #111111 !important;               /* fallback general */
}

/* Sobrescribe cualquier regla que ponga blanco al texto */
.kpi-card :where(h1,h2,h3,h4,h5,h6,p,span,strong,small,div,.text-900,.text-700,.p-card-title,.p-card-subtitle) {
  color: #111111 !important;
}

/* Etiquetas (subtítulos) un poco más tenues */
.kpi-card .kpi-label { color: #6b7280 !important; }

/* Mantener el ícono en su badge con color blanco */
.kpi-card .kpi-icon,
.kpi-card .kpi-icon i {
  color: #ffffff !important;
}

.btn-green :deep(.p-button){
  background: var(--green-600, #16a34a) !important;
  border-color: var(--green-600, #16a34a) !important;
  color: #fff !important;
}
.btn-green :deep(.p-button:hover){
  background: var(--green-700, #15803d) !important;
  border-color: var(--green-700, #15803d) !important;
  color: #fff !important;
}
.btn-green :deep(.p-button:focus){
  box-shadow: 0 0 0 .2rem rgba(16,185,129,.35) !important;
}
.btn-green :deep(.p-button[aria-disabled="true"]),
.btn-green :deep(.p-button:disabled){
  opacity: .65;
}
</style>
