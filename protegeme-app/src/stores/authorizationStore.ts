import { defineStore } from "pinia";
import {AuthorizationsserviceApi} from "../api/authorization.service"; // misma convención que maintenanceStore

type AnyObj = Record<string, any>;

export const useAuthorizationStore = defineStore("authorization", {
  state: () => ({
    authorization: { detail: null as AnyObj | null, loading: false, error: "" },
    authorizationList: { items: [] as AnyObj[], loading: false, error: "" },
  }),

  actions: {
    /* ===== Listado ===== */
    async authorizationFetchList(params?: AnyObj) {
      this.authorizationList.loading = true;
      this.authorizationList.error = "";
      try {
        // Preferimos GET /authorizations/list con query params
        const { data } = await AuthorizationsserviceApi.authorizationList(params || {});
        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];
        this.authorizationList.items = items;
        return items;
      } catch (e: any) {
        this.authorizationList.error = e?.response?.data?.message || e?.message || "No se pudo obtener autorizaciones";
        throw e;
      } finally {
        this.authorizationList.loading = false;
      }
    },

    /* ===== Crear ===== */
    async authorizationCreate(body: AnyObj) {
      this.authorization.loading = true;
      this.authorization.error = "";
      try {
        const { data } = await AuthorizationsserviceApi.authorizationCreate(body);
        this.authorization.detail = data;
        // opcional: insertar al inicio del listado
        if (Array.isArray(this.authorizationList.items)) {
          this.authorizationList.items.unshift(data);
        }
        return data;
      } catch (e: any) {
        this.authorization.error = e?.response?.data?.message || e?.message || "No se pudo crear autorización";
        throw e;
      } finally {
        this.authorization.loading = false;
      }
    },

    /* ===== Ver detalle ===== */
    async authorizationView(id: string) {
      this.authorization.loading = true;
      this.authorization.error = "";
      try {
        const { data } = await AuthorizationsserviceApi.authorizationView({ id });
        this.authorization.detail = data;
        return data;
      } catch (e: any) {
        this.authorization.error = e?.response?.data?.message || e?.message || "No se pudo obtener autorización";
        throw e;
      } finally {
        this.authorization.loading = false;
      }
    },

    /* ===== Editar (update) ===== */
    async authorizationUpdateDetail(id: string, changes: AnyObj) {
      this.authorization.loading = true;
      this.authorization.error = "";
      try {
        // El controller espera { id, changes }
        const { data } = await AuthorizationsserviceApi.authorizationUpdate({ id, changes });

        // mergear en listado
        const list = this.authorizationList.items || [];
        const idx = list.findIndex((x: AnyObj) => x._id === id);
        if (idx !== -1) this.authorizationList.items[idx] = { ...list[idx], ...data };

        // mergear en detail si corresponde
        if (this.authorization.detail && (this.authorization.detail as AnyObj)._id === id) {
          this.authorization.detail = { ...(this.authorization.detail as AnyObj), ...data };
        }
        return data;
      } catch (e: any) {
        this.authorization.error = e?.response?.data?.message || e?.message || "No se pudo actualizar autorización";
        throw e;
      } finally {
        this.authorization.loading = false;
      }
    },

    /* ===== Activar/Desactivar ===== */
    async authorizationToggle(id: string) {
      this.authorization.loading = true;
      this.authorization.error = "";
      try {
        const { data } = await AuthorizationsserviceApi.authorizationToggle({ id });
        // sync lista
        const list = this.authorizationList.items || [];
        const idx = list.findIndex((x: AnyObj) => x._id === id);
        if (idx !== -1) list[idx].estado = data?.estado;
        // sync detail
        if (this.authorization.detail && (this.authorization.detail as AnyObj)._id === id) {
          (this.authorization.detail as AnyObj).estado = data?.estado;
        }
        return data;
      } catch (e: any) {
        this.authorization.error = e?.response?.data?.message || e?.message || "No se pudo cambiar estado";
        throw e;
      } finally {
        this.authorization.loading = false;
      }
    },
  },
});