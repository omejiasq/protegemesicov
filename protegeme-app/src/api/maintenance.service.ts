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
  }
  

};
