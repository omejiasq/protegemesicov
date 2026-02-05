import { http } from './http';

const baseURL = import.meta.env.VITE_API_DRIVERS_URL;

export const DriversserviceApi = {
  list: (params?: Record<string, any>) =>
    http.get(`${baseURL}/users/drivers`, { params }),

  get: (id: string) =>
    http.get(`${baseURL}/users/drivers/${id}`),

  create: (data: any) =>
    http.post(`${baseURL}/users`, data),

  update: (id: string, data: any) =>
    http.put(`${baseURL}/users/${id}`, data),

  toggle: (id: string) =>
    http.patch(`${baseURL}/users/${id}/toggle`),
};
