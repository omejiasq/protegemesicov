import { http } from "./http";
const baseURL = import.meta.env.VITE_API_AUTHORIZATION_URL;

export const AuthorizationsserviceApi = {
  authorizationList(params: any) {
    return http.get(`${baseURL}/authorizations/list`, { params });
  },
  authorizationCreate(body: any) {
    return http.post(`${baseURL}/authorizations/create`, body);
  },
  authorizationView(body: { id: string }) {
    return http.post(`${baseURL}/authorizations/view`, body);
  },
  authorizationUpdate(body: { id: string; changes: any }) {
    return http.post(`${baseURL}/authorizations/update`, body);
  },
  authorizationToggle(body: { id: string }) {
    return http.post(`${baseURL}/authorizations/toggle`, body);
  },
};
