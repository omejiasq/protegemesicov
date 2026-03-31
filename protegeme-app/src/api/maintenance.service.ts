import { http } from "./http";
const baseURL = import.meta.env.VITE_API_MAINTENANCE_URL;

export const MaintenanceserviceApi = {
  create: (data: any) => http.post(`${baseURL}/maintenance/create`, data),
  get: (id: string) => http.get(`${baseURL}/maintenance/getById/${id}`),
  update: (id: string, data: any) =>
    http.put(`${baseURL}/maintenance/updateById/${id}`, data),
  toggle: (id: string) =>
    http.patch(`${baseURL}/maintenance/toggleState/${id}`),
  uploadFile: (file: File | Blob) => {
    const fd = new FormData();
    fd.append("archivo", file);
    return http.post(`${baseURL}/files/upload`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  listPreventives: (params?: Record<string, any>) =>
    http.get(`${baseURL}/maintenance-preventive/list`, { params }),
  listCorrectives: (params?: Record<string, any>) =>
    http.get(`${baseURL}/maintenance-corrective/list`, { params }),
  listEnlistments: (params?: Record<string, any>) =>
    http.get(`${baseURL}/enlistment/list`, { params }),
  getFile: (document: string, route: string) =>
    http.get(`${baseURL}/files/base64?documento=${document}&ruta=${route}`),
  listPrograms: (params?: Record<string, any>) =>
    http.get(`${baseURL}/programs/list`, { params }),
  createProgram: (data: any) => http.post(`${baseURL}/programs/create`, data),
  createPreventive: (data: any) =>
    http.post(`${baseURL}/maintenance-preventive/create`, data),
  viewPreventive: (data: any) =>
    http.post(`${baseURL}/maintenance-preventive/view`, data),
  createCorrective: (data: any) =>
    http.post(`${baseURL}/maintenance-corrective/create`, data),
  viewCorrective: (data: any) =>
    http.post(`${baseURL}/maintenance-corrective/view`, data),
  createEnlistment: (data: any) =>
    http.post(`${baseURL}/enlistment/create`, data),
  viewEnlistment: (data: any) => http.post(`${baseURL}/enlistment/view`, data),
  enlistmentActivities: () => http.get(`${baseURL}/enlistment/activities`),
  listMaintenances: (params?: Record<string, any>) =>
    http.get(`${baseURL}/maintenance/getAll`, { params }),

  updatePreventive(id: string, body: any) {
    return http.patch(`${baseURL}/maintenance-preventive/${id}`, body);
  },
  togglePreventive(id: string) {
    return http.patch(`${baseURL}/maintenance-preventive/${id}/toggle`, {});
  },

  updateCorrective(id: string, body: any) {
    return http.patch(`${baseURL}/maintenance-corrective/${id}`, body);
  },
  toggleCorrective(id: string) {
    return http.patch(`${baseURL}/maintenance-corrective/${id}/toggle`, {});
  },

  updateEnlistment(id: string, body: any) {
    return http.patch(`${baseURL}/enlistment/${id}`, body);
  },
  toggleEnlistment(id: string) {
    return http.patch(`${baseURL}/enlistment/${id}/toggle`, {});
  },

  printEnlistmentPdfOLD(id: string) {
    return http.get(`/maintenance-enlistment/${id}/print`, {
      responseType: "blob",
    });
  },

  printEnlistmentPdf(id: string) {
    return http.get(
      `${baseURL}/enlistment/${id}/pdf`,
      {
        responseType: "blob",
      }
    );
  },

  listAllMaintenanceTypes: () =>
    http.get(`${baseURL}/maintenance-types/all`),
  createMaintenanceType: (data: any) =>
    http.post(`${baseURL}/maintenance-types`, data),
  updateMaintenanceType: (id: string, data: any) =>
    http.patch(`${baseURL}/maintenance-types/${id}`, data),
  toggleMaintenanceType: (id: string) =>
    http.patch(`${baseURL}/maintenance-types/${id}/toggle`, {}),

  listAllInspectionTypes: () =>
    http.get(`${baseURL}/inspection-types/all`),
  createInspectionType: (data: any) =>
    http.post(`${baseURL}/inspection-types`, data),
  updateInspectionType: (id: string, data: any) =>
    http.patch(`${baseURL}/inspection-types/${id}`, data),
  toggleInspectionType: (id: string) =>
    http.patch(`${baseURL}/inspection-types/${id}/toggle`, {}),

  // ── Tipos de Respuesta de Ítems ─────────────────────────────────
  listAllItemResponseTypes: (tipo?: string) =>
    http.get(`${baseURL}/item-response-types/all`, { params: tipo ? { tipo } : {} }),
  listItemResponseTypes: (tipo?: string) =>
    http.get(`${baseURL}/item-response-types`, { params: tipo ? { tipo } : {} }),
  createItemResponseType: (data: any) =>
    http.post(`${baseURL}/item-response-types`, data),
  updateItemResponseType: (id: string, data: any) =>
    http.patch(`${baseURL}/item-response-types/${id}`, data),
  toggleItemResponseType: (id: string) =>
    http.patch(`${baseURL}/item-response-types/${id}/toggle`, {}),

  // ── Proveedores ────────────────────────────────────────────────────
  listProveedores: () =>
    http.get(`${baseURL}/proveedores`),
  listAllProveedores: () =>
    http.get(`${baseURL}/proveedores/all`),
  createProveedor: (data: any) =>
    http.post(`${baseURL}/proveedores`, data),
  updateProveedor: (id: string, data: any) =>
    http.patch(`${baseURL}/proveedores/${id}`, data),
  toggleProveedor: (id: string) =>
    http.patch(`${baseURL}/proveedores/${id}/toggle`, {}),

  // ── Preventivo: marcar como ejecutado (dispara SICOV) ──────────────
  executePreventive: (id: string, executedAt?: string) =>
    http.patch(`${baseURL}/maintenance-preventive/${id}/execute`, { executedAt }),

  // ── IA: análisis de documentos de taller ───────────────────────────
  listWorkshopFormats: () =>
    http.get(`${baseURL}/maintenance-ai/formats`),
  listAllWorkshopFormats: () =>
    http.get(`${baseURL}/maintenance-ai/formats/all`),
  createWorkshopFormat: (data: any) =>
    http.post(`${baseURL}/maintenance-ai/formats`, data),
  updateWorkshopFormat: (id: string, data: any) =>
    http.patch(`${baseURL}/maintenance-ai/formats/${id}`, data),
  toggleWorkshopFormat: (id: string) =>
    http.patch(`${baseURL}/maintenance-ai/formats/${id}/toggle`, {}),
  analyzeMaintenanceDocument: (data: {
    imageBase64: string;
    mediaType: string;
    workshop_format_id?: string;
    preventive_id?: string;
    corrective_id?: string;
  }) => http.post(`${baseURL}/maintenance-ai/analyze`, data),
  listDocumentAnalyses: (placa?: string) =>
    http.get(`${baseURL}/maintenance-ai/analyses`, { params: placa ? { placa } : {} }),

};
