// src/stores/incidentsStore.ts
import { defineStore } from 'pinia';
import { IncidentsserviceApi } from '../api/incidents.service'; // revisá ruta si la tuya difiere

type AnyObj = Record<string, any>;

export const useIncidentsStore = defineStore('incidents', {
  state: () => ({
    // listado
    incidentsList: {
      items: [] as AnyObj[],
      total: 0,
      loading: false,
      error: '' as string,
      page: 1,
      limit: 10,
      filters: {
        find: '' as string,
        idDespacho: undefined as number | undefined,
        estado: undefined as boolean | undefined,
      },
    },

    // detalle / current
    current: null as AnyObj | null,
    loading: false,
    error: '' as string,
  }),

  actions: {
    // Listar con paginación y filtros
    async incidentsFetchList(params?: Record<string, any>) {
      const s = this.incidentsList;
      s.loading = true;
      s.error = '';

      // merge params: page/limit/filters
      if (params && typeof params === 'object') {
        if (typeof params.page === 'number') s.page = params.page;
        if (typeof params.limit === 'number') s.limit = params.limit;

        s.filters = {
          ...s.filters,
          ...(['find', 'idDespacho', 'estado'] as (keyof typeof s.filters)[]).reduce(
            (acc: Record<string, any>, k) => {
              if (params[k] !== undefined && params[k] !== null && params[k] !== '') acc[k] = params[k];
              return acc;
            },
            {}
          ),
        };
      }

      try {
        const query: any = {
          page: s.page,
          numero_items: s.limit,
          // passthrough filters
          ...s.filters,
        };

        // Llamada al servicio (usa IncidentsserviceApi.list -> /incidents/getAll)
        const resp: any = await IncidentsserviceApi.list(query);

        // Manejo robusto de shapes: axios resp (resp.data) o payload directo
        const payload = resp && typeof resp === 'object' && 'data' in resp ? resp.data : resp;
        const items = Array.isArray(payload) ? payload : payload?.items ?? payload?.data ?? [];
        s.items = Array.isArray(items) ? items : [];
        s.total = typeof payload?.total === 'number' ? payload.total : s.items.length;
        return payload;
      } catch (e: any) {
        s.error = e?.response?.data?.message || e?.message || 'No se pudo listar novedades';
        throw e;
      } finally {
        s.loading = false;
      }
    },

    // Get por id
    async incidentGet(id: string) {
      this.loading = true;
      this.error = '';
      try {
        const resp: any = await IncidentsserviceApi.get(id);
        const payload = resp && typeof resp === 'object' && 'data' in resp ? resp.data : resp;
        this.current = payload;
        return payload;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo obtener novedad';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // Create
    async incidentCreate(body: AnyObj) {
      this.loading = true;
      this.error = '';
      try {
        const resp: any = await IncidentsserviceApi.create(body);
        const payload = resp && typeof resp === 'object' && 'data' in resp ? resp.data : resp;
        // si la lista existe, agregar al inicio
        if (this.incidentsList.items) this.incidentsList.items.unshift(payload);
        this.incidentsList.total = (this.incidentsList.total || 0) + 1;
        return payload;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo crear novedad';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // Update
    async incidentUpdate(id: string, body: AnyObj) {
      this.loading = true;
      this.error = '';
      try {
        const resp: any = await IncidentsserviceApi.update(id, body);
        const payload = resp && typeof resp === 'object' && 'data' in resp ? resp.data : resp;
        // actualizar current si coincide
        if (this.current && (this.current as AnyObj)._id === id) {
          this.current = { ...(this.current as AnyObj), ...payload };
        }
        // actualizar en lista
        const idx = this.incidentsList.items.findIndex((x: AnyObj) => (x._id || x.id) === id);
        if (idx !== -1) this.incidentsList.items[idx] = { ...this.incidentsList.items[idx], ...payload };
        return payload;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo actualizar novedad';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // Toggle estado
    async incidentToggle(id: string) {
      this.loading = true;
      this.error = '';
      try {
        const resp: any = await IncidentsserviceApi.toggle(id);
        const payload = resp && typeof resp === 'object' && 'data' in resp ? resp.data : resp;
        // payload podría ser el doc actualizado (service devuelve doc)
        const newEstado = payload?.estado ?? (payload && payload.estado) ?? null;
        // actualizar lista
        const idx = this.incidentsList.items.findIndex((x: AnyObj) => (x._id || x.id) === id);
        if (idx !== -1 && typeof newEstado === 'boolean') this.incidentsList.items[idx].estado = newEstado;
        // actualizar current
        if (this.current && (this.current as AnyObj)._id === id && typeof newEstado === 'boolean') {
          (this.current as AnyObj).estado = newEstado;
        }
        return payload;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'No se pudo cambiar estado';
        throw e;
      } finally {
        this.loading = false;
      }
    },
  },
});
