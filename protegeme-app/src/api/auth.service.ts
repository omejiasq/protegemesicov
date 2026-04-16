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

  // Cambiar contraseña de cualquier usuario (superadmin)
  changePassword: (userId: string, newPassword: string) =>
    http.patch(`${baseURL}/users/${userId}/password`, { newPassword }),

  // Listar usuarios admin de una empresa (superadmin)
  getEnterpriseAdmins: (enterpriseId: string) =>
    http.get(`${baseURL}/users/by-enterprise/${enterpriseId}`),

  // Búsqueda de conductores por cédula o nombre (autocomplete)
  searchDrivers: (search: string) =>
    http.get(`${baseURL}/users/drivers`, { params: { search, active: true, numero_items: 10 } }),

  // Listar staff de la empresa (admin, operator, viewer)
  getEnterpriseStaff: (params?: any) =>
    http.get(`${baseURL}/users/staff`, { params }),

  // Permisos de menú por usuario
  getUserMenuPermissions: (userId: string) =>
    http.get(`${baseURL}/users/${userId}/menu-permissions`),
  setUserMenuPermissions: (userId: string, keys: string[]) =>
    http.patch(`${baseURL}/users/${userId}/menu-permissions`, { keys }),

  // Permisos de menú por empresa
  getEnterpriseMenuPermissions: (enterpriseId: string) =>
    http.get(`${baseURL}/enterprise/${enterpriseId}/menu-permissions`),
  setEnterpriseMenuPermissions: (enterpriseId: string, keys: string[]) =>
    http.patch(`${baseURL}/enterprise/${enterpriseId}/menu-permissions`, { keys }),

  // Broadcast a todas las empresas (solo superadmin)
  sendBroadcast: (message: string) =>
    http.post(`${baseURL}/enterprise/broadcast`, { message }),

  // Catálogo de menú (superadmin)
  getMenuCatalog: () => http.get(`${baseURL}/menu-catalog`),
  createMenuCatalogItem: (data: any) => http.post(`${baseURL}/menu-catalog`, data),
  updateMenuCatalogItem: (id: string, data: any) => http.patch(`${baseURL}/menu-catalog/${id}`, data),
  deleteMenuCatalogItem: (id: string) => http.delete(`${baseURL}/menu-catalog/${id}`),
};
