import { http } from './http';

const baseURL = import.meta.env.VITE_API_DRIVERS_URL;

export const StaffServiceApi = {
  list: (params?: Record<string, any>) =>
    http.get(`${baseURL}/users/staff`, { params }),

  get: (id: string) =>
    http.get(`${baseURL}/users/${id}`),

  create: (data: any) =>
    http.post(`${baseURL}/users/staff`, data),

  update: (id: string, data: any) =>
    http.put(`${baseURL}/users/${id}`, data),

  updatePassword: (id: string, newPassword: string) =>
    http.patch(`${baseURL}/users/${id}/password`, { newPassword }),

  toggleActive: (id: string) =>
    http.patch(`${baseURL}/users/${id}/toggle-active`),
};