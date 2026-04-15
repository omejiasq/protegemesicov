// src/stores/terminalesStore.ts
import { defineStore } from "pinia";
import { TerminalesApi } from "../api/terminales.service";

interface ListState {
  items: any[];
  total: number;
  loading: boolean;
  error: string;
}

const emptyList = (): ListState => ({
  items: [],
  total: 0,
  loading: false,
  error: "",
});

export const useTerminalesStore = defineStore("terminales", {
  state: () => ({
    salidas:   emptyList(),
    llegadas:  emptyList(),
    novedades: emptyList(),
    saving: false,
    saveError: "",
  }),

  actions: {
    // ── Salidas ──────────────────────────────────────────────────────────

    async fetchSalidas(params?: any) {
      this.salidas.loading = true;
      this.salidas.error   = "";
      try {
        const { data } = await TerminalesApi.listSalidas(params);
        this.salidas.items = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];
        this.salidas.total = data?.total ?? this.salidas.items.length;
      } catch (e: any) {
        this.salidas.error = e?.response?.data?.message ?? e?.message ?? "Error";
      } finally {
        this.salidas.loading = false;
      }
    },

    async createSalida(payload: any) {
      this.saving    = true;
      this.saveError = "";
      try {
        const { data } = await TerminalesApi.createSalida(payload);
        return data;
      } catch (e: any) {
        this.saveError = e?.response?.data?.message ?? e?.message ?? "Error";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    async toggleSalida(id: string) {
      const { data } = await TerminalesApi.toggleSalida(id);
      const idx = this.salidas.items.findIndex((x: any) => x._id === id);
      if (idx !== -1) this.salidas.items[idx].estado = data?.estado;
    },

    async retrySalidas() {
      return TerminalesApi.retrySalidas();
    },

    // ── Llegadas ─────────────────────────────────────────────────────────

    async fetchLlegadas(params?: any) {
      this.llegadas.loading = true;
      this.llegadas.error   = "";
      try {
        const { data } = await TerminalesApi.listLlegadas(params);
        this.llegadas.items = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];
        this.llegadas.total = data?.total ?? this.llegadas.items.length;
      } catch (e: any) {
        this.llegadas.error = e?.response?.data?.message ?? e?.message ?? "Error";
      } finally {
        this.llegadas.loading = false;
      }
    },

    async createLlegada(payload: any) {
      this.saving    = true;
      this.saveError = "";
      try {
        const { data } = await TerminalesApi.createLlegada(payload);
        return data;
      } catch (e: any) {
        this.saveError = e?.response?.data?.message ?? e?.message ?? "Error";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    async toggleLlegada(id: string) {
      const { data } = await TerminalesApi.toggleLlegada(id);
      const idx = this.llegadas.items.findIndex((x: any) => x._id === id);
      if (idx !== -1) this.llegadas.items[idx].estado = data?.estado;
    },

    async retryLlegadas() {
      return TerminalesApi.retryLlegadas();
    },

    // ── Novedades ─────────────────────────────────────────────────────────

    async fetchNovedades(params?: any) {
      this.novedades.loading = true;
      this.novedades.error   = "";
      try {
        const { data } = await TerminalesApi.listNovedades(params);
        this.novedades.items = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];
        this.novedades.total = data?.total ?? this.novedades.items.length;
      } catch (e: any) {
        this.novedades.error = e?.response?.data?.message ?? e?.message ?? "Error";
      } finally {
        this.novedades.loading = false;
      }
    },

    async createNovedad(payload: any) {
      this.saving    = true;
      this.saveError = "";
      try {
        const { data } = await TerminalesApi.createNovedad(payload);
        return data;
      } catch (e: any) {
        this.saveError = e?.response?.data?.message ?? e?.message ?? "Error";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    async toggleNovedad(id: string) {
      const { data } = await TerminalesApi.toggleNovedad(id);
      const idx = this.novedades.items.findIndex((x: any) => x._id === id);
      if (idx !== -1) this.novedades.items[idx].estado = data?.estado;
    },

    async retryNovedades() {
      return TerminalesApi.retryNovedades();
    },
  },
});
