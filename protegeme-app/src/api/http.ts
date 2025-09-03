import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';


export const http = axios.create({
  timeout: 15000,
  withCredentials: false,
});

function attachAuth(config: InternalAxiosRequestConfig) {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  const enterpriseId = localStorage.getItem('enterprise_id');
  if (enterpriseId) {
    config.headers = config.headers || {};
    (config.headers as any)['x-enterprise-id'] = enterpriseId;
  }
  return config;
}

http.interceptors.request.use((config) => {
  return attachAuth(config as InternalAxiosRequestConfig);
});

type ErrorListener = (error: AxiosError) => void;
const errorListeners = new Set<ErrorListener>();

export function onHttpError(listener: ErrorListener) {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}

function notifyErrorListeners(error: AxiosError) {
  for (const l of errorListeners) {
    try { l(error); } catch { }
  }
}

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    notifyErrorListeners(error);

    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem('access_token');
    }
    return Promise.reject(error);
  }
);

export type QueryParams = Record<string, string | number | boolean | undefined>;

export function getWithParams<T = any>(url: string, params?: QueryParams, config?: AxiosRequestConfig) {
  return http.get<T>(url, { params, ...(config || {}) });
}
