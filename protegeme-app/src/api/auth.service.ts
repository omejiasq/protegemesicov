import { http } from './http';
const baseURL = import.meta.env.VITE_API_AUTH_URL;

export const AuthserviceApi = {
  login: (data: any) => http.post(`${baseURL}/auth/login`, data),
  register: (data: any) => http.post(`${baseURL}/auth/register`, data),
  forgotPassword: (identifier: string) =>
    http.post(`${baseURL}/auth/forgot-password`, { identifier }),

  // Enterprise — uso general (empresa propia)
  getEnterprise: (id: string) => http.get(`${baseURL}/enterprise/${id}`),
  updateEnterprise: (id: string, data: any) => http.put(`${baseURL}/enterprise/${id}`, data),
  updateEnterpriseProfile: (id: string, data: any) => http.patch(`${baseURL}/enterprise/${id}/profile`, data),

  // Enterprise — solo superadmin
  getAllEnterprises: () => http.get(`${baseURL}/enterprise/all`),
  createEnterprise: (data: any) => http.post(`${baseURL}/enterprise`, data),
  toggleEnterpriseActive: (id: string, data: { active: boolean; reason?: string }) =>
    http.patch(`${baseURL}/enterprise/${id}/toggle-active`, data),

  // Crear usuario admin para una empresa (superadmin, solo una vez)
  createEnterpriseUser: (enterpriseId: string, data: any) =>
    http.post(`${baseURL}/enterprise/${enterpriseId}/create-user`, data),

  // Cambiar contraseña del usuario actual
  changePassword: (userId: string, newPassword: string) =>
    http.patch(`${baseURL}/users/${userId}/password`, { newPassword }),
};
