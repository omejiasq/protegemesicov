// src/stores/vehicles.ts
import { defineStore } from 'pinia';
import { VehiclesserviceApi } from '../api/vehicles.service';

export type Vehicle = {
  _id: string;
  placa: string;
  clase?: string;
  nivelServicio?: string;
  estado?: boolean;
  soat?: { fechaVencimiento?: string };
  rtm?: { fechaVencimiento?: string };
  to?:  { fechaVencimiento?: string };
};

function daysUntil(dateStr?: string) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr).getTime();
  const diff = Math.floor((d - Date.now()) / (1000*60*60*24));
  return diff;
}

export const useVehiclesStore = defineStore('vehicles', {
  state: () => ({
    items: [] as Vehicle[],
    total: 0,
    loading: false,
    error: '' as string,
    // opcional: seleccionado
    current: null as Vehicle | null,
  }),

  actions: {
    async fetch(params: Record<string, any> = {}) {
      this.loading = true;
      this.error = '';
      const { page = 1, numero_items = 10, ...rest } = params;
      try {
        const { data } = await VehiclesserviceApi.list({ page, numero_items, ...rest });
        // Tu backend suele responder { page, numero_items, total, items }
        this.items = data?.items ?? (Array.isArray(data) ? data : []);
        this.total = data?.total ?? this.items.length ?? 0;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo obtener vehículos';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async get(id: string) {
      this.loading = true;
      this.error = '';
      try {
        const { data } = await VehiclesserviceApi.get(id);
        this.current = data as Vehicle;
        return data as Vehicle;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo obtener el vehículo';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async create(payload: Partial<Vehicle>) {
      this.loading = true;
      this.error = '';
      try {
        const { data } = await VehiclesserviceApi.create(payload);
        // push optimista si tu API devuelve el doc creado
        if (data?._id) this.items.unshift(data);
        this.total += 1;
        return data as Vehicle;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo crear el vehículo';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async update(id: string, payload: Partial<Vehicle>) {
      this.loading = true;
      this.error = '';
      try {
        const { data } = await VehiclesserviceApi.update(id, payload);
        // sync en memoria
        const i = this.items.findIndex(v => v._id === id);
        if (i >= 0) this.items[i] = { ...this.items[i], ...data };
        if (this.current?._id === id) this.current = { ...this.current, ...data } as Vehicle;
        return data as Vehicle;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo actualizar el vehículo';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async toggle(id: string) {
      this.error = '';
      try {
        const { data } = await VehiclesserviceApi.toggle(id);
        // actualizar estado local
        const i = this.items.findIndex(v => v._id === id);
        if (i >= 0) this.items[i].estado = data?.estado ?? !this.items[i].estado;
        if (this.current?._id === id) {
          this.current = { ...this.current, estado: data?.estado ?? !this.current?.estado } as Vehicle;
        }
        return data;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo cambiar el estado';
        throw e;
      }
    },

    /** KPIs rápidos */
    async countActive(): Promise<number> {
      try {
        const { data } = await VehiclesserviceApi.list({ page: 1, numero_items: 1, estado: true });
        return data?.total ?? (Array.isArray(data) ? data.length : 0);
      } catch {
        return 0;
      }
    },

    async soonToExpire(days = 30): Promise<{ total:number; list: Vehicle[] }> {
      try {
        // traemos una página grande; si tu API filtra por fecha, mejor delegarlo
        const { data } = await VehiclesserviceApi.list({ page: 1, numero_items: 200 });
        const arr: Vehicle[] = data?.items ?? (Array.isArray(data) ? data : []);
        const list = arr.filter(v => {
          const ds = [
            daysUntil(v.soat?.fechaVencimiento),
            daysUntil(v.rtm?.fechaVencimiento),
            daysUntil(v.to?.fechaVencimiento),
          ];
          const min = Math.min(...ds);
          return min <= days;
        }).slice(0, 10);
        return { total: list.length, list };
      } catch {
        return { total: 0, list: [] };
      }
    },
  }
});
