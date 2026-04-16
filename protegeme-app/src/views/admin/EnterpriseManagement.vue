<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">Gestión de Empresas</h2>
      <button class="btn-primary" @click="openCreate">
        <i class="pi pi-plus" /> Nueva empresa
      </button>
    </div>

    <!-- Tabla -->
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem" />
    </div>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>NIT</th>
            <th>Paquete</th>
            <th>VigiladoId</th>
            <th>Token Vigilado</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ent in enterprises" :key="ent._id">
            <td>{{ ent.name }}</td>
            <td>{{ ent.document_number }}</td>
            <td>
              <span :class="['badge', ent.packageType === 'enterprise' ? 'badge-blue' : 'badge-gray']">
                {{ ent.packageType || '—' }}
              </span>
            </td>
            <td>{{ ent.vigiladoId ?? '—' }}</td>
            <td class="token-cell">{{ ent.vigiladoToken || '—' }}</td>
            <td>
              <span :class="['badge', ent.active ? 'badge-green' : 'badge-red']">
                {{ ent.active ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn-icon" title="Editar" @click="openEdit(ent)">
                <i class="pi pi-pencil" />
              </button>
              <button
                class="btn-icon"
                :title="ent.active ? 'Desactivar' : 'Activar'"
                @click="openToggle(ent)"
              >
                <i :class="ent.active ? 'pi pi-ban' : 'pi pi-check-circle'" />
              </button>
              <button class="btn-icon btn-icon-blue" title="Vehículos" @click="openVehiclesPanel(ent)">
                <i class="pi pi-car" />
              </button>
              <button class="btn-icon btn-icon-green" title="Crear usuario admin" @click="openCreateUser(ent)">
                <i class="pi pi-user-plus" />
              </button>
              <button class="btn-icon btn-icon-purple" title="Ver usuarios admin" @click="openAdminUsers(ent)">
                <i class="pi pi-users" />
              </button>
            </td>
          </tr>
          <tr v-if="enterprises.length === 0">
            <td colspan="7" class="empty-cell">No hay empresas registradas</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal crear/editar -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editing ? 'Editar Empresa' : 'Nueva Empresa' }}</h3>
          <button class="btn-close" @click="closeModal">
            <i class="pi pi-times" />
          </button>
        </div>

        <div class="modal-body">
          <!-- Datos básicos -->
          <div class="section-title">Datos básicos</div>
          <div class="grid">
            <div class="field full">
              <label>Nombre <span class="req">*</span></label>
              <input v-model="form.name" placeholder="Razón social" />
              <small v-if="errors.name" class="error-text">{{ errors.name }}</small>
            </div>

            <div class="field full">
              <label>Descripción</label>
              <input v-model="form.description" placeholder="Descripción de la empresa" />
            </div>

            <div class="field">
              <label>NIT</label>
              <input
                v-model="form.document_number"
                placeholder="Ej: 891100299"
                @input="syncVigiladoId"
              />
            </div>

            <div class="field">
              <label>Tipo de documento</label>
              <input value="NIT" disabled class="disabled-input" />
            </div>

            <div class="field">
              <label>Paquete</label>
              <select v-model="form.packageType">
                <option value="basic">basic</option>
                <option value="enterprise">enterprise</option>
              </select>
            </div>

            <div class="field">
              <label>Dirección</label>
              <input v-model="form.address" placeholder="Dirección física" />
            </div>

            <div class="field">
              <label>Teléfono</label>
              <input v-model="form.phone_number" placeholder="Teléfono fijo" />
            </div>

            <div class="field">
              <label>Móvil</label>
              <input v-model="form.movil_number" placeholder="Celular" />
            </div>
          </div>

          <!-- Tipo de habilitación -->
          <div class="section-title">Tipo de habilitación</div>
          <div class="grid">
            <div class="field">
              <label>Tipo de habilitación</label>
              <select v-model="form.tipo_habilitacion">
                <option value="CARRETERA">Carretera (reporta a Supertransporte)</option>
                <option value="ESPECIAL">Transporte Especial (no reporta a Supertransporte)</option>
                <option value="MIXTO">Mixto (carretera + especial)</option>
              </select>
            </div>
          </div>

          <!-- Integración Supertransporte -->
          <div class="section-title">Integración Supertransporte</div>
          <div class="grid">
            <div class="field">
              <label>VigiladoId (número entero)</label>
              <input
                v-model.number="form.vigiladoId"
                type="number"
                placeholder="Auto desde NIT"
              />
            </div>

            <div class="field">
              <label>VigiladoToken</label>
              <input v-model="form.vigiladoToken" placeholder="UUID del token" />
            </div>
          </div>

          <!-- Formatos consecutivos -->
          <div class="section-title">Formatos y consecutivos</div>
          <div class="grid">
            <div class="field">
              <label>Consecutivo alistamiento</label>
              <input v-model="form.format_enlistment_consecutive" placeholder="EL-{YYYY}-{0001}" />
            </div>

            <div class="field">
              <label>Consecutivo mantenimiento</label>
              <input v-model="form.format_enlistment_maintenance" placeholder="EM-{YYYY}-{0001}" />
            </div>

            <div class="field">
              <label>Tipo de formato (papel)</label>
              <input v-model="form.formato_type" placeholder="A4" />
            </div>
          </div>

          <!-- Formatos PDF (JSON) -->
          <div class="section-title">
            <span>Formato Alistamiento (JSON)</span>
            <button type="button" class="btn-link" @click="loadDefaultFormato('alistamiento')">
              Cargar por defecto
            </button>
          </div>
          <textarea
            v-model="formatoAlistamientoText"
            class="json-textarea"
            placeholder="{}"
            rows="6"
          />
          <small v-if="jsonErrors.alistamiento" class="error-text">{{ jsonErrors.alistamiento }}</small>

          <div class="section-title">
            <span>Formato Correctivo (JSON)</span>
            <button type="button" class="btn-link" @click="loadDefaultFormato('correctivo')">
              Cargar por defecto
            </button>
          </div>
          <textarea
            v-model="formatoCorrectivoText"
            class="json-textarea"
            placeholder="{}"
            rows="6"
          />
          <small v-if="jsonErrors.correctivo" class="error-text">{{ jsonErrors.correctivo }}</small>

          <div class="section-title">
            <span>Formato Preventivo (JSON)</span>
            <button type="button" class="btn-link" @click="loadDefaultFormato('preventivo')">
              Cargar por defecto
            </button>
          </div>
          <textarea
            v-model="formatoPreventivoText"
            class="json-textarea"
            placeholder="{}"
            rows="6"
          />
          <small v-if="jsonErrors.preventivo" class="error-text">{{ jsonErrors.preventivo }}</small>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="closeModal">Cancelar</button>
          <button class="btn-primary" :disabled="saving" @click="save">
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal toggle activo -->
    <div v-if="showToggleModal" class="modal-overlay" @click.self="showToggleModal = false">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3>{{ toggleTarget?.active ? 'Desactivar empresa' : 'Activar empresa' }}</h3>
          <button class="btn-close" @click="showToggleModal = false">
            <i class="pi pi-times" />
          </button>
        </div>
        <div class="modal-body">
          <p>
            {{ toggleTarget?.active
              ? `¿Desactivar "${toggleTarget?.name}"?`
              : `¿Activar "${toggleTarget?.name}"?` }}
          </p>
          <div v-if="toggleTarget?.active" class="field" style="margin-top: 0.75rem">
            <label>Motivo de desactivación</label>
            <input v-model="toggleReason" placeholder="Ej: Falta de pago" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showToggleModal = false">Cancelar</button>
          <button
            :class="toggleTarget?.active ? 'btn-danger' : 'btn-primary'"
            :disabled="saving"
            @click="confirmToggle"
          >
            {{ saving ? 'Procesando...' : (toggleTarget?.active ? 'Desactivar' : 'Activar') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.message }}</div>

    <!-- ═══════════ MODAL CREAR USUARIO ═══════════ -->
    <div v-if="showUserModal" class="modal-overlay" @click.self="showUserModal = false">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3>Crear usuario — {{ createUserEnterprise?.name }}</h3>
          <button class="btn-close" @click="showUserModal = false"><i class="pi pi-times" /></button>
        </div>

        <div class="modal-body">
          <p class="user-modal-info">
            Se creará un usuario administrador para esta empresa. Al primer inicio de sesión,
            el sistema obligará al usuario a cambiar la contraseña.
          </p>

          <div class="section-title">Acceso</div>
          <div class="grid">
            <div class="field">
              <label>Usuario (login) <span class="req">*</span></label>
              <input v-model="userForm.usuario" placeholder="Ej: cootranstur" />
              <small v-if="userErrors.usuario" class="error-text">{{ userErrors.usuario }}</small>
            </div>
            <div class="field">
              <label>Contraseña temporal <span class="req">*</span></label>
              <input v-model="userForm.password" type="password" placeholder="Mín. 6 caracteres" />
              <small v-if="userErrors.password" class="error-text">{{ userErrors.password }}</small>
            </div>
          </div>

          <div class="section-title">Datos personales</div>
          <div class="grid">
            <div class="field">
              <label>Nombre</label>
              <input v-model="userForm.nombre" placeholder="Nombre" />
            </div>
            <div class="field">
              <label>Apellido</label>
              <input v-model="userForm.apellido" placeholder="Apellido" />
            </div>
            <div class="field full">
              <label>Correo electrónico <span class="req">*</span></label>
              <input v-model="userForm.correo" type="email" placeholder="correo@empresa.com" />
              <small class="hint-text">Se enviará la contraseña temporal a este correo.</small>
              <small v-if="userErrors.correo" class="error-text">{{ userErrors.correo }}</small>
            </div>
            <div class="field">
              <label>Teléfono</label>
              <input v-model="userForm.telefono" placeholder="Teléfono" />
            </div>
            <div class="field">
              <label>Tipo de documento</label>
              <select v-model.number="userForm.document_type">
                <option :value="1">CC</option>
                <option :value="2">NIT</option>
                <option :value="3">CE</option>
                <option :value="4">Pasaporte</option>
              </select>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="showUserModal = false">Cancelar</button>
          <button class="btn-primary" :disabled="savingUser" @click="saveEnterpriseUser">
            {{ savingUser ? 'Creando...' : 'Crear usuario' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════ MODAL USUARIOS ADMIN ═══════════ -->
    <div v-if="showAdminUsersModal" class="modal-overlay" @click.self="showAdminUsersModal = false">
      <div class="modal modal-md">
        <div class="modal-header">
          <h3>Usuarios admin — {{ adminUsersEnterprise?.name }}</h3>
          <button class="btn-close" @click="showAdminUsersModal = false"><i class="pi pi-times" /></button>
        </div>
        <div class="modal-body">
          <div v-if="adminUsersLoading" class="loading-state">
            <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem" />
          </div>
          <div v-else-if="adminUsersList.length === 0" class="empty-cell" style="padding: 1.5rem 0; text-align: center; color: #9ca3af;">
            No hay usuarios administradores para esta empresa.
          </div>
          <div v-else class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in adminUsersList" :key="u._id">
                  <td><strong>{{ u.usuario?.usuario }}</strong></td>
                  <td>{{ [u.usuario?.nombre, u.usuario?.apellido].filter(Boolean).join(' ') || '—' }}</td>
                  <td style="font-size: 0.8rem; color: #6b7280;">{{ u.usuario?.correo || '—' }}</td>
                  <td>
                    <span :class="['badge', u.active ? 'badge-green' : 'badge-red']">
                      {{ u.active ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td>
                    <button class="btn-icon btn-icon-orange" title="Cambiar contraseña" @click="openChangePassword(u)">
                      <i class="pi pi-key" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showAdminUsersModal = false">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- ═══════════ MODAL CAMBIAR CONTRASEÑA ═══════════ -->
    <div v-if="showPasswordModal" class="modal-overlay" @click.self="showPasswordModal = false">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3>Cambiar contraseña — {{ passwordTargetUser?.usuario?.usuario }}</h3>
          <button class="btn-close" @click="showPasswordModal = false"><i class="pi pi-times" /></button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: #6b7280; margin-bottom: 1rem;">
            El usuario deberá usar esta nueva contraseña en su próximo inicio de sesión.
          </p>
          <div class="field">
            <label>Nueva contraseña <span class="req">*</span></label>
            <input v-model="newPassword" type="password" placeholder="Mín. 6 caracteres" />
            <small v-if="passwordError" class="error-text">{{ passwordError }}</small>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showPasswordModal = false">Cancelar</button>
          <button class="btn-primary" :disabled="savingPassword" @click="confirmChangePassword">
            {{ savingPassword ? 'Guardando...' : 'Guardar contraseña' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════ PANEL VEHÍCULOS ═══════════ -->
    <div v-if="showVehiclesPanel" class="modal-overlay" @click.self="showVehiclesPanel = false">
      <div class="modal modal-xl">
        <div class="modal-header">
          <h3>Vehículos — {{ vehiclesPanelEnterprise?.name }}</h3>
          <button class="btn-close" @click="showVehiclesPanel = false">
            <i class="pi pi-times" />
          </button>
        </div>

        <!-- Tabs -->
        <div class="panel-tabs">
          <button
            :class="['tab-btn', vehiclesPanelTab === 'vehicles' ? 'tab-active' : '']"
            @click="vehiclesPanelTab = 'vehicles'"
          >Vehículos</button>
          <button
            :class="['tab-btn', vehiclesPanelTab === 'contracts' ? 'tab-active' : '']"
            @click="vehiclesPanelTab = 'contracts'"
          >Contratos</button>
          <button
            :class="['tab-btn', vehiclesPanelTab === 'audit' ? 'tab-active' : '']"
            @click="vehiclesPanelTab = 'audit'"
          >Auditoría</button>
        </div>

        <div class="modal-body" style="max-height: 65vh;">

          <!-- Loading -->
          <div v-if="vehiclesLoading" class="loading-state">
            <i class="pi pi-spin pi-spinner" style="font-size: 1.8rem" />
          </div>

          <!-- TAB: VEHÍCULOS -->
          <template v-else-if="vehiclesPanelTab === 'vehicles'">

            <!-- ── Barra 1: Habilitar inactivos con fecha ── -->
            <div v-if="selectedForActivate.length > 0" class="action-bar action-bar-blue">
              <span class="action-bar-info">
                <i class="pi pi-check-circle" />
                {{ selectedForActivate.length }} vehículo(s) inactivo(s) para habilitar
              </span>
              <div class="activate-controls">
                <label class="activate-label">Fecha habilitación:</label>
                <input v-model="activationDate" type="date" class="date-input" />
                <button
                  class="btn-primary btn-sm"
                  :disabled="!activationDate || activating"
                  @click="activateSelected"
                >
                  <i class="pi pi-check-circle" />
                  {{ activating ? 'Activando...' : 'Habilitar' }}
                </button>
              </div>
            </div>

            <!-- ── Barra 2: Aprobar activaciones pendientes ── -->
            <div v-if="selectedForActApprove.length > 0" class="action-bar action-bar-green">
              <span class="action-bar-info">
                <i class="pi pi-check" />
                {{ selectedForActApprove.length }} solicitud(es) de activación seleccionada(s)
              </span>
              <button
                class="btn-sm btn-success"
                :disabled="approvingActBulk"
                @click="approveActivationBulk"
              >
                <i class="pi pi-check-circle" />
                {{ approvingActBulk ? 'Aprobando...' : 'Aprobar activaciones' }}
              </button>
            </div>

            <!-- ── Barra 3: Aprobar desactivaciones pendientes ── -->
            <div v-if="selectedForDeactApprove.length > 0" class="action-bar action-bar-orange">
              <span class="action-bar-info">
                <i class="pi pi-ban" />
                {{ selectedForDeactApprove.length }} solicitud(es) de desactivación seleccionada(s)
              </span>
              <button
                class="btn-sm btn-danger"
                :disabled="approvingDeactBulk"
                @click="approveDeactivationBulk"
              >
                <i class="pi pi-check" />
                {{ approvingDeactBulk ? 'Aprobando...' : 'Aprobar desactivaciones' }}
              </button>
            </div>

            <!-- Vehicles table -->
            <div class="table-wrap" style="margin-top: 0.5rem; overflow-x: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width:36px;"></th>
                    <th>Placa</th>
                    <th>Clase</th>
                    <th>Modelo</th>
                    <th>Estado</th>
                    <th>F. Creación</th>
                    <th>F. Habilitación</th>
                    <th>F. Sol. Activación</th>
                    <th>F. Sol. Desactivación</th>
                    <th>F. Desactivación</th>
                    <th>SICOV</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="v in vehiclesList" :key="v._id"
                    :class="{
                      'row-pending-deact': v.deactivation_estado === 'pendiente',
                      'row-pending-act': v.activation_estado === 'pendiente',
                    }"
                  >
                    <!-- Checkbox según tipo de estado -->
                    <td>
                      <!-- Inactivo sin solicitud → para habilitar con fecha -->
                      <input
                        v-if="!v.active && !v.activation_estado"
                        type="checkbox"
                        :value="v._id"
                        v-model="selectedForActivate"
                        style="accent-color:#1d4ed8; cursor:pointer;"
                        title="Seleccionar para habilitar"
                      />
                      <!-- Pendiente activación → para aprobar activación -->
                      <input
                        v-else-if="!v.active && v.activation_estado === 'pendiente'"
                        type="checkbox"
                        :value="v._id"
                        v-model="selectedForActApprove"
                        style="accent-color:#16a34a; cursor:pointer;"
                        title="Seleccionar para aprobar activación"
                      />
                      <!-- Pendiente desactivación → para aprobar desactivación -->
                      <input
                        v-else-if="v.active && v.deactivation_estado === 'pendiente'"
                        type="checkbox"
                        :value="v._id"
                        v-model="selectedForDeactApprove"
                        style="accent-color:#dc2626; cursor:pointer;"
                        title="Seleccionar para aprobar desactivación"
                      />
                    </td>

                    <td><strong>{{ v.placa }}</strong></td>
                    <td>{{ v.clase || '—' }}</td>
                    <td>{{ v.modelo || '—' }}</td>

                    <td>
                      <span v-if="v.active && v.deactivation_estado === 'pendiente'" class="badge badge-yellow">Desact. pendiente</span>
                      <span v-else-if="!v.active && v.activation_estado === 'pendiente'" class="badge badge-cyan">Act. pendiente</span>
                      <span v-else :class="['badge', v.active ? 'badge-green' : 'badge-red']">{{ v.active ? 'Activo' : 'Inactivo' }}</span>
                    </td>

                    <td class="date-cell">{{ fmtDate(v.createdAt) }}</td>
                    <td class="date-cell">{{ fmtDate(v.fecha_activacion) }}</td>
                    <td class="date-cell" :style="v.fecha_solicitud_activacion ? 'color:#166534;font-weight:600' : ''">
                      {{ fmtDate(v.fecha_solicitud_activacion) }}
                    </td>
                    <td class="date-cell" :style="v.fecha_solicitud_desactivacion ? 'color:#92400e;font-weight:600' : ''">
                      {{ fmtDate(v.fecha_solicitud_desactivacion) }}
                    </td>
                    <td class="date-cell">{{ fmtDate(v.fecha_ultima_desactivacion) }}</td>

                    <td>
                      <button
                        :class="['toggle-btn', v.sicov_sync_enabled ? 'toggle-on' : 'toggle-off']"
                        :title="v.sicov_sync_enabled ? 'Deshabilitar sync SICOV' : 'Habilitar sync SICOV'"
                        @click="toggleSicov(v)"
                      >
                        <i :class="v.sicov_sync_enabled ? 'pi pi-wifi' : 'pi pi-times-circle'" />
                        {{ v.sicov_sync_enabled ? 'ON' : 'OFF' }}
                      </button>
                    </td>

                    <td style="white-space:nowrap;">
                      <!-- Aprobar/Rechazar desactivación -->
                      <template v-if="v.deactivation_estado === 'pendiente'">
                        <button
                          class="btn-sm btn-danger"
                          style="margin-right:0.3rem;"
                          :title="`Motivo: ${v.nota_desactivacion}`"
                          :disabled="approvingDeact"
                          @click="approveDeactivation(v)"
                        >
                          <i class="pi pi-check" /> Aprobar
                        </button>
                        <button class="btn-sm btn-secondary" :disabled="approvingDeact" @click="rejectDeactivation(v)">
                          <i class="pi pi-times" /> Rechazar
                        </button>
                      </template>
                      <!-- Aprobar/Rechazar activación -->
                      <template v-else-if="v.activation_estado === 'pendiente'">
                        <button
                          class="btn-sm btn-success"
                          style="margin-right:0.3rem;"
                          :title="`Motivo: ${v.nota_activacion}`"
                          :disabled="approvingDeact"
                          @click="approveActivationSingle(v)"
                        >
                          <i class="pi pi-check" /> Aprobar
                        </button>
                        <button class="btn-sm btn-secondary" :disabled="approvingDeact" @click="rejectActivationSingle(v)">
                          <i class="pi pi-times" /> Rechazar
                        </button>
                      </template>
                    </td>
                  </tr>
                  <tr v-if="vehiclesList.length === 0">
                    <td colspan="12" class="empty-cell">No hay vehículos registrados</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <!-- TAB: CONTRATOS -->
          <template v-else-if="vehiclesPanelTab === 'contracts'">
            <div class="table-wrap" style="margin-top: 0.5rem;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>N° Contrato</th>
                    <th>F. Activación</th>
                    <th>Placas</th>
                    <th>Activado por</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in contractsList" :key="c._id">
                    <td><strong>{{ c.numero_contrato }}</strong></td>
                    <td>{{ new Date(c.fecha_activacion).toLocaleDateString('es-CO') }}</td>
                    <td>{{ c.placas?.join(', ') || '—' }}</td>
                    <td>{{ c.activated_by_name || '—' }}</td>
                    <td>{{ c.notas || '—' }}</td>
                  </tr>
                  <tr v-if="contractsList.length === 0">
                    <td colspan="5" class="empty-cell">No hay contratos de habilitación</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <!-- TAB: AUDITORÍA -->
          <template v-else-if="vehiclesPanelTab === 'audit'">
            <div class="table-wrap" style="margin-top: 0.5rem;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Acción</th>
                    <th>Vehículo</th>
                    <th>Usuario</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="log in auditLogs" :key="log._id">
                    <td style="white-space: nowrap;">{{ new Date(log.createdAt).toLocaleString('es-CO') }}</td>
                    <td>
                      <span :class="['badge', log.action?.includes('DEACTIVAT') ? 'badge-red' : 'badge-green']">
                        {{ log.action }}
                      </span>
                    </td>
                    <td>{{ log.entity_id || '—' }}</td>
                    <td>{{ log.user_name || log.user_id || '—' }}</td>
                    <td style="font-size: 0.78rem; color: #6b7280; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      {{ log.details ? JSON.stringify(log.details) : '—' }}
                    </td>
                  </tr>
                  <tr v-if="auditLogs.length === 0">
                    <td colspan="5" class="empty-cell">No hay registros de auditoría</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="showVehiclesPanel = false">Cerrar</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { AuthserviceApi } from '../../api/auth.service'
import { VehiclesserviceApi } from '../../api/vehicles.service'

interface Enterprise {
  _id: string
  name: string
  description?: string
  document_number?: string
  packageType?: string
  address?: string
  phone_number?: string
  movil_number?: string
  vigiladoId?: number | null
  vigiladoToken?: string
  format_enlistment_consecutive?: string
  format_enlistment_maintenance?: string
  formato_type?: string
  formato_alistamiento?: Record<string, any>
  formato_correctivo?: Record<string, any>
  formato_preventivo?: Record<string, any>
  tipo_habilitacion?: 'CARRETERA' | 'ESPECIAL' | 'MIXTO'
  active: boolean
  admin: boolean
}

const enterprises = ref<Enterprise[]>([])
const loading = ref(true)
const saving = ref(false)
const showModal = ref(false)
const editing = ref<Enterprise | null>(null)
const showToggleModal = ref(false)
const toggleTarget = ref<Enterprise | null>(null)
const toggleReason = ref('')
const errors = ref<Record<string, string>>({})
const jsonErrors = ref<Record<string, string>>({})
const toast = ref({ show: false, message: '', type: 'success' })

const formatoAlistamientoText = ref('')
const formatoCorrectivoText = ref('')
const formatoPreventivoText = ref('')

const emptyForm = () => ({
  name: '',
  description: '',
  address: '',
  document_number: '',
  phone_number: '',
  movil_number: '',
  packageType: 'enterprise',
  tipo_habilitacion: 'CARRETERA' as 'CARRETERA' | 'ESPECIAL' | 'MIXTO',
  vigiladoId: null as number | null,
  vigiladoToken: '',
  format_enlistment_consecutive: 'EL-{YYYY}-{0001}',
  format_enlistment_maintenance: 'EM-{YYYY}-{0001}',
  formato_type: 'A4',
})

const form = ref(emptyForm())

const DEFAULT_FORMATO_ALISTAMIENTO = {
  pagina: { tamanio: 'A4', orientacion: 'landscape', margenes_mm: { superior: 10, inferior: 10, izquierdo: 8, derecho: 8 } },
  encabezado: {
    titulo: 'SERVICIO DE TRANSPORTE TERRESTRE DE PASAJEROS - PROTOCOLO DE ALISTAMIENTO Y/O REVISION DIARIA DE VEHICULOS',
    mostrar_logo: true,
    fuente_titulo_pt: 9,
  },
  datos_cabecera: [
    { label: 'VIGILADO', campo: 'enterprise.name' },
    { label: 'FECHA', campo: 'alistamiento.fecha' },
    { label: 'CIUDAD', campo: 'alistamiento.ciudad' },
    { label: 'MODALIDAD', campo: 'vehicle.modalidad' },
    { label: 'PLACA', campo: 'vehicle.placa' },
    { label: 'Nº INTERNO', campo: 'vehicle.no_interno' },
    { label: 'HORA', campo: 'alistamiento.hora' },
    { label: 'NOMBRE OPERADOR 1', campo: 'alistamiento.operador1_nombre' },
    { label: 'IDENTIFICACION OPERADOR 1', campo: 'alistamiento.operador1_id' },
    { label: 'NOMBRE OPERADOR 2', campo: 'alistamiento.operador2_nombre' },
    { label: 'IDENTIFICACION OPERADOR 2', campo: 'alistamiento.operador2_id' },
    { label: 'RUTA', campo: 'alistamiento.ruta' },
  ],
  secciones: [
    {
      id: 'estado_motor', titulo: 'ESTADO MOTOR',
      columnas_resultado: ['O.K.', 'N.C.', 'N.A.'],
      items: [
        { id: 'niveles_aceite', label: 'NIVELES DE ACEITE' },
        { id: 'nivel_fluidos', label: 'NIVEL DE FLUIDOS' },
        { id: 'filtros_otros', label: 'FILTROS Y OTROS' },
        { id: 'fugas_aceite', label: 'FUGAS DE ACEITE' },
        { id: 'fugas_agua_refrigerante', label: 'FUGAS DE AGUAS Y REFRIGERANTE' },
        { id: 'fugas_hidraulico', label: 'FUGAS HIDRAULICO' },
        { id: 'baterias_bornes', label: 'BATERIAS, BORNES Y CABLES' },
        { id: 'fuga_combustible', label: 'FUGA DE COMBUSTIBLE' },
        { id: 'tension_correas', label: 'TENSION CORREAS' },
        { id: 'estado_direccion', label: 'ESTADO DIRECCION' },
        { id: 'estado_frenos', label: 'ESTADO DE FRENOS' },
        { id: 'luces_principales', label: 'ESTADO LUCES PRINCIPALES' },
        { id: 'luces_secundarias', label: 'ESTADO DE LUCES SECUNDARIAS' },
        { id: 'juego_correas', label: 'JUEGO CORREAS' },
      ],
    },
    {
      id: 'carroceria_chasis', titulo: 'CARROCERIA Y CHASIS',
      columnas_resultado: ['O.K.', 'N.C.', 'N.A.'],
      items: [
        { id: 'imagen_corporativa', label: 'IMAGEN CORPORATIVA' },
        { id: 'estado_carroceria', label: 'ESTADO CARROCERIA' },
        { id: 'estado_vidrios', label: 'ESTADO VIDRIOS' },
        { id: 'estado_llantas', label: 'ESTADO DE LLANTAS' },
        { id: 'llanta_repuesto', label: 'LLANTA DE REPUESTO' },
        { id: 'estado_esparragos', label: 'ESTADO DE ESPARRAGOS' },
        { id: 'profundidad_labrado', label: 'PROFUNDIDAD Y LABRADO' },
        { id: 'bodegas', label: 'BODEGAS' },
        { id: 'rines', label: 'RINES' },
        { id: 'banos', label: 'BAÑOS' },
        { id: 'monitores_audio', label: 'MONITORES-TOMAS Y AUDIO' },
        { id: 'dispositivo_velocidad', label: 'DISPOSITIVO DE VELOCIDAD' },
        { id: 'aire_acondicionado', label: 'AIRE ACONDICIONADO' },
        { id: 'silleteria', label: 'SILLETERIA' },
        { id: 'pito_reversa', label: 'PITO REVERSA' },
      ],
    },
    {
      id: 'seguridad_vial', titulo: 'SEGURIDAD VIAL',
      columnas_resultado: ['O.K.', 'N.C.', 'N.A.'],
      items: [
        { id: 'aseo_general', label: 'ASEO GENERAL' },
        { id: 'aseo_banos', label: 'ASEO BAÑOS' },
        { id: 'herramientas', label: 'HERRAMIENTAS' },
        { id: 'botiquin', label: 'BOTIQUIN' },
        { id: 'conos_mecheros', label: 'CONOS O MECHEROS' },
        { id: 'chaleco', label: 'CHALECO' },
        { id: 'linterna', label: 'LINTERNA' },
        { id: 'gato_copas_palanca', label: 'GATO, COPAS Y PALANCA' },
        { id: 'extintor', label: 'EXTINTOR (3)' },
        { id: 'cinturones', label: 'CINTURONES (1,2,3,4)' },
        { id: 'cinturones_conductor', label: 'CINTURONES CONDUCTOR Y AUX.' },
        { id: 'fichas_equipaje', label: 'FICHAS DE EQUIPAJE' },
        { id: 'bolsas_mareo', label: 'BOLSAS DE MAREO' },
      ],
    },
  ],
  presentacion_personal: {
    titulo: 'PRESENTACION PERSONAL',
    columnas_resultado: ['B', 'R', 'M'],
    items: [{ id: 'documentos', label: 'DOCUMENTOS' }],
  },
  pie_pagina: {
    mostrar_firma_conductor: true,
    mostrar_firma_inspector: true,
    label_firma_conductor: 'NOMBRE Y FIRMA DEL CONDUCTOR',
    label_firma_inspector: 'NOMBRE Y FIRMA DEL PERITO O INSPECTOR',
  },
  colores: {
    borde_tabla: '#000000',
    fondo_header: '#CCCCCC',
    fondo_seccion: '#4472C4',
    texto_seccion: '#FFFFFF',
    fondo_blanco: '#FFFFFF',
    texto_principal: '#000000',
  },
  fuentes: {
    principal: 'helvetica',
    negrita: 'helvetica-bold',
    tamanio_default_pt: 7,
    tamanio_titulo_pt: 8,
  },
}

const DEFAULT_FORMATO_MANTENIMIENTO = {
  pagina: { tamanio: 'A4', orientacion: 'portrait', margenes_mm: { superior: 10, inferior: 10, izquierdo: 8, derecho: 8 } },
  encabezado: {
    titulo: 'REVISION DE MANTENIMIENTO PREVENTIVO',
    mostrar_logo: true,
    mostrar_numero_revision: true,
    fuente_titulo_pt: 9,
  },
  tabla_items: {
    fuente_pt: 6.5,
    fuente_header_pt: 7,
    alto_fila_mm: 5.5,
    color_header_fondo: '#CCCCCC',
    color_seccion_fondo: '#EEEEEE',
    secciones_orden: [
      'REVISIÓN EXTERIOR', 'REVISIÓN INTERIOR', 'ELEMENTOS PARA PRODUCIR RUIDO',
      'ALUMBRADO Y SEÑALIZACION', 'SALIDA DE EMERGENCIA', 'EMISIONES CONTAMINANTES',
      'SISTEMAS DE FRENOS', 'SUSPENSION', 'DIRECCION', 'RINES Y LLANTAS',
      'MOTOR', 'SISTEMA DE COMBUSTIBLE', 'TRANSMISION',
    ],
  },
  pie_pagina: {
    mostrar_reglas: true,
    mostrar_firma: true,
    mostrar_sello: true,
    nota: 'Nota 1: los responsables de estos mantenimientos son: Ingeniero Mecánico, propietario, conductor, centro especializado y centros de diagnóstico',
  },
  colores: { borde_tabla: '#000000', fondo_header: '#CCCCCC', fondo_seccion: '#EEEEEE', texto_principal: '#000000' },
}

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3000)
}

function syncVigiladoId() {
  const parsed = parseInt(form.value.document_number, 10)
  form.value.vigiladoId = isNaN(parsed) ? null : parsed
}

function loadDefaultFormato(tipo: 'alistamiento' | 'correctivo' | 'preventivo') {
  const val = tipo === 'alistamiento' ? DEFAULT_FORMATO_ALISTAMIENTO : DEFAULT_FORMATO_MANTENIMIENTO
  const text = JSON.stringify(val, null, 2)
  if (tipo === 'alistamiento') formatoAlistamientoText.value = text
  else if (tipo === 'correctivo') formatoCorrectivoText.value = text
  else formatoPreventivoText.value = text
}

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  formatoAlistamientoText.value = ''
  formatoCorrectivoText.value = ''
  formatoPreventivoText.value = ''
  errors.value = {}
  jsonErrors.value = {}
  showModal.value = true
}

function openEdit(ent: Enterprise) {
  editing.value = ent
  form.value = {
    name: ent.name,
    description: ent.description ?? '',
    address: ent.address ?? '',
    document_number: ent.document_number ?? '',
    phone_number: ent.phone_number ?? '',
    movil_number: ent.movil_number ?? '',
    packageType: ent.packageType ?? 'enterprise',
    tipo_habilitacion: (ent.tipo_habilitacion as any) ?? 'CARRETERA',
    vigiladoId: ent.vigiladoId ?? null,
    vigiladoToken: ent.vigiladoToken ?? '',
    format_enlistment_consecutive: ent.format_enlistment_consecutive ?? 'EL-{YYYY}-{0001}',
    format_enlistment_maintenance: ent.format_enlistment_maintenance ?? 'EM-{YYYY}-{0001}',
    formato_type: ent.formato_type ?? 'A4',
  }
  formatoAlistamientoText.value = ent.formato_alistamiento
    ? JSON.stringify(ent.formato_alistamiento, null, 2) : ''
  formatoCorrectivoText.value = ent.formato_correctivo
    ? JSON.stringify(ent.formato_correctivo, null, 2) : ''
  formatoPreventivoText.value = ent.formato_preventivo
    ? JSON.stringify(ent.formato_preventivo, null, 2) : ''
  errors.value = {}
  jsonErrors.value = {}
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editing.value = null
}

function openToggle(ent: Enterprise) {
  toggleTarget.value = ent
  toggleReason.value = ''
  showToggleModal.value = true
}

function parseJsonField(text: string, field: string): Record<string, any> | null | undefined {
  if (!text.trim()) return null
  try {
    return JSON.parse(text)
  } catch {
    jsonErrors.value[field] = 'JSON inválido'
    return undefined
  }
}

async function save() {
  errors.value = {}
  jsonErrors.value = {}

  if (!form.value.name.trim()) {
    errors.value.name = 'El nombre es obligatorio'
    return
  }

  const formato_alistamiento = parseJsonField(formatoAlistamientoText.value, 'alistamiento')
  const formato_correctivo = parseJsonField(formatoCorrectivoText.value, 'correctivo')
  const formato_preventivo = parseJsonField(formatoPreventivoText.value, 'preventivo')

  if (Object.keys(jsonErrors.value).length > 0) return

  saving.value = true
  try {
    const payload: Record<string, any> = { ...form.value }
    if (formato_alistamiento !== null) payload.formato_alistamiento = formato_alistamiento
    if (formato_correctivo !== null) payload.formato_correctivo = formato_correctivo
    if (formato_preventivo !== null) payload.formato_preventivo = formato_preventivo
    if (!payload.vigiladoId) delete payload.vigiladoId
    if (!payload.vigiladoToken) delete payload.vigiladoToken

    if (editing.value) {
      const { data } = await AuthserviceApi.updateEnterprise(editing.value._id, payload)
      const idx = enterprises.value.findIndex(e => e._id === editing.value!._id)
      if (idx !== -1) enterprises.value[idx] = data
    } else {
      const { data } = await AuthserviceApi.createEnterprise(payload)
      enterprises.value.unshift(data)
    }
    showToast(editing.value ? 'Empresa actualizada' : 'Empresa creada')
    closeModal()
  } catch (e: any) {
    showToast(e?.response?.data?.message || 'Error al guardar', 'error')
  } finally {
    saving.value = false
  }
}

async function confirmToggle() {
  if (!toggleTarget.value) return
  saving.value = true
  try {
    const { data } = await AuthserviceApi.toggleEnterpriseActive(toggleTarget.value._id, {
      active: !toggleTarget.value.active,
      reason: toggleReason.value || undefined,
    })
    const idx = enterprises.value.findIndex(e => e._id === toggleTarget.value!._id)
    if (idx !== -1) enterprises.value[idx] = data
    showToast(data.active ? 'Empresa activada' : 'Empresa desactivada')
    showToggleModal.value = false
  } catch (e: any) {
    showToast(e?.response?.data?.message || 'Error al cambiar estado', 'error')
  } finally {
    saving.value = false
  }
}

// ── Create enterprise user ────────────────────────────────────────────
const showUserModal = ref(false)
const createUserEnterprise = ref<Enterprise | null>(null)
const savingUser = ref(false)

const emptyUserForm = () => ({
  usuario: '',
  password: '',
  nombre: '',
  apellido: '',
  correo: '',
  telefono: '',
  document_type: 1,
})

const userForm = reactive(emptyUserForm())
const userErrors = ref<Record<string, string>>({})

function openCreateUser(ent: Enterprise) {
  createUserEnterprise.value = ent
  Object.assign(userForm, emptyUserForm())
  userErrors.value = {}
  showUserModal.value = true
}

async function saveEnterpriseUser() {
  userErrors.value = {}

  if (!userForm.usuario.trim()) {
    userErrors.value.usuario = 'El usuario es obligatorio'
    return
  }
  if (!userForm.password || userForm.password.length < 6) {
    userErrors.value.password = 'La contraseña debe tener al menos 6 caracteres'
    return
  }
  if (!userForm.correo.trim()) {
    userErrors.value.correo = 'El correo es obligatorio para el envío de credenciales'
    return
  }

  savingUser.value = true
  try {
    await AuthserviceApi.createEnterpriseUser(createUserEnterprise.value!._id, {
      usuario: userForm.usuario.trim(),
      password: userForm.password,
      nombre: userForm.nombre || undefined,
      apellido: userForm.apellido || undefined,
      correo: userForm.correo.trim(),
      telefono: userForm.telefono || undefined,
      document_type: userForm.document_type,
    })
    showToast(`Usuario "${userForm.usuario}" creado. Se enviaron las credenciales a ${userForm.correo}`)
    showUserModal.value = false
  } catch (e: any) {
    showToast(e?.response?.data?.message || 'Error al crear el usuario', 'error')
  } finally {
    savingUser.value = false
  }
}

// ── Admin users panel ─────────────────────────────────────────────────
const showAdminUsersModal = ref(false)
const adminUsersEnterprise = ref<Enterprise | null>(null)
const adminUsersList = ref<any[]>([])
const adminUsersLoading = ref(false)

async function openAdminUsers(ent: Enterprise) {
  adminUsersEnterprise.value = ent
  adminUsersList.value = []
  showAdminUsersModal.value = true
  adminUsersLoading.value = true
  try {
    const { data } = await AuthserviceApi.getEnterpriseAdmins(ent._id)
    adminUsersList.value = data
  } catch (e: any) {
    showToast(e?.response?.data?.message || 'Error cargando usuarios', 'error')
  } finally {
    adminUsersLoading.value = false
  }
}

// ── Change password ────────────────────────────────────────────────────
const showPasswordModal = ref(false)
const passwordTargetUser = ref<any | null>(null)
const newPassword = ref('')
const passwordError = ref('')
const savingPassword = ref(false)

function openChangePassword(user: any) {
  passwordTargetUser.value = user
  newPassword.value = ''
  passwordError.value = ''
  showPasswordModal.value = true
}

async function confirmChangePassword() {
  passwordError.value = ''
  if (!newPassword.value || newPassword.value.length < 6) {
    passwordError.value = 'La contraseña debe tener al menos 6 caracteres'
    return
  }
  savingPassword.value = true
  try {
    await AuthserviceApi.changePassword(passwordTargetUser.value._id, newPassword.value)
    showToast(`Contraseña de "${passwordTargetUser.value.usuario?.usuario}" actualizada`)
    showPasswordModal.value = false
  } catch (e: any) {
    showToast(e?.response?.data?.message || 'Error al cambiar contraseña', 'error')
  } finally {
    savingPassword.value = false
  }
}

// ── Vehicle panel ─────────────────────────────────────────────────────
const showVehiclesPanel = ref(false)
const vehiclesPanelEnterprise = ref<Enterprise | null>(null)
const vehiclesPanelTab = ref<'vehicles' | 'contracts' | 'audit'>('vehicles')
const vehiclesList = ref<any[]>([])
const contractsList = ref<any[]>([])
const auditLogs = ref<any[]>([])
const vehiclesLoading = ref(false)
const activationDate = ref(new Date().toISOString().split('T')[0])
const activating = ref(false)

// ── Selección por tipo de acción ──────────────────────────────────────
const selectedForActivate = ref<string[]>([])       // inactivos sin solicitud → habilitación con fecha
const selectedForActApprove = ref<string[]>([])     // pendiente activación → aprobar activación
const selectedForDeactApprove = ref<string[]>([])   // pendiente desactivación → aprobar desactivación

function clearAllSelections() {
  selectedForActivate.value = []
  selectedForActApprove.value = []
  selectedForDeactApprove.value = []
}

async function openVehiclesPanel(ent: Enterprise) {
  vehiclesPanelEnterprise.value = ent
  vehiclesPanelTab.value = 'vehicles'
  clearAllSelections()
  activationDate.value = new Date().toISOString().split('T')[0]
  showVehiclesPanel.value = true
  await loadVehiclesData(ent._id)
}

async function loadVehiclesData(enterpriseId: string) {
  vehiclesLoading.value = true
  clearAllSelections()
  try {
    const [vRes, cRes, aRes] = await Promise.all([
      VehiclesserviceApi.getByEnterprise(enterpriseId),
      VehiclesserviceApi.getContractsByEnterprise(enterpriseId),
      VehiclesserviceApi.getAuditLogs({ enterprise_id: enterpriseId, numero_items: 50 }),
    ])
    vehiclesList.value = vRes.data
    contractsList.value = cRes.data
    auditLogs.value = aRes.data?.items ?? aRes.data ?? []
  } catch (e: any) {
    showToast(e?.response?.data?.message || 'Error cargando datos de vehículos', 'error')
  } finally {
    vehiclesLoading.value = false
  }
}

// ── Activar (inactivos sin solicitud) con fecha ───────────────────────
async function activateSelected() {
  if (!selectedForActivate.value.length || !activationDate.value) return
  activating.value = true
  try {
    await VehiclesserviceApi.activateBulk({
      enterprise_id: vehiclesPanelEnterprise.value!._id,
      vehicle_ids: selectedForActivate.value,
      fecha_activacion: activationDate.value,
    })
    const count = selectedForActivate.value.length
    clearAllSelections()
    showToast(`${count} vehículo(s) habilitado(s) correctamente`)
    await loadVehiclesData(vehiclesPanelEnterprise.value!._id)
  } catch (e: any) {
    showToast(e?.response?.data?.message || 'Error al activar vehículos', 'error')
  } finally {
    activating.value = false
  }
}

// ── Aprobar activación masiva (pendiente activación) ──────────────────
const approvingActBulk = ref(false)
async function approveActivationBulk() {
  if (!selectedForActApprove.value.length) return
  if (!confirm(`¿Aprobar activación de ${selectedForActApprove.value.length} vehículo(s)?`)) return
  approvingActBulk.value = true
  try {
    const res = await VehiclesserviceApi.approveActivationBulk(selectedForActApprove.value)
    showToast(`${res.data.approved} vehículo(s) activado(s). Se notificó a la empresa.`)
    clearAllSelections()
    await loadVehiclesData(vehiclesPanelEnterprise.value!._id)
  } catch (e: any) {
    showToast(e?.response?.data?.message || 'Error al aprobar activaciones', 'error')
  } finally {
    approvingActBulk.value = false
  }
}

// ── Aprobar desactivación masiva (pendiente desactivación) ────────────
const approvingDeactBulk = ref(false)
async function approveDeactivationBulk() {
  if (!selectedForDeactApprove.value.length) return
  if (!confirm(`¿Aprobar desactivación de ${selectedForDeactApprove.value.length} vehículo(s)?`)) return
  approvingDeactBulk.value = true
  try {
    const res = await VehiclesserviceApi.approveDeactivationBulk(selectedForDeactApprove.value)
    showToast(`${res.data.approved} vehículo(s) desactivado(s). Se notificó a la empresa.`)
    clearAllSelections()
    await loadVehiclesData(vehiclesPanelEnterprise.value!._id)
  } catch (e: any) {
    showToast(e?.response?.data?.message || 'Error al aprobar desactivaciones', 'error')
  } finally {
    approvingDeactBulk.value = false
  }
}

async function toggleSicov(vehicle: any) {
  try {
    await VehiclesserviceApi.toggleSicov(vehicle._id)
    vehicle.sicov_sync_enabled = !vehicle.sicov_sync_enabled
    showToast('Sincronización SICOV actualizada')
  } catch (e: any) {
    showToast(e?.response?.data?.message || 'Error al actualizar SICOV', 'error')
  }
}

const approvingDeact = ref(false)

async function approveDeactivation(vehicle: any) {
  if (!confirm(`¿Aprobar desactivación de ${vehicle.placa}?\nMotivo: ${vehicle.nota_desactivacion}`)) return
  approvingDeact.value = true
  try {
    await VehiclesserviceApi.approveDeactivation(vehicle._id)
    showToast(`Vehículo ${vehicle.placa} desactivado. Se notificó a la empresa.`)
    await loadVehiclesData(vehiclesPanelEnterprise.value!._id)
  } catch (e: any) {
    showToast(e?.response?.data?.message || 'Error al aprobar desactivación', 'error')
  } finally {
    approvingDeact.value = false
  }
}

async function rejectDeactivation(vehicle: any) {
  if (!confirm(`¿Rechazar solicitud de desactivación de ${vehicle.placa}?`)) return
  approvingDeact.value = true
  try {
    await VehiclesserviceApi.rejectDeactivation(vehicle._id)
    showToast(`Solicitud de desactivación de ${vehicle.placa} rechazada`)
    await loadVehiclesData(vehiclesPanelEnterprise.value!._id)
  } catch (e: any) {
    showToast(e?.response?.data?.message || 'Error al rechazar solicitud', 'error')
  } finally {
    approvingDeact.value = false
  }
}

async function approveActivationSingle(vehicle: any) {
  if (!confirm(`¿Aprobar activación de ${vehicle.placa}?`)) return
  approvingDeact.value = true
  try {
    await VehiclesserviceApi.approveActivation(vehicle._id)
    showToast(`Vehículo ${vehicle.placa} activado. Se notificó a la empresa.`)
    await loadVehiclesData(vehiclesPanelEnterprise.value!._id)
  } catch (e: any) {
    showToast(e?.response?.data?.message || 'Error al aprobar activación', 'error')
  } finally {
    approvingDeact.value = false
  }
}

async function rejectActivationSingle(vehicle: any) {
  if (!confirm(`¿Rechazar solicitud de activación de ${vehicle.placa}?`)) return
  approvingDeact.value = true
  try {
    await VehiclesserviceApi.rejectActivation(vehicle._id)
    showToast(`Solicitud de activación de ${vehicle.placa} rechazada`)
    await loadVehiclesData(vehiclesPanelEnterprise.value!._id)
  } catch (e: any) {
    showToast(e?.response?.data?.message || 'Error al rechazar solicitud', 'error')
  } finally {
    approvingDeact.value = false
  }
}

// Helper para formatear fechas
function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

onMounted(async () => {
  try {
    const { data } = await AuthserviceApi.getAllEnterprises()
    enterprises.value = data
  } catch (e: any) {
    showToast(e?.response?.data?.message || 'Error cargando empresas', 'error')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page { padding: 1.5rem; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.page-title { font-size: 1.4rem; font-weight: 700; color: #1e3a8a; margin: 0; }

.loading-state { display: flex; justify-content: center; padding: 3rem; }

.table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.data-table th { background: #1e40af; color: white; padding: 0.75rem 1rem; text-align: left; font-weight: 600; white-space: nowrap; }
.data-table td { padding: 0.65rem 1rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: #f0f4ff; }
.token-cell { font-size: 0.75rem; color: #6b7280; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-cell { text-align: center; color: #9ca3af; padding: 2rem; }
.actions-cell { white-space: nowrap; }

.badge { padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
.badge-green { background: #dcfce7; color: #166534; }
.badge-red { background: #fee2e2; color: #991b1b; }
.badge-blue { background: #dbeafe; color: #1d4ed8; }
.badge-gray { background: #f3f4f6; color: #374151; }
.badge-yellow { background: #fef3c7; color: #92400e; }
.badge-cyan { background: #d1fae5; color: #065f46; }
.row-pending-deact td { background: #fffbeb !important; }
.row-pending-act td { background: #f0fdf4 !important; }
.date-cell { font-size: 0.78rem; white-space: nowrap; }

/* ── Barras de acción masiva ── */
.action-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.55rem 0.9rem; border-radius: 6px; margin-bottom: 0.4rem;
  font-size: 0.85rem;
}
.action-bar-blue  { background: #eff6ff; border: 1px solid #93c5fd; }
.action-bar-green { background: #f0fdf4; border: 1px solid #86efac; }
.action-bar-orange{ background: #fffbeb; border: 1px solid #fcd34d; }
.action-bar-info  { display: flex; align-items: center; gap: 0.4rem; font-weight: 600; }

.btn-success {
  background: #16a34a; color: #fff; border: none; border-radius: 6px;
  padding: 0.3rem 0.7rem; font-size: 0.8rem; cursor: pointer;
  display: inline-flex; align-items: center; gap: 0.3rem;
}
.btn-success:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-success:hover:not(:disabled) { background: #15803d; }

.btn-primary { background: #1e40af; color: white; border: none; padding: 0.5rem 1.25rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500; display: inline-flex; align-items: center; gap: 0.4rem; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { background: #1d3ea0; }
.btn-secondary { background: white; color: #374151; border: 1px solid #d1d5db; padding: 0.5rem 1.25rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
.btn-secondary:hover { background: #f9fafb; }
.btn-danger { background: #dc2626; color: white; border: none; padding: 0.5rem 1.25rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500; }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-danger:hover:not(:disabled) { background: #b91c1c; }
.btn-icon { background: none; border: none; cursor: pointer; color: #6b7280; padding: 0.3rem 0.5rem; border-radius: 4px; font-size: 1rem; }
.btn-icon:hover { background: #e5e7eb; color: #1e40af; }
.btn-close { background: none; border: none; cursor: pointer; color: #6b7280; font-size: 1.1rem; padding: 0.25rem; }
.btn-link { background: none; border: none; cursor: pointer; color: #1d4ed8; font-size: 0.75rem; font-weight: 500; padding: 0 0.25rem; text-decoration: underline; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: flex-start; justify-content: center; padding: 2rem 1rem; overflow-y: auto; }
.modal { background: white; border-radius: 10px; width: 100%; max-width: 700px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.modal-sm { max-width: 420px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; }
.modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #1e3a8a; }
.modal-body { padding: 1.25rem 1.5rem; max-height: 70vh; overflow-y: auto; }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; }

.section-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #1e40af; letter-spacing: 0.5px; margin: 1rem 0 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid #dbeafe; display: flex; align-items: center; justify-content: space-between; }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1rem; }
.field { display: flex; flex-direction: column; gap: 0.3rem; }
.field.full { grid-column: 1 / -1; }
.field label { font-size: 0.8rem; font-weight: 600; color: #374151; }
.req { color: #dc2626; }
.field input, .field select { padding: 0.45rem 0.65rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem; outline: none; }
.field input:focus, .field select:focus { border-color: #1d4ed8; box-shadow: 0 0 0 2px rgba(29,78,216,0.15); }
.disabled-input { background: #f3f4f6; color: #6b7280; }

.json-textarea { width: 100%; border: 1px solid #d1d5db; border-radius: 6px; padding: 0.5rem; font-family: monospace; font-size: 0.8rem; resize: vertical; outline: none; box-sizing: border-box; }
.json-textarea:focus { border-color: #1d4ed8; }

.error-text { color: #dc2626; font-size: 0.75rem; }

.toast { position: fixed; bottom: 1.5rem; right: 1.5rem; padding: 0.75rem 1.25rem; border-radius: 8px; font-size: 0.875rem; font-weight: 500; z-index: 2000; animation: fadeIn 0.2s ease; }
.toast.success { background: #166534; color: white; }
.toast.error { background: #991b1b; color: white; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 640px) {
  .grid { grid-template-columns: 1fr; }
}

/* ── Vehicles panel ───────────────────────────────────────── */
.modal-xl { max-width: 960px; }
.btn-icon-blue:hover { color: #1e40af !important; }
.btn-icon-green:hover { color: #166534 !important; }
.btn-icon-purple:hover { color: #7c3aed !important; }
.btn-icon-orange:hover { color: #d97706 !important; }
.modal-md { max-width: 600px; }
.user-modal-info { font-size: 0.85rem; color: #6b7280; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 0.65rem 0.9rem; margin-bottom: 0.25rem; }
.hint-text { color: #6b7280; font-size: 0.75rem; }
.btn-sm { padding: 0.4rem 0.9rem; font-size: 0.82rem; }

.panel-tabs { display: flex; gap: 0; border-bottom: 2px solid #e5e7eb; padding: 0 1.5rem; }
.tab-btn { background: none; border: none; cursor: pointer; padding: 0.65rem 1.2rem; font-size: 0.875rem; font-weight: 500; color: #6b7280; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color 0.15s, border-color 0.15s; }
.tab-btn:hover { color: #1e40af; }
.tab-active { color: #1e40af; border-bottom-color: #1e40af; }

.activate-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; background: #f0f4ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.75rem 1rem; }
.activate-info { font-size: 0.875rem; font-weight: 600; color: #1e40af; }
.activate-controls { display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; }
.activate-label { font-size: 0.82rem; font-weight: 500; color: #374151; }
.date-input { padding: 0.4rem 0.65rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem; outline: none; }
.date-input:focus { border-color: #1d4ed8; }

.toggle-btn { display: inline-flex; align-items: center; gap: 0.3rem; border: none; border-radius: 999px; padding: 0.25rem 0.6rem; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
.toggle-on { background: #dcfce7; color: #166534; }
.toggle-off { background: #fee2e2; color: #991b1b; }
</style>
