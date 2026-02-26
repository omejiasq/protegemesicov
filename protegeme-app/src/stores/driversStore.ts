import { defineStore } from 'pinia';
import { DriversserviceApi } from '../api/drivers.service';

export type Driver = {
  _id: string;
  usuario: {
    usuario: string;
    nombre: string;
    apellido: string;
    telefono: string;
    correo: string;
    document_type: number;
    documentNumber: string;
  };
  roleType: string;
  enterprise_id: string;
  active: boolean;
  no_licencia_conduccion?: string | null;
  vencimiento_licencia_conduccion?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export const useDriversStore = defineStore('drivers', {
  state: () => ({
    items: [] as Driver[],
    total: 0,
    loading: false,
    error: '' as string,
    current: null as Driver | null,
  }),

  actions: {
    async fetch(params: Record<string, any> = {}) {
      this.loading = true;
      this.error = '';
    
      try {
        const { data } = await DriversserviceApi.list(params);
    
        const rawItems = Array.isArray(data) ? data : data?.data ?? [];
    
        // 🔥 Sin mapeo — guardamos el objeto tal como viene del backend
        this.items = rawItems;
        this.total = data?.total ?? rawItems.length;
    
        return { items: rawItems, total: this.total };
    
      } catch (e: any) {
        this.error =
          e?.response?.data?.message ||
          e?.message ||
          'No se pudo obtener conductores';
        throw e;
      } finally {
        this.loading = false;
      }
    },

async list(params: Record<string, any> = {}) {
  this.loading = true;
  this.error = '';
  try {
    const { data } = await DriversserviceApi.list(params); // 👈 reenvía params
    const items = data?.items ?? (Array.isArray(data) ? data : []);
    const total = data?.total ?? items.length ?? 0;
    this.items = items;
    this.total = total;
    return { items, total };
  } finally {
    this.loading = false;
  }
},


    async get(id: string) {
      this.loading = true; this.error = '';
      try {
        const { data } = await DriversserviceApi.get(id);
        this.current = data as Driver;
        return data as Driver;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo obtener el conductor';
        throw e;
      } finally { this.loading = false; }
    },

    async create(payload: Partial<Driver>) {
      this.loading = true; this.error = '';
      try {
        const { data } = await DriversserviceApi.create(payload);
        if (data?._id) this.items.unshift(data);
        this.total += 1;
        return data as Driver;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo crear el conductor';
        throw e;
      } finally { this.loading = false; }
    },

    async update(id: string, payload: Partial<Driver>) {
      this.loading = true; this.error = '';
      try {
        const { data } = await DriversserviceApi.update(id, payload);
        const i = this.items.findIndex(d => d._id === id);
        if (i >= 0) this.items[i] = { ...this.items[i], ...data };
        if (this.current?._id === id) this.current = { ...this.current, ...data } as Driver;
        return data as Driver;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo actualizar el conductor';
        throw e;
      } finally { this.loading = false; }
    },

    async toggle(id: string) {
      this.error = '';
      try {
        const { data } = await DriversserviceApi.toggle(id);
        const i = this.items.findIndex(d => d._id === id);
        if (i >= 0) this.items[i].estado = data?.estado ?? !this.items[i].estado;
        if (this.current?._id === id) {
          this.current = { ...this.current, estado: data?.estado ?? !this.current?.estado } as Driver;
        }
        return data;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo cambiar el estado';
        throw e;
      }
    },

    async countActive(): Promise<number> {
      try {
        const { data } = await DriversserviceApi.list();
        this.total = data?.total ?? (Array.isArray(data) ? data.length : 0);
        return this.total;
      } catch {
        return 0;
      }
    },
  }
});
