import { http } from './http';
const baseURL = import.meta.env.VITE_API_VEHICLES_URL;

/*
export const VehiclesserviceApi = {
  list: (params?: Record<string, any>) => http.get(`${baseURL}/vehicles/getAll`, { params }),
  get: (id: string) => http.get(`${baseURL}/vehicles/getById/${id}`),
  create: (data: any) => http.post(`${baseURL}/vehicles/create`, data),
  update: (id: string, data: any) => http.put(`${baseURL}/vehicles/updateById/${id}`, data),
  toggle: (id: string) => http.patch(`${baseURL}/vehicles/toggleState/${id}`),
};
*/
export const VehiclesserviceApi = {
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
};

