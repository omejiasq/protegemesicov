import { http } from './http';
const baseURL = import.meta.env.VITE_API_INCIDENTS_URL || 'http://localhost:4002';

export const IncidentsserviceApi = {
  list: (params?: Record<string, any>) => http.get(`${baseURL}/incidents/getAll`, { params }),
  get: (id: string) => http.get(`${baseURL}/incidents/getById/${id}`),
  create: (data: any) => http.post(`${baseURL}/incidents/create`, data),
  update: (id: string, data: any) => http.put(`${baseURL}/incidents/updateById/${id}`, data),
  toggle: (id: string) => http.patch(`${baseURL}/incidents/toggleState/${id}`),
};

export const IncidentsdriverserviceApi = {
  list: (params?: Record<string, any>) => http.get(`${baseURL}/incidents/driver/list`, { params }),
  get: (id: string) => http.get(`${baseURL}/incidents/driver/getById/${id}`),
  create: (id: string, data: any) => http.post(`${baseURL}/incidents/driver/create/${id}`, data),
  update: (id: string, data: any) => http.put(`${baseURL}/incidents/driver/updateById/${id}`, data),
  toggle: (id: string) => http.patch(`${baseURL}/incidents/driver/toggleState/${id}`),
};

export const IncidentsvehicleserviceApi = {
  list: (params?: Record<string, any>) => http.get(`${baseURL}/incidents/vehicle/list`, { params }),
  get: (id: string) => http.get(`${baseURL}/incidents/vehicle/getById/${id}`),
  create: (id: string, data: any) => http.post(`${baseURL}/incidents/vehicle/create/${id}`, data),
  update: (id: string, data: any) => http.put(`${baseURL}/incidents/vehicle/updateById/${id}`, data),
  toggle: (id: string) => http.patch(`${baseURL}/incidents/vehicle/toggleState/${id}`),
};
