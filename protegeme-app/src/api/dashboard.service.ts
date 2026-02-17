// src/api/dashboard.service.ts
import { http } from './http';

//const baseURL =
//  import.meta.env.VITE_API_DASHBOARD_URL || 'http://localhost:4004';
const baseURL = import.meta.env.VITE_API_MAINTENANCE_URL;  

type DashboardParams = {
  year: number;
  month?: number;
};

export const DashboardServiceApi = {
  get(params: DashboardParams) {
    const cleanParams: Record<string, number> = {
      year: params.year,
    };

    if (params.month) {
      cleanParams.month = params.month;
    }

    return http.get(`${baseURL}/dashboard`, {
      params: cleanParams,
    });
  },
};
