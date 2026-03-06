import { http } from './http';
const baseURL = import.meta.env.VITE_API_VEHICLES_URL;

export const VehiclesserviceApi = {
  // ── Empresa ───────────────────────────────────────────────────────
  list: (params?: Record<string, any>) =>
    http.get(`${baseURL}/vehicles`, { params }),

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
};
