<template>
  <div class="bolt-wrap">

    <!-- TOOLBAR -->
    <div class="bolt-toolbar bolt-card">
      <div>
        <h2 class="title">Gestión de Despachos</h2>
        <p class="subtitle">Vista unificada de salidas y llegadas de terminal</p>
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
        <Button label="Nuevo despacho" icon="pi pi-plus" class="btn-dark-green" @click="openCreateSalida" />
 
      </div>
    </div>

    <!-- BANNER PENDIENTES -->
    <div v-if="pendingCount > 0" class="banner-warning">
      <i class="pi pi-exclamation-triangle"></i>
      <span>
        <strong>{{ pendingCount }}</strong> despacho{{ pendingCount > 1 ? 's' : '' }} pendiente{{ pendingCount > 1 ? 's' : '' }} de envío a Supertransporte.
      </span>
    </div>

    <!-- FILTROS -->
    <div class="bolt-card p-3">
      <div class="grid gap-3 md:grid-cols-5">
        <div>
          <label>Fecha desde</label>
          <input type="date" v-model="filters.fechaDesde" class="p-inputtext w-full" />
        </div>
        <div>
          <label>Fecha hasta</label>
          <input type="date" v-model="filters.fechaHasta" class="p-inputtext w-full" />
        </div>
        <div>
          <label>Estado</label>
          <select v-model="filters.estado" class="p-inputtext w-full">
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_ruta">En Ruta</option>
            <option value="completado">Completado</option>
            <option value="cerrado">Cerrado</option>
          </select>
        </div>
        <div>
          <label>Placa</label>
          <InputText v-model="filters.placa" placeholder="ABC123" class="w-full" maxlength="6" />
        </div>
        <div class="flex gap-2 items-end">
          <button class="p-button p-button-primary" @click="load">Filtrar</button>
          <button class="p-button p-button-secondary" @click="onClear">Limpiar</button>
        </div>
      </div>
    </div>

    <!-- TABLA UNIFICADA -->
    <div class="bolt-card p-3">
      <DataTable :value="store.despachos.items" :loading="store.despachos.loading"
                 dataKey="_id" responsiveLayout="scroll"
                 class="p-datatable-sm">
        <Column field="placa" header="Placa" />
        <Column field="numeroUnicoPlanilla" header="N° Planilla" />
        <Column header="Ruta">
          <template #body="{ data }">
            <div v-if="data.ruta">
              <strong>{{ data.ruta.codOrigen }} → {{ data.ruta.codDestino }}</strong>
              <br>
              <small class="text-gray-600">{{ data.ruta.descripcionOrigen }} - {{ data.ruta.descripcionDestino }}</small>
            </div>
          </template>
        </Column>
        <Column field="numeroPasajeros" header="Pasajeros" />
        <Column header="Fecha Salida">
          <template #body="{ data }">
            <div>{{ formatDate(data.fechaSalida) }}</div>
            <small class="text-gray-600">{{ data.horaSalida }}</small>
          </template>
        </Column>
        <Column header="Fecha Llegada">
          <template #body="{ data }">
            <div v-if="data.tieneLlegada && data.fechaLlegada">
              {{ formatDate(data.fechaLlegada) }}
              <br>
              <small class="text-gray-600">{{ data.horaLlegada }}</small>
            </div>
            <span v-else class="text-gray-400">—</span>
          </template>
        </Column>
        <Column header="Estado">
          <template #body="{ data }">
            <Tag :value="getEstadoLabel(data)" :severity="getEstadoSeverity(data)" />
          </template>
        </Column>
        <Column header="Sync">
          <template #body="{ data }">
            <Tag :value="syncLabel(data.sync_status)" :severity="syncSeverity(data.sync_status)" style="font-size:0.7rem" />
          </template>
        </Column>
        <Column header="Acciones">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button v-if="data.estado === 'pendiente'"
                      icon="pi pi-check"
                      v-tooltip="'Registrar llegada'"
                      class="p-button-text p-button-sm p-button-success"
                      @click="openLlegadaForSalida(data)" />
              <Button v-if="data.estado === 'completado'"
                      icon="pi pi-lock"
                      v-tooltip="'Cerrar despacho'"
                      class="p-button-text p-button-sm p-button-secondary"
                      @click="cerrarDespacho(data._id)" />
              <Button icon="pi pi-eye"
                      v-tooltip="'Ver detalles'"
                      class="p-button-text p-button-sm p-button-info"
                      @click="viewDetails(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- MODAL NUEVA SALIDA REESTRUCTURADO -->
    <Dialog v-model:visible="showCreateSalida" modal header="Nuevo Despacho"
            :style="{ width: '900px', maxHeight: '90vh' }" :maximizable="true">

      <!-- PASO 1: Datos básicos para consulta integradora -->
      <div v-if="currentStep === 1" class="grid gap-3">
        <h3>Información Básica</h3>

        <div class="col-12 md:col-6">
          <label>Placa del Vehículo *</label>
          <InputText v-model="formConsulta.placa" class="w-full" maxlength="6" placeholder="ABC123"
                     @keyup.enter="onPlacaEnter" />
        </div>

        <div class="col-12 md:col-6">
          <label>Conductor Principal *</label>
          <InputText v-model="formConsulta.docConductorPrincipal" class="w-full" placeholder="Documento" />
        </div>

        <div class="col-12 md:col-6">
          <label>Conductor Secundario</label>
          <InputText v-model="formConsulta.docConductorSecundario" class="w-full" placeholder="Documento (opcional)" />
        </div>

        <div class="col-12 md:col-6">
          <label>NIT Empresa Transporte *</label>
          <InputText v-model="formConsulta.nitEmpresaTransporte" class="w-full" placeholder="NIT" />
        </div>

        <div class="col-12 md:col-6">
          <label>Fecha de Consulta *</label>
          <input type="date" v-model="formConsulta.fechaSalida" class="p-inputtext w-full" />
        </div>

        <div class="col-12">
          <Button label="Consultar" icon="pi pi-search" class="btn-blue w-full"
                  :loading="loadingConsulta" @click="consultarIntegradora" />
        </div>
      </div>

      <!-- PASO 2: Resultados de la consulta integradora -->
      <div v-if="currentStep === 2 && integradoData" class="grid gap-3">
        <div class="col-12 flex justify-content-between align-items-center">
          <h3>{{ integradoData.titulo }}</h3>
          <Button label="Volver" icon="pi pi-arrow-left" class="p-button-outlined p-button-sm" @click="currentStep = 1" />
        </div>

        <!-- Información del Conductor 1 -->
        <div class="col-12" v-if="integradoData.obj?.conductor1">
          <h4>👤 Conductor Principal</h4>
          <DataTable :value="[integradoData.obj.conductor1.persona]" class="p-datatable-sm">
            <Column field="numeroIdentificacion" header="Documento" />
            <Column field="nombres" header="Nombres" />
            <Column field="apellidos" header="Apellidos" />
          </DataTable>

          <h5>📄 Licencia</h5>
          <DataTable :value="[integradoData.obj.conductor1.licencia]" class="p-datatable-sm">
            <Column field="numeroLicencia" header="N° Licencia" />
            <Column field="estado" header="Estado" />
            <Column field="fechaVencimiento" header="Vencimiento" />
          </DataTable>

          <div class="grid">
            <div class="col-6">
              <h5>🍷 Alcoholimetría</h5>
              <DataTable :value="[integradoData.obj.conductor1.alcoholimetria]" class="p-datatable-sm">
                <Column field="resultado" header="Resultado" />
                <Column field="fecha" header="Fecha" />
                <Column field="hora" header="Hora" />
              </DataTable>
            </div>
            <div class="col-6">
              <h5>🏥 Aptitud Física</h5>
              <DataTable :value="[integradoData.obj.conductor1.aptitudFisica]" class="p-datatable-sm">
                <Column field="resultado" header="Resultado" />
                <Column field="fecha" header="Fecha" />
              </DataTable>
            </div>
          </div>
        </div>

        <!-- Información del Vehículo -->
        <div class="col-12" v-if="integradoData.obj?.vehiculo">
          <h4>🚐 Vehículo</h4>
          <DataTable :value="[integradoData.obj.vehiculo]" class="p-datatable-sm">
            <Column field="placa" header="Placa" />
            <Column field="claseVehiculo" header="Clase" />
            <Column field="numeroSoat" header="SOAT" />
            <Column field="soatVencimiento" header="SOAT Vence" />
            <Column field="numeroRtm" header="RTM" />
            <Column field="rtmVencimiento" header="RTM Vence" />
          </DataTable>
        </div>

        <!-- Pólizas -->
        <div class="col-12" v-if="integradoData.obj?.polizas">
          <h4>📋 Pólizas</h4>
          <div class="grid">
            <div class="col-6">
              <h5>Contractual</h5>
              <DataTable :value="[integradoData.obj.polizas.contractual]" class="p-datatable-sm">
                <Column field="numeroPoliza" header="Número" />
                <Column field="estado" header="Estado" />
                <Column field="vencimiento" header="Vencimiento" />
              </DataTable>
            </div>
            <div class="col-6">
              <h5>Extracontractual</h5>
              <DataTable :value="[integradoData.obj.polizas.extracontractual]" class="p-datatable-sm">
                <Column field="numeroPoliza" header="Número" />
                <Column field="estado" header="Estado" />
                <Column field="vencimiento" header="Vencimiento" />
              </DataTable>
            </div>
          </div>
        </div>

        <!-- Tarjeta de Operación -->
        <div class="col-12" v-if="integradoData.obj?.tarjetaOperacion">
          <h4>🎫 Tarjeta de Operación</h4>
          <DataTable :value="[integradoData.obj.tarjetaOperacion]" class="p-datatable-sm">
            <Column field="numero" header="Número" />
            <Column field="estado" header="Estado" />
            <Column field="vencimiento" header="Vencimiento" />
            <Column field="empresaAsociada" header="Empresa" />
          </DataTable>
        </div>

        <!-- Alistamiento Diario -->
        <div class="col-12" v-if="integradoData.obj?.alistamientoDiario">
          <h4>📝 Alistamiento Diario</h4>
          <DataTable :value="[integradoData.obj.alistamientoDiario]" class="p-datatable-sm">
            <Column field="id" header="ID" />
            <Column field="fecha" header="Fecha" />
            <Column field="detalleActividades" header="Detalle" />
          </DataTable>
        </div>

        <div class="col-12">
          <Button label="Continuar con Despacho" icon="pi pi-arrow-right" class="btn-dark-green w-full"
                  @click="currentStep = 3" />
        </div>
      </div>

      <!-- PASO 3: Datos del despacho -->
      <div v-if="currentStep === 3" class="grid gap-3">
        <div class="col-12 flex justify-content-between align-items-center">
          <h3>Información del Despacho</h3>
          <Button label="Volver" icon="pi pi-arrow-left" class="p-button-outlined p-button-sm" @click="currentStep = 2" />
        </div>

        <div class="col-12 md:col-6">
          <label>Código único de despacho *</label>
          <InputText v-model="formSalida.numeroUnicoPlanilla" class="w-full" />
        </div>

        <div class="col-12 md:col-6">
          <label>Terminal *</label>
          <InputText v-model="formSalida.terminal" class="w-full" placeholder="Nombre del terminal" />
        </div>

        <div class="col-12 md:col-6">
          <label>Hora de Salida *</label>
          <input type="time" v-model="formSalida.horaSalida" class="p-inputtext w-full" />
        </div>

        <div class="col-12">
          <label>Seleccionar Ruta *</label>
          <Dropdown v-model="formSalida.ruta" :options="rutasSupertransporte"
                    optionLabel="descripcion" class="w-full"
                    placeholder="Seleccione una ruta"
                    :loading="loadingRutas" @click="loadRutas" />
        </div>

        <div class="col-12 md:col-4">
          <label>N° Pasajeros *</label>
          <InputNumber v-model="formSalida.numeroPasajeros" class="w-full" :min="0" />
        </div>
        <div class="col-12 md:col-4">
          <label>Valor Tasa Uso *</label>
          <InputNumber v-model="formSalida.valorTasaUso" class="w-full" mode="currency" currency="COP" locale="es-CO" />
        </div>
        <div class="col-12 md:col-4">
          <label>Valor Tiquete</label>
          <InputNumber v-model="formSalida.valorTiquete" class="w-full" mode="currency" currency="COP" locale="es-CO" />
        </div>

        <div class="col-12">
          <label>Observaciones</label>
          <Textarea v-model="formSalida.observaciones" class="w-full" rows="2" />
        </div>
      </div>

      <template #footer>
        <Button v-if="currentStep === 1" label="Cancelar" class="p-button-outlined" @click="closeCreateDialog" />
        <Button v-if="currentStep === 3" label="Cancelar" class="p-button-outlined" @click="closeCreateDialog" />
        <Button v-if="currentStep === 3" label="Guardar Despacho" class="btn-dark-green"
                :loading="store.saving" @click="onSaveSalida" />
      </template>
    </Dialog>

    <!-- MODAL NUEVA LLEGADA -->
    <Dialog v-model:visible="showCreateLlegada" modal header="Registrar Llegada de Terminal"
            :style="{ width: '600px' }">
      <div class="grid gap-3" v-if="selectedSalida">
        <!-- Info de la salida -->
        <div class="col-12 p-3 bg-gray-50 border-round">
          <h4>Datos del Despacho</h4>
          <div class="grid gap-2">
            <div class="col-6"><strong>Placa:</strong> {{ selectedSalida.placa }}</div>
            <div class="col-6"><strong>Planilla:</strong> {{ selectedSalida.numeroUnicoPlanilla }}</div>
            <div class="col-6"><strong>Origen:</strong> {{ selectedSalida.ruta?.codOrigen }}</div>
            <div class="col-6"><strong>Destino:</strong> {{ selectedSalida.ruta?.codDestino }}</div>
          </div>
        </div>

        <!-- Datos de llegada -->
        <div class="col-12 md:col-6">
          <label>N° Pasajeros *</label>
          <InputNumber v-model="formLlegada.numeroPasajeros" class="w-full" :min="0" />
        </div>
        <div class="col-12 md:col-6">
          <label>Fecha de Llegada *</label>
          <input type="date" v-model="formLlegada.fechaLlegada" class="p-inputtext w-full" />
        </div>
        <div class="col-12">
          <label>Hora de Llegada *</label>
          <input type="time" v-model="formLlegada.horaLlegada" class="p-inputtext w-full" />
        </div>
        <div class="col-12">
          <label>Observaciones</label>
          <Textarea v-model="formLlegada.observaciones" class="w-full" rows="2" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" class="p-button-outlined" @click="showCreateLlegada = false" />
        <Button label="Guardar" class="btn-dark-green" :loading="store.saving" @click="onSaveLlegada" />
      </template>
    </Dialog>

    <!-- Modal de Detalles -->
    <Dialog
      v-model:visible="showDetailsModal"
      header="Detalles del Despacho"
      :style="{width: '90vw'}"
      position="center"
      :modal="true">

      <div v-if="selectedDespacho" class="grid">

        <!-- Información Básica -->
        <div class="col-12">
          <h3 class="mb-3">📋 Información Básica</h3>
          <div class="grid">
            <div class="col-12 md:col-3">
              <strong>Placa:</strong> {{ selectedDespacho.placa }}
            </div>
            <div class="col-12 md:col-3">
              <strong>Código único:</strong> {{ selectedDespacho.numeroUnicoPlanilla }}
            </div>
            <div class="col-12 md:col-3" v-if="selectedDespacho.terminal">
              <strong>Terminal:</strong> {{ selectedDespacho.terminal }}
            </div>
            <div class="col-12 md:col-3">
              <strong>NIT Empresa:</strong> {{ selectedDespacho.nitEmpresaTransporte }}
            </div>
          </div>
        </div>

        <Divider />

        <!-- Información de Salida -->
        <div class="col-12 md:col-6">
          <h3 class="mb-3">🚌 Información de Salida</h3>
          <div class="grid">
            <div class="col-12">
              <strong>Fecha de Salida:</strong> {{ formatDate(selectedDespacho.fechaSalida) }}
            </div>
            <div class="col-12">
              <strong>Hora de Salida:</strong> {{ selectedDespacho.horaSalida }}
            </div>
            <div class="col-12">
              <strong>Conductor Principal:</strong> {{ selectedDespacho.docConductorPrincipal }}
            </div>
            <div class="col-12" v-if="selectedDespacho.docConductorSecundario">
              <strong>Conductor Secundario:</strong> {{ selectedDespacho.docConductorSecundario }}
            </div>
            <div class="col-12">
              <strong>Número de Pasajeros:</strong> {{ selectedDespacho.numeroPasajeros || '—' }}
            </div>
            <div class="col-12">
              <strong>Valor Tasa de Uso:</strong>
              {{ selectedDespacho.valorTasaUso ? '$' + selectedDespacho.valorTasaUso.toLocaleString() : '—' }}
            </div>
            <div class="col-12">
              <strong>Valor Tiquete:</strong>
              {{ selectedDespacho.valorTiquete ? '$' + selectedDespacho.valorTiquete.toLocaleString() : '—' }}
            </div>
            <div class="col-12" v-if="selectedDespacho.observacionesSalida">
              <strong>Observaciones de Salida:</strong> {{ selectedDespacho.observacionesSalida }}
            </div>
          </div>
        </div>

        <!-- Información de Llegada -->
        <div class="col-12 md:col-6">
          <h3 class="mb-3">🏁 Información de Llegada</h3>
          <div v-if="selectedDespacho.tieneLlegada" class="grid">
            <div class="col-12">
              <strong>Fecha de Llegada:</strong> {{ formatDate(selectedDespacho.fechaLlegada) }}
            </div>
            <div class="col-12">
              <strong>Hora de Llegada:</strong> {{ selectedDespacho.horaLlegada }}
            </div>
            <div class="col-12">
              <strong>Número de Pasajeros Llegada:</strong> {{ selectedDespacho.numeroPasajerosLlegada || '—' }}
            </div>
            <div class="col-12" v-if="selectedDespacho.observacionesLlegada">
              <strong>Observaciones de Llegada:</strong> {{ selectedDespacho.observacionesLlegada }}
            </div>
          </div>
          <div v-else class="text-gray-500">
            <p>No se ha registrado la llegada de este despacho</p>
          </div>
        </div>

        <Divider />

        <!-- Información de Ruta -->
        <div class="col-12" v-if="selectedDespacho.ruta">
          <h3 class="mb-3">🗺️ Información de Ruta</h3>
          <div class="grid">
            <div class="col-12 md:col-3">
              <strong>ID Ruta:</strong> {{ selectedDespacho.ruta.idRuta }}
            </div>
            <div class="col-12 md:col-3">
              <strong>Origen:</strong> {{ selectedDespacho.ruta.codOrigen }} - {{ selectedDespacho.ruta.descripcionOrigen }}
            </div>
            <div class="col-12 md:col-3">
              <strong>Destino:</strong> {{ selectedDespacho.ruta.codDestino }} - {{ selectedDespacho.ruta.descripcionDestino }}
            </div>
            <div class="col-12 md:col-3">
              <strong>Vía:</strong> {{ selectedDespacho.ruta.via }}
            </div>
          </div>
        </div>

        <Divider />

        <!-- Información SICOV Integradora -->
        <div class="col-12" v-if="selectedDespacho.sicovIntegradoData && selectedDespacho.sicovIntegradoData.obj">
          <h3 class="mb-3">🔍 Consulta SICOV Integradora</h3>

          <!-- Estado de la consulta -->
          <div class="col-12 mb-3">
            <div class="grid">
              <div class="col-12 md:col-4">
                <strong>Estado:</strong> {{ selectedDespacho.sicovIntegradoData.status }}
              </div>
              <div class="col-12 md:col-4">
                <strong>Fecha Consulta:</strong> {{ selectedDespacho.sicovIntegradoData.obj.fechaConsultaIntegradora }}
              </div>
              <div class="col-12 md:col-4">
                <strong>Hora Consulta:</strong> {{ selectedDespacho.sicovIntegradoData.obj.horaConsultaIntegradora }}
              </div>
            </div>
          </div>

          <div class="grid">
            <!-- Información del Conductor -->
            <div class="col-12 md:col-6" v-if="selectedDespacho.sicovIntegradoData.obj.conductor1">
              <h4>👤 Conductor Principal</h4>
              <div class="mb-2">
                <strong>Nombre Completo:</strong>
                {{ selectedDespacho.sicovIntegradoData.obj.conductor1.persona.nombres }}
                {{ selectedDespacho.sicovIntegradoData.obj.conductor1.persona.apellidos }}
              </div>
              <div class="mb-2">
                <strong>Documento:</strong> {{ selectedDespacho.sicovIntegradoData.obj.conductor1.persona.numeroIdentificacion }}
              </div>
              <div class="mb-2">
                <strong>Licencia:</strong> {{ selectedDespacho.sicovIntegradoData.obj.conductor1.licencia.numeroLicencia }}
              </div>
              <div class="mb-2">
                <strong>Estado Licencia:</strong>
                <Tag :value="selectedDespacho.sicovIntegradoData.obj.conductor1.licencia.estado"
                     :severity="selectedDespacho.sicovIntegradoData.obj.conductor1.licencia.estado === 'ACTIVA' ? 'success' : 'danger'" />
              </div>
              <div class="mb-2">
                <strong>Vencimiento Licencia:</strong> {{ selectedDespacho.sicovIntegradoData.obj.conductor1.licencia.fechaVencimiento }}
              </div>

              <!-- Alcoholimetría -->
              <h5 class="mt-3">🍺 Alcoholimetría</h5>
              <div class="mb-1"><strong>Resultado:</strong>
                <Tag :value="selectedDespacho.sicovIntegradoData.obj.conductor1.alcoholimetria.resultado"
                     :severity="selectedDespacho.sicovIntegradoData.obj.conductor1.alcoholimetria.resultado === 'Negativo' ? 'success' : 'danger'" />
              </div>
              <div class="mb-1"><strong>Fecha:</strong> {{ selectedDespacho.sicovIntegradoData.obj.conductor1.alcoholimetria.fecha }}</div>
              <div class="mb-1"><strong>Hora:</strong> {{ selectedDespacho.sicovIntegradoData.obj.conductor1.alcoholimetria.hora }}</div>

              <!-- Aptitud Física -->
              <h5 class="mt-3">🏥 Aptitud Física</h5>
              <div class="mb-1"><strong>Resultado:</strong>
                <Tag :value="selectedDespacho.sicovIntegradoData.obj.conductor1.aptitudFisica.resultado"
                     :severity="selectedDespacho.sicovIntegradoData.obj.conductor1.aptitudFisica.resultado === 'Apto' ? 'success' : 'danger'" />
              </div>
              <div class="mb-1"><strong>Fecha:</strong> {{ selectedDespacho.sicovIntegradoData.obj.conductor1.aptitudFisica.fecha }}</div>
              <div class="mb-1"><strong>Hora:</strong> {{ selectedDespacho.sicovIntegradoData.obj.conductor1.aptitudFisica.hora }}</div>
            </div>

            <!-- Información del Vehículo -->
            <div class="col-12 md:col-6" v-if="selectedDespacho.sicovIntegradoData.obj.vehiculo">
              <h4>🚌 Información del Vehículo</h4>
              <div class="mb-2">
                <strong>Placa:</strong> {{ selectedDespacho.sicovIntegradoData.obj.vehiculo.placa }}
              </div>
              <div class="mb-2">
                <strong>Clase Vehículo:</strong> {{ selectedDespacho.sicovIntegradoData.obj.vehiculo.claseVehiculo }}
              </div>

              <!-- SOAT -->
              <h5 class="mt-3">📋 SOAT</h5>
              <div class="mb-1"><strong>Número:</strong> {{ selectedDespacho.sicovIntegradoData.obj.vehiculo.numeroSoat }}</div>
              <div class="mb-1"><strong>Vencimiento:</strong> {{ selectedDespacho.sicovIntegradoData.obj.vehiculo.soatVencimiento }}</div>

              <!-- RTM -->
              <h5 class="mt-3">🔧 Revisión Técnico Mecánica</h5>
              <div class="mb-1"><strong>Número:</strong> {{ selectedDespacho.sicovIntegradoData.obj.vehiculo.numeroRtm }}</div>
              <div class="mb-1"><strong>Vencimiento:</strong> {{ selectedDespacho.sicovIntegradoData.obj.vehiculo.rtmVencimiento }}</div>

              <!-- Tarjeta de Operación -->
              <h5 class="mt-3" v-if="selectedDespacho.sicovIntegradoData.obj.tarjetaOperacion">💳 Tarjeta de Operación</h5>
              <div class="mb-1" v-if="selectedDespacho.sicovIntegradoData.obj.tarjetaOperacion">
                <strong>Número:</strong> {{ selectedDespacho.sicovIntegradoData.obj.tarjetaOperacion.numero }}
              </div>
              <div class="mb-1" v-if="selectedDespacho.sicovIntegradoData.obj.tarjetaOperacion">
                <strong>Estado:</strong>
                <Tag :value="selectedDespacho.sicovIntegradoData.obj.tarjetaOperacion.estado"
                     :severity="selectedDespacho.sicovIntegradoData.obj.tarjetaOperacion.estado === 'VIGENTE' ? 'success' : 'danger'" />
              </div>
              <div class="mb-1" v-if="selectedDespacho.sicovIntegradoData.obj.tarjetaOperacion">
                <strong>Vencimiento:</strong> {{ selectedDespacho.sicovIntegradoData.obj.tarjetaOperacion.vencimiento }}
              </div>
            </div>

            <!-- Pólizas -->
            <div class="col-12" v-if="selectedDespacho.sicovIntegradoData.obj.polizas">
              <h4>📋 Pólizas</h4>
              <div class="grid">
                <div class="col-12 md:col-6">
                  <h5>📄 Póliza Contractual</h5>
                  <div class="mb-1"><strong>Número:</strong> {{ selectedDespacho.sicovIntegradoData.obj.polizas.contractual.numeroPoliza }}</div>
                  <div class="mb-1"><strong>Estado:</strong>
                    <Tag :value="selectedDespacho.sicovIntegradoData.obj.polizas.contractual.estado"
                         :severity="selectedDespacho.sicovIntegradoData.obj.polizas.contractual.estado === 'ACTIVO' ? 'success' : 'danger'" />
                  </div>
                  <div class="mb-1"><strong>Vencimiento:</strong> {{ selectedDespacho.sicovIntegradoData.obj.polizas.contractual.vencimiento }}</div>
                </div>
                <div class="col-12 md:col-6">
                  <h5>📄 Póliza Extracontractual</h5>
                  <div class="mb-1"><strong>Número:</strong> {{ selectedDespacho.sicovIntegradoData.obj.polizas.extracontractual.numeroPoliza }}</div>
                  <div class="mb-1"><strong>Estado:</strong>
                    <Tag :value="selectedDespacho.sicovIntegradoData.obj.polizas.extracontractual.estado"
                         :severity="selectedDespacho.sicovIntegradoData.obj.polizas.extracontractual.estado === 'ACTIVO' ? 'success' : 'danger'" />
                  </div>
                  <div class="mb-1"><strong>Vencimiento:</strong> {{ selectedDespacho.sicovIntegradoData.obj.polizas.extracontractual.vencimiento }}</div>
                </div>
              </div>
            </div>

            <!-- Empresa -->
            <div class="col-12 md:col-6" v-if="selectedDespacho.sicovIntegradoData.obj.empresa">
              <h4>🏢 Empresa</h4>
              <div class="mb-2"><strong>Razón Social:</strong> {{ selectedDespacho.sicovIntegradoData.obj.empresa.razonSocial }}</div>
              <div class="mb-2"><strong>NIT:</strong> {{ selectedDespacho.sicovIntegradoData.obj.empresa.nit }}</div>
              <div class="mb-2"><strong>ID Empresa:</strong> {{ selectedDespacho.sicovIntegradoData.obj.empresa.idEmpresa }}</div>
            </div>

            <!-- Alistamiento Diario -->
            <div class="col-12 md:col-6" v-if="selectedDespacho.sicovIntegradoData.obj.alistamientoDiario">
              <h4>✅ Alistamiento Diario</h4>
              <div class="mb-2"><strong>ID:</strong> {{ selectedDespacho.sicovIntegradoData.obj.alistamientoDiario.id }}</div>
              <div class="mb-2"><strong>Fecha:</strong> {{ selectedDespacho.sicovIntegradoData.obj.alistamientoDiario.fecha }}</div>
              <div class="mb-2"><strong>Detalle:</strong> {{ selectedDespacho.sicovIntegradoData.obj.alistamientoDiario.detalleActividades }}</div>
            </div>
          </div>
        </div>

        <Divider />

        <!-- Información de Estado y Sincronización -->
        <div class="col-12">
          <h3 class="mb-3">ℹ️ Estado y Sincronización</h3>
          <div class="grid">
            <div class="col-12 md:col-4">
              <strong>Estado:</strong>
              <Tag :value="getEstadoLabel(selectedDespacho)" :severity="getEstadoSeverity(selectedDespacho)" class="ml-2" />
            </div>
            <div class="col-12 md:col-4">
              <strong>Estado de Sincronización:</strong>
              <Tag :value="syncLabel(selectedDespacho.sync_status)" :severity="syncSeverity(selectedDespacho.sync_status)" class="ml-2" />
            </div>
            <div class="col-12 md:col-4">
              <strong>Fecha de Creación:</strong> {{ formatDate(selectedDespacho.fechaCreacion || selectedDespacho.createdAt) }}
            </div>
          </div>
        </div>

      </div>

      <template #footer>
        <Button label="Cerrar" class="p-button-outlined" @click="showDetailsModal = false" />
      </template>
    </Dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Textarea from "primevue/textarea";
import Dropdown from "primevue/dropdown";
import Tag from "primevue/tag";
import Divider from "primevue/divider";
import { useTerminalesStore } from "../../stores/terminalesStore";
import { useAuthStore } from "../../stores/authStore";
import { AuthserviceApi } from "../../api/auth.service";
import { useToast } from "primevue/usetoast";

const store = useTerminalesStore();
const authStore = useAuthStore();
const toast = useToast();
const showCreateSalida = ref(false);
const showCreateLlegada = ref(false);
const retrying = ref(false);
const searchingVehicle = ref(false);
const vehicleFound = ref(false);
const searchedPlaca = ref("");
const conductorPrincipalAuto = ref(false);
const conductorSecundarioAuto = ref(false);
const loadingRutas = ref(false);

const filters = ref({
  fechaDesde: "",
  fechaHasta: "",
  estado: "",
  placa: ""
});

// Datos de la empresa en sesión
const enterpriseNit = ref("");
const enterpriseName = ref("");

// Datos para rutas de Supertransporte
const rutasSupertransporte = ref([]);

// Salida seleccionada para registrar llegada
const selectedSalida = ref(null);

// Details modal
const showDetailsModal = ref(false);
const selectedDespacho = ref(null);

// Multi-step form state
const currentStep = ref(1);
const integradoData = ref(null);
const loadingConsulta = ref(false);

// Form for SICOV consultation (Step 1)
const formConsulta = reactive({
  placa: "",
  docConductorPrincipal: "",
  docConductorSecundario: "",
  nitEmpresaTransporte: "",
  fechaSalida: new Date().toISOString().split('T')[0],
});

const emptyFormSalida = () => ({
  placa: "",
  docConductorPrincipal: "",
  docConductorSecundario: "",
  nitEmpresaTransporte: "",
  numeroUnicoPlanilla: "",
  terminal: "",
  fechaSalida: new Date().toISOString().split('T')[0],
  horaSalida: "",
  ruta: null,
  numeroPasajeros: null as number | null,
  valorTasaUso: null as number | null,
  valorTiquete: null as number | null,
  observaciones: "",
});

const emptyFormLlegada = () => ({
  numeroPasajeros: null as number | null,
  fechaLlegada: new Date().toISOString().split('T')[0],
  horaLlegada: "",
  observaciones: "",
});

const formSalida = ref(emptyFormSalida());
const formLlegada = ref(emptyFormLlegada());

const pendingCount = computed(() =>
  store.despachos.items.filter((x: any) => x.sync_status !== "synced").length,
);

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-CO", { timeZone: "America/Bogota" });
}

function getEstadoLabel(despacho: any) {
  if (despacho.tieneLlegada && despacho.estadoLlegada) {
    return despacho.estadoLlegada === 'cerrado' ? 'CERRADO' : 'COMPLETADO';
  }
  const labels = {
    pendiente: 'PENDIENTE',
    en_ruta: 'EN RUTA',
    completado: 'COMPLETADO'
  };
  return labels[despacho.estado] || (typeof despacho.estado === 'string' ? despacho.estado.toUpperCase() : 'SIN ESTADO');
}

function getEstadoSeverity(despacho: any) {
  if (despacho.tieneLlegada && despacho.estadoLlegada) {
    return despacho.estadoLlegada === 'cerrado' ? 'secondary' : 'success';
  }
  const severities = {
    pendiente: 'warning',
    en_ruta: 'info',
    completado: 'success'
  };
  return severities[despacho.estado] || 'info';
}

function syncLabel(s: string) {
  return { pending: "Pendiente", synced: "Sincronizado", failed: "Error" }[s] ?? s;
}

function syncSeverity(s: string) {
  return { pending: "warning", synced: "success", failed: "danger" }[s] ?? "info";
}

function openCreateSalida() {
  // Reset all form data
  formSalida.value = emptyFormSalida();

  // Reset multi-step form data
  currentStep.value = 1;
  integradoData.value = null;
  Object.assign(formConsulta, {
    placa: "",
    docConductorPrincipal: "",
    docConductorSecundario: "",
    nitEmpresaTransporte: enterpriseNit.value,
    fechaSalida: new Date().toISOString().split('T')[0],
  });

  vehicleFound.value = false;
  searchedPlaca.value = "";
  conductorPrincipalAuto.value = false;
  conductorSecundarioAuto.value = false;
  showCreateSalida.value = true;
}

function openCreateLlegada() {
  showCreateLlegada.value = true;
}

function closeCreateDialog() {
  showCreateSalida.value = false;
  currentStep.value = 1;
  integradoData.value = null;
}

async function consultarIntegradora() {
  if (!formConsulta.placa || !formConsulta.docConductorPrincipal || !formConsulta.nitEmpresaTransporte) {
    toast.add({ severity: 'warn', summary: 'Campos requeridos', detail: 'Complete los campos: Placa, Conductor Principal y NIT Empresa' });
    return;
  }

  loadingConsulta.value = true;
  try {
    const payload = {
      numeroIdentificacion1: formConsulta.docConductorPrincipal,
      numeroIdentificacion2: formConsulta.docConductorSecundario || null,
      placa: formConsulta.placa,
      nit: formConsulta.nitEmpresaTransporte,
      fechaConsulta: formConsulta.fechaSalida,
    };

    const result = await store.consultarIntegradora(payload);
    integradoData.value = result;

    // Copy consultation data to main form
    formSalida.value.placa = formConsulta.placa;
    formSalida.value.docConductorPrincipal = formConsulta.docConductorPrincipal;
    formSalida.value.docConductorSecundario = formConsulta.docConductorSecundario;
    formSalida.value.nitEmpresaTransporte = formConsulta.nitEmpresaTransporte;
    formSalida.value.fechaSalida = formConsulta.fechaSalida;

    currentStep.value = 2;
  } catch (error) {
    console.error('Error consulting integradora:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo consultar la información' });
  } finally {
    loadingConsulta.value = false;
  }
}

function viewDetails(despacho: any) {
  selectedDespacho.value = despacho;
  showDetailsModal.value = true;
}

function openLlegadaForSalida(salida: any) {
  selectedSalida.value = salida;
  formLlegada.value = emptyFormLlegada();
  showCreateLlegada.value = true;
}

async function onPlacaChange() {
  vehicleFound.value = false;
  conductorPrincipalAuto.value = false;
  conductorSecundarioAuto.value = false;
}

async function onPlacaEnter() {
  if (!formConsulta.placa || formConsulta.placa.length < 3) {
    toast.add({ severity: 'warn', summary: 'Placa inválida', detail: 'La placa debe tener al menos 3 caracteres' });
    return;
  }

  // Convertir a mayúsculas
  formConsulta.placa = formConsulta.placa.trim().toUpperCase();

  toast.add({
    severity: 'info',
    summary: 'Placa registrada',
    detail: `Placa ${formConsulta.placa} lista. Complete los demás campos.`
  });
}

async function searchVehicle() {
  if (!formSalida.value.placa || formSalida.value.placa.length < 3) return;

  const placa = formSalida.value.placa.trim().toUpperCase();
  formSalida.value.placa = placa;
  searchingVehicle.value = true;
  searchedPlaca.value = placa;

  try {
    // Usar la misma API que alistamientos
    const token = localStorage.getItem("token2");
    if (!token) {
      vehicleFound.value = false;
      return;
    }

    const response = await fetch(
      `https://sicov.protegeme.com.co/api/vehicles/vehicles/plate/${placa}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      vehicleFound.value = false;
      return;
    }

    const vehiculo = await response.json();
    console.log("🔍 Datos del vehículo recibidos:", vehiculo);

    if (vehiculo && vehiculo.placa) {
      vehicleFound.value = true;
    } else {
      vehicleFound.value = false;
    }
  } catch (error) {
    console.error('Error searching vehicle:', error);
    vehicleFound.value = false;
  } finally {
    searchingVehicle.value = false;
  }
}

async function loadRutas() {
  if (rutasSupertransporte.value.length > 0) return;

  loadingRutas.value = true;
  try {
    const rutas = await store.getRutasSupertransporte();

    // Verificar que rutas sea un array
    if (Array.isArray(rutas)) {
      rutasSupertransporte.value = rutas.map((ruta: any) => ({
        ...ruta,
        descripcion: `${ruta.codOrigen} → ${ruta.codDestino} (${ruta.descripcionOrigen} - ${ruta.descripcionDestino})`
      }));
    } else {
      console.warn('Las rutas devueltas no son un array:', rutas);
      rutasSupertransporte.value = [];
    }
  } catch (error) {
    console.error('Error loading routes:', error);
    rutasSupertransporte.value = [];
  } finally {
    loadingRutas.value = false;
  }
}

async function load() {
  const p: any = {};
  if (filters.value.fechaDesde) p.fechaDesde = filters.value.fechaDesde;
  if (filters.value.fechaHasta) p.fechaHasta = filters.value.fechaHasta;
  if (filters.value.estado) p.estado = filters.value.estado;
  if (filters.value.placa) p.placa = filters.value.placa;
  await store.fetchDespachos(p);
}

function onClear() {
  filters.value = { fechaDesde: "", fechaHasta: "", estado: "", placa: "" };
  load();
}

async function onSaveSalida() {
  const payload: any = { ...formSalida.value };

  // Debug logging temporal
  console.log('🚀 Payload inicial:', payload);

  // Incluir datos de consulta SICOV integradora
  if (integradoData.value) {
    payload.sicovIntegradoData = integradoData.value;
    console.log('🔍 SICOV data being sent:', integradoData.value);
  } else {
    console.log('⚠️ No SICOV data available to send');
  }

  // Preparar datos de ruta
  if (payload.ruta) {
    payload.ruta = {
      idRuta: payload.ruta.idRuta,
      codOrigen: payload.ruta.codOrigen,
      descripcionOrigen: payload.ruta.descripcionOrigen,
      codDestino: payload.ruta.codDestino,
      descripcionDestino: payload.ruta.descripcionDestino,
      via: payload.ruta.via
    };
  }

  // Validaciones básicas
  if (!payload.placa) {
    alert('La placa es obligatoria');
    return;
  }
  if (!payload.numeroUnicoPlanilla) {
    alert('El número único de planilla es obligatorio');
    return;
  }
  if (!payload.ruta) {
    alert('Debe seleccionar una ruta');
    return;
  }

  // Limpiar nulos y vacíos, pero preservar campos importantes
  Object.keys(payload).forEach((k) => {
    if (!['placa', 'numeroUnicoPlanilla', 'ruta'].includes(k) &&
        (payload[k] === null || payload[k] === "")) {
      delete payload[k];
    }
  });

  console.log('🚀 Payload final:', payload);

  try {
    await store.createSalidaEnhanced(payload);
    showCreateSalida.value = false;
    formSalida.value = emptyFormSalida();
    await load();
  } catch (error) {
    console.error('❌ Error al crear salida:', error);
    alert(`Error al crear salida: ${error.message || error}`);
  }
}

async function onSaveLlegada() {
  const payload: any = {
    ...formLlegada.value,
    salidaId: selectedSalida.value._id,
    placa: selectedSalida.value.placa
  };

  // Limpiar nulos y vacíos
  Object.keys(payload).forEach((k) => {
    if (payload[k] === null || payload[k] === "") delete payload[k];
  });

  await store.createLlegadaEnhanced(payload);
  showCreateLlegada.value = false;
  selectedSalida.value = null;
  formLlegada.value = emptyFormLlegada();
  await load();
}

async function cerrarDespacho(id: string) {
  await store.cerrarDespacho(id);
  await load();
}


async function onRetry() {
  retrying.value = true;
  await store.retrySync().catch(() => {});
  retrying.value = false;
  await load();
}

async function loadEnterprise() {
  const id = authStore.enterpriseId;
  if (!id) return;
  try {
    const { data } = await AuthserviceApi.getEnterprise(id) as any;
    const ent = data?.data ?? data;
    enterpriseNit.value = ent?.vigiladoId ?? ent?.document_number ?? "";
    enterpriseName.value = ent?.name ?? "";
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
:deep(.p-button.btn-blue) { background: #1e40af; border-color: #1e40af; color: #fff; }
:deep(.p-button.btn-blue:hover) { background: #1d4ed8; border-color: #1d4ed8; }
.field-auto-badge { background: #dcfce7; color: #15803d; border-radius: 4px; font-size: 0.65rem; font-weight: 700; padding: 1px 5px; margin-left: 4px; vertical-align: middle; }
.text-gray-400 { color: #9ca3af; }
.text-gray-600 { color: #4b5563; }
.text-green-600 { color: #059669; }
.text-orange-600 { color: #ea580c; }
.bg-gray-50 { background-color: #f9fafb; }
</style>