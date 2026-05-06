<template>
  <div class="grid">
    <!-- ================= TOOLBAR ================= -->
    <div class="col-12 page-toolbar flex justify-between items-center">
      <h2 class="m-0">Gestión de Vehículos</h2>
      
      <Button
        label="Nuevo Vehículo"
        icon="pi pi-plus"
        class="p-button-success"
        @click="goToCreateVehicle"
      />
    </div>

    <!-- ================= GRID SECTION ================= -->
    <div class="col-12 page-section table-card">
      <!-- ================= BARRAS ACCIONES MASIVAS ================= -->
      <div v-if="inactiveSelected.length > 0" class="bulk-action-bar bulk-activate">
        <span class="bulk-info">
          <i class="pi pi-check-square" />
          {{ inactiveSelected.length }} vehículo(s) inactivo(s) seleccionado(s)
        </span>
        <Button
          label="Solicitar activación"
          icon="pi pi-send"
          class="p-button-success p-button-sm"
          @click="openBulkActivate"
        />
      </div>
      <div v-if="activeSelected.length > 0" class="bulk-action-bar bulk-deactivate">
        <span class="bulk-info bulk-info-red">
          <i class="pi pi-check-square" />
          {{ activeSelected.length }} vehículo(s) activo(s) seleccionado(s)
        </span>
        <Button
          label="Solicitar desactivación"
          icon="pi pi-send"
          class="p-button-danger p-button-sm"
          @click="openBulkDeactivate"
        />
      </div>

      <!-- ================= GRID SYNCFUSION ================= -->
      <ejs-grid
        ref="grid"
        id="VehiclesGrid"
        :dataSource="vehiclesStore.items"
        :toolbar="toolbarOptions"
        :allowPdfExport="true"
        :allowExcelExport="true"
        :toolbarClick="toolbarClick"
        :excelExportComplete="excelExportComplete"
        :pdfExportComplete="pdfExportComplete"
        :allowPaging="true"
        :pageSettings="pageSettings"
        :allowSorting="true"
        :showColumnChooser="true"
        :allowFiltering="true"
        :filterSettings="filterOptions"
      >
        <e-columns>
          <!-- Columna de selección -->
          <e-column
            headerText=""
            width="50"
            textAlign="Center"
            :allowSorting="false"
            :allowFiltering="false"
            :allowExporting="false"
            :template="selectTemplate"
          />
          
          <!-- Columnas visibles por defecto -->
          <e-column field="placa" headerText="Placa" width="120" />
          <e-column field="no_interno" headerText="No Interno" width="120" />
          <e-column field="modelo" headerText="Modelo" width="100" />
          <e-column field="nombre_propietario" headerText="Propietario" width="180" />
          <e-column field="driver.usuario.nombre" headerText="Conductor" width="180" />
          <e-column
            field="estado"
            headerText="Estado"
            width="150"
            textAlign="Center"
            :valueAccessor="estadoAccessor"
          />
          
          <!-- Columnas ocultas por defecto - disponibles en ColumnChooser -->
          <e-column field="tipo_vehiculo" headerText="Tipo Vehículo" width="150" :visible="false" />
          <e-column field="modalidad" headerText="Modalidad" width="150" :visible="false" />
          <e-column field="motor" headerText="Motor" width="150" :visible="false" />
          <e-column field="no_chasis" headerText="No. Chasis" width="150" :visible="false" />
          <e-column field="capacidad" headerText="Capacidad" width="100" :visible="false" />
          <e-column field="kilometraje" headerText="Kilometraje" width="120" :visible="false" />
          <e-column field="soat" headerText="SOAT" width="150" :visible="false" />
          <e-column 
            field="fechaVencimientoSoat" 
            headerText="Vence SOAT" 
            width="150" 
            :visible="false"
            type="date"
            format="yyyy-MM-dd"
          />
          <e-column 
            field="rtm.fechaVencimiento" 
            headerText="Vence RTM" 
            width="150" 
            :visible="false"
            type="date"
            format="yyyy-MM-dd"
          />
          <e-column 
            field="to.fechaVencimiento" 
            headerText="Vence TO" 
            width="150" 
            :visible="false"
            type="date"
            format="yyyy-MM-dd"
          />
          
          <!-- Columna de acciones -->
          <e-column
            headerText="Acciones"
            width="180"
            textAlign="Center"
            :allowSorting="false"
            :allowFiltering="false"
            :allowExporting="false"
            :template="actionTemplate"
          />
        </e-columns>
      </ejs-grid>
    </div>
  </div>

  <!-- ================= MODAL DESACTIVACIÓN ================= -->
  <div
    v-if="deactivateModalVisible"
    class="modal-overlay"
    @click.self="deactivateModalVisible = false"
  >
    <div class="modal-card">
      <div class="modal-header">
        <h3>Solicitar desactivación</h3>
        <button class="modal-close" @click="deactivateModalVisible = false">
          <i class="pi pi-times" />
        </button>
      </div>

      <div class="modal-body">
        <p class="mb-3">
          Va a enviar una solicitud de desactivación para el vehículo
          <strong>{{ deactivateTarget?.placa }}</strong>.
          El vehículo permanecerá activo hasta que el administrador de la plataforma apruebe la solicitud.
        </p>

        <div class="field">
          <label class="field-label">Nota de desactivación <span class="required">*</span></label>
          <textarea
            v-model="deactivateNota"
            rows="3"
            placeholder="Indique el motivo de desactivación..."
            class="p-inputtext w-full"
            style="resize: vertical; font-family: inherit;"
          />
        </div>
      </div>

      <div class="modal-footer">
        <Button
          label="Cancelar"
          icon="pi pi-times"
          class="p-button-secondary p-button-outlined"
          :disabled="deactivating"
          @click="deactivateModalVisible = false"
        />
        <Button
          label="Enviar solicitud"
          icon="pi pi-send"
          class="p-button-danger"
          :loading="deactivating"
          :disabled="!deactivateNota.trim()"
          @click="confirmDeactivate"
        />
      </div>
    </div>
  </div>

  <!-- ================= MODAL ACTIVACIÓN ================= -->
  <div
    v-if="activateModalVisible"
    class="modal-overlay"
    @click.self="activateModalVisible = false"
  >
    <div class="modal-card">
      <div class="modal-header">
        <h3>Solicitar activación</h3>
        <button class="modal-close" @click="activateModalVisible = false">
          <i class="pi pi-times" />
        </button>
      </div>

      <div class="modal-body">
        <p class="mb-3">
          Va a enviar una solicitud de activación para el vehículo
          <strong>{{ activateTarget?.placa }}</strong>.
          El vehículo permanecerá inactivo hasta que el administrador de la plataforma apruebe la solicitud.
        </p>

        <div class="field">
          <label class="field-label">Nota de activación <span class="required">*</span></label>
          <textarea
            v-model="activateNota"
            rows="3"
            placeholder="Indique el motivo de activación..."
            class="p-inputtext w-full"
            style="resize: vertical; font-family: inherit;"
          />
        </div>
      </div>

      <div class="modal-footer">
        <Button
          label="Cancelar"
          icon="pi pi-times"
          class="p-button-secondary p-button-outlined"
          :disabled="activating"
          @click="activateModalVisible = false"
        />
        <Button
          label="Enviar solicitud"
          icon="pi pi-check"
          class="p-button-success"
          :loading="activating"
          :disabled="!activateNota.trim()"
          @click="confirmActivate"
        />
      </div>
    </div>
  </div>

  <!-- ================= MODAL ACTIVACIÓN MASIVA ================= -->
  <div
    v-if="bulkActivateModalVisible"
    class="modal-overlay"
    @click.self="bulkActivateModalVisible = false"
  >
    <div class="modal-card">
      <div class="modal-header">
        <h3>Solicitar activación masiva</h3>
        <button class="modal-close" @click="bulkActivateModalVisible = false">
          <i class="pi pi-times" />
        </button>
      </div>

      <div class="modal-body">
        <p class="mb-3">
          Va a enviar una solicitud de activación para <strong>{{ inactiveSelected.length }}</strong> vehículo(s).
          Los vehículos permanecerán inactivos hasta que el administrador apruebe la solicitud.
        </p>

        <div class="field">
          <label class="field-label">Nota de activación <span class="required">*</span></label>
          <textarea
            v-model="bulkActivateNota"
            rows="3"
            placeholder="Indique el motivo de activación..."
            class="p-inputtext w-full"
            style="resize: vertical; font-family: inherit;"
          />
        </div>
      </div>

      <div class="modal-footer">
        <Button
          label="Cancelar"
          icon="pi pi-times"
          class="p-button-secondary p-button-outlined"
          :disabled="bulkActivating"
          @click="bulkActivateModalVisible = false"
        />
        <Button
          label="Enviar solicitud"
          icon="pi pi-check"
          class="p-button-success"
          :loading="bulkActivating"
          :disabled="!bulkActivateNota.trim()"
          @click="confirmBulkActivate"
        />
      </div>
    </div>
  </div>

  <!-- ================= MODAL DESACTIVACIÓN MASIVA ================= -->
  <div
    v-if="bulkDeactivateModalVisible"
    class="modal-overlay"
    @click.self="bulkDeactivateModalVisible = false"
  >
    <div class="modal-card">
      <div class="modal-header">
        <h3>Solicitar desactivación masiva</h3>
        <button class="modal-close" @click="bulkDeactivateModalVisible = false">
          <i class="pi pi-times" />
        </button>
      </div>

      <div class="modal-body">
        <p class="mb-3">
          Va a enviar una solicitud de desactivación para <strong>{{ activeSelected.length }}</strong> vehículo(s).
          Los vehículos permanecerán activos hasta que el administrador apruebe la solicitud.
        </p>

        <div class="field">
          <label class="field-label">Nota de desactivación <span class="required">*</span></label>
          <textarea
            v-model="bulkDeactivateNota"
            rows="3"
            placeholder="Indique el motivo de desactivación..."
            class="p-inputtext w-full"
            style="resize: vertical; font-family: inherit;"
          />
        </div>
      </div>

      <div class="modal-footer">
        <Button
          label="Cancelar"
          icon="pi pi-times"
          class="p-button-secondary p-button-outlined"
          :disabled="bulkDeactivating"
          @click="bulkDeactivateModalVisible = false"
        />
        <Button
          label="Enviar solicitud"
          icon="pi pi-send"
          class="p-button-danger"
          :loading="bulkDeactivating"
          :disabled="!bulkDeactivateNota.trim()"
          @click="confirmBulkDeactivate"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import { VehiclesserviceApi } from "../api/vehicles.service";
import { useVehiclesStore } from "../stores/vehiclesStore";
import { useRouter } from "vue-router";
import { createApp } from "vue/dist/vue.esm-bundler.js";

import {
  GridComponent,
  ColumnDirective,
  ColumnsDirective,
  Page,
  Sort,
  Toolbar,
  PdfExport,
  ExcelExport,
  ColumnChooser,
  Filter
} from '@syncfusion/ej2-vue-grids';

export default defineComponent({
  name: 'VehicleListView',
  components: {
    'ejs-grid': GridComponent,
    'e-column': ColumnDirective,
    'e-columns': ColumnsDirective,
    Button
  },
  provide: {
    grid: [Page, Sort, Toolbar, PdfExport, ExcelExport, ColumnChooser, Filter]
  },
  setup() {
    const toast = useToast();
    const vehiclesStore = useVehiclesStore();
    const router = useRouter();
    const grid = ref<any>(null);

    // Syncfusion Grid Options
    const toolbarOptions = ['PdfExport', 'ExcelExport', 'ColumnChooser'];
    const filterOptions = { type: "Excel" };
    const pageSettings = { pageCount: 8, pageSize: 10 };

    // Modales
    const deactivateModalVisible = ref(false);
    const deactivateTarget = ref<any>(null);
    const deactivateNota = ref('');
    const deactivating = ref(false);

    const activateModalVisible = ref(false);
    const activateTarget = ref<any>(null);
    const activateNota = ref('');
    const activating = ref(false);

    const bulkActivateModalVisible = ref(false);
    const bulkActivateNota = ref('');
    const bulkActivating = ref(false);

    const bulkDeactivateModalVisible = ref(false);
    const bulkDeactivateNota = ref('');
    const bulkDeactivating = ref(false);

    // Selección manual de filas
    const selectedIds = ref<string[]>([]);

    function isSelected(id: string) {
      return selectedIds.value.includes(id);
    }
    
    function toggleSelect(id: string) {
      const idx = selectedIds.value.indexOf(id);
      if (idx >= 0) selectedIds.value.splice(idx, 1);
      else selectedIds.value.push(id);
    }
    
    function clearSelection() {
      selectedIds.value = [];
    }

    const inactiveSelected = computed(() =>
      vehiclesStore.items.filter((v: any) => selectedIds.value.includes(v._id) && !v.active && v.activation_estado !== 'pendiente')
    );
    
    const activeSelected = computed(() =>
      vehiclesStore.items.filter((v: any) => selectedIds.value.includes(v._id) && v.active && v.deactivation_estado !== 'pendiente')
    );

    // Value Accessor
    const estadoAccessor = (_field: string, data: any) => {
      if (data.active && data.deactivation_estado === 'pendiente') return 'Desactivación pendiente';
      if (!data.active && data.activation_estado === 'pendiente') return 'Activación pendiente';
      return data.active ? 'Activo' : 'Inactivo';
    };

    // Templates
    const selectTemplate = function () {
      return {
        template: createApp({}).component('selectTemplate', {
          template: `<div class="flex justify-center">
            <input
              type="checkbox"
              class="row-checkbox"
              :checked="isSelected(data._id)"
              @change="toggleSelect(data._id)"
            />
          </div>`,
          methods: {
            isSelected(id: string) {
              return selectedIds.value.includes(id);
            },
            toggleSelect(id: string) {
              toggleSelect(id);
            }
          },
          data: function () {
            return { data: { data: {} } };
          },
        }),
      };
    };

    const actionTemplate = function () {
      return {
        template: createApp({}).component('actionTemplate', {
          template: `<div class="flex gap-1 justify-center align-items-center">
            <button
              @click="goToEdit(data._id)"
              class="p-button p-button-text p-button-warning p-button-sm"
              title="Editar"
            >
              <i class="pi pi-pencil"></i>
            </button>
            
            <button
              v-if="data.active && data.deactivation_estado !== 'pendiente'"
              @click="openDeactivate(data)"
              class="p-button p-button-text p-button-danger p-button-sm"
              title="Solicitar desactivación"
            >
              <i class="pi pi-ban"></i>
            </button>
            
            <span
              v-if="data.active && data.deactivation_estado === 'pendiente'"
              class="deact-pending-badge"
              title="Desactivación pendiente de aprobación"
            >
              <i class="pi pi-clock"></i> Pend. desact.
            </span>

            <button
              v-if="!data.active && data.activation_estado !== 'pendiente'"
              @click="openActivate(data)"
              class="p-button p-button-text p-button-success p-button-sm"
              title="Solicitar activación"
            >
              <i class="pi pi-check-circle"></i>
            </button>
            
            <span
              v-if="!data.active && data.activation_estado === 'pendiente'"
              class="act-pending-badge"
              title="Activación pendiente de aprobación"
            >
              <i class="pi pi-clock"></i> Pend. act.
            </span>
          </div>`,
          methods: {
            goToEdit(id: string) {
              router.push({ name: 'vehicle-edit', params: { id } });
            },
            openDeactivate(vehicle: any) {
              deactivateTarget.value = vehicle;
              deactivateNota.value = '';
              deactivateModalVisible.value = true;
            },
            openActivate(vehicle: any) {
              activateTarget.value = vehicle;
              activateNota.value = '';
              activateModalVisible.value = true;
            }
          },
          data: function () {
            return { data: { data: {} } };
          },
        }),
      };
    };

    // Methods
    const goToCreateVehicle = () => {
      router.push({ name: 'vehiclescreate' });
    };

    function toolbarClick(args: any) {
      if (args.item.id === 'VehiclesGrid_pdfexport') {
        grid.value.showSpinner();
        grid.value.pdfExport({
          fileName: `vehiculos_${new Date().toISOString().split('T')[0]}.pdf`,
          pageOrientation: 'Landscape',
          pageSize: 'A4'
        });
      } else if (args.item.id === 'VehiclesGrid_excelexport') {
        grid.value.showSpinner();
        grid.value.excelExport({
          fileName: `vehiculos_${new Date().toISOString().split('T')[0]}.xlsx`
        });
      }
    }

    function pdfExportComplete() {
      grid.value.hideSpinner();
    }

    function excelExportComplete() {
      grid.value.hideSpinner();
    }

    // Desactivación individual
    function openDeactivate(row: any) {
      deactivateTarget.value = row;
      deactivateNota.value = '';
      deactivateModalVisible.value = true;
    }

    async function confirmDeactivate() {
      if (!deactivateTarget.value) return;
      deactivating.value = true;
      try {
        await VehiclesserviceApi.deactivate(deactivateTarget.value._id, deactivateNota.value);
        toast.add({
          severity: 'success',
          summary: 'Solicitud enviada',
          detail: `Solicitud de desactivación de ${deactivateTarget.value.placa} enviada al administrador`,
          life: 4000,
        });
        deactivateModalVisible.value = false;
        vehiclesStore.fetch();
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.response?.data?.message || 'No se pudo enviar la solicitud',
          life: 4000,
        });
      } finally {
        deactivating.value = false;
      }
    }

    // Activación individual
    function openActivate(row: any) {
      activateTarget.value = row;
      activateNota.value = '';
      activateModalVisible.value = true;
    }

    async function confirmActivate() {
      if (!activateTarget.value) return;
      activating.value = true;
      try {
        await VehiclesserviceApi.requestActivation(activateTarget.value._id, activateNota.value);
        toast.add({
          severity: 'success',
          summary: 'Solicitud enviada',
          detail: `Solicitud de activación de ${activateTarget.value.placa} enviada al administrador`,
          life: 4000,
        });
        activateModalVisible.value = false;
        vehiclesStore.fetch();
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.response?.data?.message || 'No se pudo enviar la solicitud',
          life: 4000,
        });
      } finally {
        activating.value = false;
      }
    }

    // Activación masiva
    function openBulkActivate() {
      bulkActivateNota.value = '';
      bulkActivateModalVisible.value = true;
    }

    async function confirmBulkActivate() {
      const ids = inactiveSelected.value.map((v: any) => v._id);
      if (!ids.length) return;
      bulkActivating.value = true;
      try {
        await VehiclesserviceApi.requestActivationBulk(ids, bulkActivateNota.value);
        toast.add({
          severity: 'success',
          summary: 'Solicitud enviada',
          detail: `Solicitud de activación enviada para ${ids.length} vehículo(s)`,
          life: 4000,
        });
        bulkActivateModalVisible.value = false;
        clearSelection();
        vehiclesStore.fetch();
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.response?.data?.message || 'No se pudo enviar la solicitud',
          life: 4000,
        });
      } finally {
        bulkActivating.value = false;
      }
    }

    // Desactivación masiva
    function openBulkDeactivate() {
      bulkDeactivateNota.value = '';
      bulkDeactivateModalVisible.value = true;
    }

    async function confirmBulkDeactivate() {
      const ids = activeSelected.value.map((v: any) => v._id);
      if (!ids.length) return;
      bulkDeactivating.value = true;
      try {
        await VehiclesserviceApi.requestDeactivationBulk(ids, bulkDeactivateNota.value);
        toast.add({
          severity: 'success',
          summary: 'Solicitud enviada',
          detail: `Solicitud de desactivación enviada para ${ids.length} vehículo(s)`,
          life: 4000,
        });
        bulkDeactivateModalVisible.value = false;
        clearSelection();
        vehiclesStore.fetch();
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.response?.data?.message || 'No se pudo enviar la solicitud',
          life: 4000,
        });
      } finally {
        bulkDeactivating.value = false;
      }
    }

    // Lifecycle
    onMounted(() => {
      vehiclesStore.fetch();
    });

    return {
      grid,
      vehiclesStore,
      toolbarOptions,
      filterOptions,
      pageSettings,
      estadoAccessor,
      selectTemplate,
      actionTemplate,
      toolbarClick,
      pdfExportComplete,
      excelExportComplete,
      goToCreateVehicle,
      
      // Selección
      selectedIds,
      isSelected,
      toggleSelect,
      inactiveSelected,
      activeSelected,
      
      // Modales
      deactivateModalVisible,
      deactivateTarget,
      deactivateNota,
      deactivating,
      openDeactivate,
      confirmDeactivate,
      
      activateModalVisible,
      activateTarget,
      activateNota,
      activating,
      openActivate,
      confirmActivate,
      
      bulkActivateModalVisible,
      bulkActivateNota,
      bulkActivating,
      openBulkActivate,
      confirmBulkActivate,
      
      bulkDeactivateModalVisible,
      bulkDeactivateNota,
      bulkDeactivating,
      openBulkDeactivate,
      confirmBulkDeactivate,
    };
  }
});
</script>

<style scoped>
.page-toolbar {
  margin-bottom: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.page-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1rem;
}

.bulk-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 6px;
}

.bulk-activate {
  background-color: #e8f5e9;
  border: 1px solid #4caf50;
}

.bulk-deactivate {
  background-color: #ffebee;
  border: 1px solid #f44336;
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #2e7d32;
}

.bulk-info-red {
  color: #c62828;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-card {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e0e0e0;
}

.field {
  margin-bottom: 1rem;
}

.field-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.required {
  color: #f44336;
}

.deact-pending-badge,
.act-pending-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.deact-pending-badge {
  background-color: #fff3e0;
  color: #ef6c00;
}

.act-pending-badge {
  background-color: #e3f2fd;
  color: #1976d2;
}

.row-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
</style>
