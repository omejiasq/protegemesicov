import { http } from './http';
const baseURL = import.meta.env.VITE_API_AUTHORIZATION_URL;

export const AuthorizationsserviceApi = {
  list: (params?: Record<string, any>) => http.get(`${baseURL}/authorization/getAll`, { params }),
  get: (id: string) => http.get(`${baseURL}/authorization/getById/${id}`),
  create: (data: any) => http.post(`${baseURL}/authorization/create`, data),
  update: (id: string, data: any) => http.put(`${baseURL}/authorization/updateById/${id}`, data),
  toggle: (id: string) => http.patch(`${baseURL}/authorization/toggleState/${id}`),
};
