import { http } from './http';
const baseURL = import.meta.env.VITE_API_DRIVERS_URL;

export const DriversserviceApi = {
  list: (params?: Record<string, any>) =>
    http.get(`${baseURL}/drivers/getAll`, { params }),
  get: (id: string) => http.get(`${baseURL}/drivers/getById/${id}`),
  create: (data: any) => http.post(`${baseURL}/drivers/create`, data),
  update: (id: string, data: any) => http.put(`${baseURL}/drivers/updateById/${id}`, data),
  toggle: (id: string) => http.patch(`${baseURL}/drivers/toggleState/${id}`),
};
