import { http } from "./http";
const baseURL = import.meta.env.VITE_API_MAINTENANCE_URL;

export const MaintenanceserviceApi = {
  create: (data: any) => http.post(`${baseURL}/maintenance/create`, data),
  get: (id: string) => http.get(`${baseURL}/maintenance/getById/${id}`),
  update: (id: string, data: any) =>
    http.put(`${baseURL}/maintenance/updateById/${id}`, data),
  toggle: (id: string) =>
    http.patch(`${baseURL}/maintenance/toggleState/${id}`),
  uploadFile: (file: File | Blob, vigiladold: string) => {
    const fd = new FormData();
    fd.append("archivo", file);
    fd.append("vigiladoId", vigiladold); // <-- fix
    return http.post(`${baseURL}/files/upload`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
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
  createEnlistment: (data: any) => http.post(`${baseURL}/enlistment/create`, data),
  viewEnlistment: (data: any) => http.post(`${baseURL}/enlistment/view`, data),
  enlistmentActivities: () => http.get(`${baseURL}/maintenance/enlistment`),
  listMaintenances: (params?: Record<string, any>) =>
  http.get(`${baseURL}/maintenance/getAll`, { params }),
};
