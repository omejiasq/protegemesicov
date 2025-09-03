import { http } from './http';
const baseURL = import.meta.env.VITE_API_AUTH_URL;

export const AuthserviceApi = {
  login: (data: any) => http.post(`${baseURL}/auth/login`, data),
  register: (data: any) => http.post(`${baseURL}/auth/register`, data),
  createEnterprise: (data: any) => http.post(`${baseURL}/enterprise/create`, data),
  getAllEnterprises: (params?: Record<string, any>) => http.get(`${baseURL}/enterprise/getAll`, { params }),
};