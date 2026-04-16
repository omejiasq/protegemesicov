import { http } from './http';
const baseURL = import.meta.env.VITE_API_VEHICLES_URL;

export const VehiclesserviceApi = {
  // ── Empresa ───────────────────────────────────────────────────────
  list: (params?: Record<string, any>) =>
    http.get(`${baseURL}/vehicles`, { params }),

  getByPlate: (placa: string) =>
    http.get(`${baseURL}/vehicles/plate/${placa}`),

  get: (id: string) =>
    http.get(`${baseURL}/vehicles/${id}`),

  create: (data: any) =>
    http.post(`${baseURL}/vehicles`, data),

  update: (id: string, data: any) =>
    http.patch(`${baseURL}/vehicles/${id}`, data),

  toggle: (id: string) =>
    http.patch(`${baseURL}/vehicles/${id}/toggle`),

  /** Desactiva un vehículo con nota de desactivación */
  deactivate: (id: string, nota_desactivacion: string) =>
    http.patch(`${baseURL}/vehicles/${id}/deactivate`, { nota_desactivacion }),

  /** Solicitar activación de un vehículo inactivo */
  requestActivation: (id: string, nota_activacion: string) =>
    http.patch(`${baseURL}/vehicles/${id}/request-activation`, { nota_activacion }),

  /** Solicitar activación de múltiples vehículos */
  requestActivationBulk: (vehicle_ids: string[], nota_activacion: string) =>
    http.post(`${baseURL}/vehicles/request-activation-bulk`, { vehicle_ids, nota_activacion }),

  /** Solicitar desactivación de múltiples vehículos */
  requestDeactivationBulk: (vehicle_ids: string[], nota_desactivacion: string) =>
    http.post(`${baseURL}/vehicles/request-deactivation-bulk`, { vehicle_ids, nota_desactivacion }),

  // ── Superadmin ────────────────────────────────────────────────────
  /** Vehículos de una empresa específica (superadmin) */
  getByEnterprise: (enterpriseId: string) =>
    http.get(`${baseURL}/vehicles/admin/by-enterprise/${enterpriseId}`),

  /** Contratos de habilitación de una empresa (superadmin) */
  getContractsByEnterprise: (enterpriseId: string) =>
    http.get(`${baseURL}/vehicles/admin/contracts/${enterpriseId}`),

  /** Activar uno o varios vehículos (crea contrato de habilitación) */
  activateBulk: (data: {
    enterprise_id: string;
    vehicle_ids: string[];
    fecha_activacion: string;
    notas?: string;
  }) => http.post(`${baseURL}/vehicles/admin/activate-bulk`, data),

  /** Toggle de sincronización SICOV para un vehículo */
  toggleSicov: (id: string) =>
    http.patch(`${baseURL}/vehicles/admin/${id}/toggle-sicov`),

  /** Logs de auditoría de vehículos */
  getAuditLogs: (params?: Record<string, any>) =>
    http.get(`${baseURL}/vehicles/admin/audit`, { params }),

  /** Vehículos con solicitud de desactivación pendiente */
  getPendingDeactivations: () =>
    http.get(`${baseURL}/vehicles/admin/pending-deactivations`),

  /** Aprobar solicitud de desactivación (superadmin) */
  approveDeactivation: (id: string) =>
    http.patch(`${baseURL}/vehicles/admin/${id}/approve-deactivation`),

  /** Rechazar solicitud de desactivación (superadmin) */
  rejectDeactivation: (id: string) =>
    http.patch(`${baseURL}/vehicles/admin/${id}/reject-deactivation`),

  /** Vehículos con solicitud de activación pendiente (superadmin) */
  getPendingActivations: () =>
    http.get(`${baseURL}/vehicles/admin/pending-activations`),

  /** Aprobar solicitud de activación (superadmin) */
  approveActivation: (id: string) =>
    http.patch(`${baseURL}/vehicles/admin/${id}/approve-activation`),

  /** Rechazar solicitud de activación (superadmin) */
  rejectActivation: (id: string) =>
    http.patch(`${baseURL}/vehicles/admin/${id}/reject-activation`),

  /** Aprobar solicitud de desactivación de múltiples vehículos (superadmin) */
  approveDeactivationBulk: (vehicle_ids: string[]) =>
    http.post(`${baseURL}/vehicles/admin/approve-deactivation-bulk`, { vehicle_ids }),

  /** Aprobar solicitud de activación de múltiples vehículos (superadmin) */
  approveActivationBulk: (vehicle_ids: string[]) =>
    http.post(`${baseURL}/vehicles/admin/approve-activation-bulk`, { vehicle_ids }),
};
