// src/api/terminales.service.ts
import { http } from "./http";

const base = import.meta.env.VITE_API_MAINTENANCE_URL;
const url = (path: string) => `${base}/terminales${path}`;

export const TerminalesApi = {
  // Salidas
  createSalida:   (data: any)              => http.post(url("/salidas"), data),
  listSalidas:    (params?: any)           => http.get(url("/salidas"), { params }),
  getSalida:      (id: string)             => http.get(url(`/salidas/${id}`)),
  toggleSalida:   (id: string)             => http.patch(url(`/salidas/${id}/toggle`), {}),
  retrySalidas:   ()                       => http.post(url("/salidas/retry"), {}),

  // Llegadas
  createLlegada:  (data: any)              => http.post(url("/llegadas"), data),
  listLlegadas:   (params?: any)           => http.get(url("/llegadas"), { params }),
  toggleLlegada:  (id: string)             => http.patch(url(`/llegadas/${id}/toggle`), {}),
  retryLlegadas:  ()                       => http.post(url("/llegadas/retry"), {}),

  // Novedades
  createNovedad:  (data: any)              => http.post(url("/novedades"), data),
  listNovedades:  (params?: any)           => http.get(url("/novedades"), { params }),
  toggleNovedad:  (id: string)             => http.patch(url(`/novedades/${id}/toggle`), {}),
  retryNovedades: ()                       => http.post(url("/novedades/retry"), {}),
};
