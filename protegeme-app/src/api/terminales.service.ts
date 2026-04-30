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

  // ── Nuevos endpoints para vista unificada ──────────────────────────────

  // Vista unificada de despachos
  getDespachos:   (params?: any)           => http.get(url("/despachos"), { params }),
  cerrarDespacho: (id: string)             => http.patch(url(`/despachos/${id}/cerrar`), {}),

  // Flujos mejorados
  createSalidaEnhanced:  (data: any)       => http.post(url("/salidas/enhanced"), data),
  createLlegadaEnhanced: (data: any)       => http.post(url("/llegadas/enhanced"), data),

  // Integración con APIs externas
  getRutasSupertransporte: ()              => http.get(url("/rutas/supertransporte")),
  searchVehiculos: (placa: string)         => http.get(url("/vehiculos/search"), { params: { placa } }),

  // Configuración
  getConfig:      ()                       => http.get(url("/config")),
  updateConfig:   (data: any)              => http.put(url("/config"), data),

  // Consultar integradora SICOV
  consultarIntegradora: (data: any)        => http.post(url("/consultar-integradora"), data),
};
