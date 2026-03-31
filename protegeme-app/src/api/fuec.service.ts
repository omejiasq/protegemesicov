import { http } from './http';

const baseURL = import.meta.env.VITE_API_VEHICLES_URL;

export const FuecServiceApi = {
  list: (params?: Record<string, any>) =>
    http.get(`${baseURL}/fuec`, { params }),

  get: (id: string) =>
    http.get(`${baseURL}/fuec/${id}`),

  create: (data: any) =>
    http.post(`${baseURL}/fuec`, data),

  update: (id: string, data: any) =>
    http.patch(`${baseURL}/fuec/${id}`, data),

  emit: (id: string) =>
    http.patch(`${baseURL}/fuec/${id}/emit`),

  anular: (id: string, motivo: string) =>
    http.patch(`${baseURL}/fuec/${id}/anular`, { motivo }),
};
