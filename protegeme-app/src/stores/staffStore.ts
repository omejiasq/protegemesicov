import { defineStore } from 'pinia';
import { StaffServiceApi } from '../api/staff.service';

export type StaffUser = {
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
  createdAt?: string;
  updatedAt?: string;
};

export const useStaffStore = defineStore('staff', {
  state: () => ({
    items: [] as StaffUser[],
    total: 0,
    loading: false,
    error: '' as string,
    current: null as StaffUser | null,
  }),

  actions: {
    async fetch(params: Record<string, any> = {}) {
      this.loading = true;
      this.error = '';
      try {
        const { data } = await StaffServiceApi.list(params);
        const rawItems = Array.isArray(data) ? data : data?.data ?? [];
        this.items = rawItems;
        this.total = data?.total ?? rawItems.length;
        return { items: rawItems, total: this.total };
      } catch (e: any) {
        this.error =
          e?.response?.data?.message ||
          e?.message ||
          'No se pudo obtener los usuarios';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async get(id: string) {
      this.loading = true;
      this.error = '';
      try {
        const { data } = await StaffServiceApi.get(id);
        this.current = data as StaffUser;
        return data as StaffUser;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo obtener el usuario';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async create(payload: Partial<StaffUser>) {
      this.loading = true;
      this.error = '';
      try {
        const { data } = await StaffServiceApi.create(payload);
        if (data?._id) this.items.unshift(data);
        this.total += 1;
        return data as StaffUser;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo crear el usuario';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async update(id: string, payload: Partial<StaffUser>) {
      this.loading = true;
      this.error = '';
      try {
        const { data } = await StaffServiceApi.update(id, payload);
        const i = this.items.findIndex(u => u._id === id);
        if (i >= 0) this.items[i] = { ...this.items[i], ...data };
        if (this.current?._id === id) this.current = { ...this.current, ...data } as StaffUser;
        return data as StaffUser;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo actualizar el usuario';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async updatePassword(id: string, newPassword: string) {
      this.loading = true;
      this.error = '';
      try {
        const { data } = await StaffServiceApi.updatePassword(id, newPassword);
        return data;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo actualizar la contraseña';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async toggleActive(id: string) {
      this.error = '';
      try {
        const { data } = await StaffServiceApi.toggleActive(id);
        const i = this.items.findIndex(u => u._id === id);
        if (i >= 0) this.items[i].active = data?.active ?? !this.items[i].active;
        if (this.current?._id === id) {
          this.current = { ...this.current, active: data?.active ?? !this.current?.active } as StaffUser;
        }
        return data;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo cambiar el estado';
        throw e;
      }
    },
  },
});