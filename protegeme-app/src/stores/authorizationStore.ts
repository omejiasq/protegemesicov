// src/stores/authorizationStore.ts
import { defineStore } from "pinia";
import { AuthorizationsserviceApi } from "../api/authorization.service";

type AnyObj = Record<string, any>;

export const useAuthorizationStore = defineStore("authorization", {
  state: () => ({
    authorization: { detail: null as AnyObj | null, loading: false, error: "" },
    authorizationList: {
      items: [] as AnyObj[],
      total: 0,
      page: 1,
      limit: 10,
      filters: {} as Record<string, any>,
      loading: false,
      error: "",
    },
  }),

  actions: {
    /* ===== Listado ===== */
    async authorizationFetchList(params?: {
      page?: number;
      numero_items?: number;
    }) {
      const list = this.authorizationList;
      list.loading = true;
      list.error = "";

      // Actualizar pagina/limit si vienen por params
      if (params) {
        if (typeof params.page === "number") list.page = params.page;
        if (typeof params.numero_items === "number")
          list.limit = params.numero_items;
      }

      try {
        // SOLO enviamos page y numero_items (sin filtros)
        const query = {
          page: list.page,
          numero_items: list.limit,
        };

        const resp: any = await AuthorizationsserviceApi.authorizationList(
          query
        );

        // Soporta axios (resp.data) o payload directo
        const payload =
          resp && typeof resp === "object" && "data" in resp ? resp.data : resp;
        const arr = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.data)
          ? payload.data
          : [];

        list.items = Array.isArray(arr) ? arr : [];
        list.total =
          typeof payload?.total === "number"
            ? payload.total
            : list.items.length;

        return payload;
      } catch (e: any) {
        list.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo listar autorizaciones";
        throw e;
      } finally {
        list.loading = false;
      }
    },
    /* ===== Ver detalle ===== */
    async authorizationView(id: string) {
      this.authorization.loading = true;
      this.authorization.error = "";
      try {
        const resp: any = await AuthorizationsserviceApi.authorizationView({
          id,
        });
        const payload =
          resp && typeof resp === "object" && "data" in resp ? resp.data : resp;
        this.authorization.detail = payload;
        return payload;
      } catch (e: any) {
        this.authorization.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo obtener autorización";
        throw e;
      } finally {
        this.authorization.loading = false;
      }
    },

    /* ===== Crear ===== */
    async authorizationCreate(body: AnyObj) {
      this.authorization.loading = true;
      this.authorization.error = "";
      try {
        const resp: any = await AuthorizationsserviceApi.authorizationCreate(
          body
        );
        const payload =
          resp && typeof resp === "object" && "data" in resp ? resp.data : resp;
        // si la lista está cargada, agrega al inicio para ver la nueva entrada rápido
        if (this.authorizationList.items)
          this.authorizationList.items.unshift(payload);
        this.authorizationList.total = (this.authorizationList.total || 0) + 1;
        return payload;
      } catch (e: any) {
        this.authorization.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo crear autorización";
        throw e;
      } finally {
        this.authorization.loading = false;
      }
    },

    /* ===== Actualizar ===== */
    async authorizationUpdate(id: string, body: AnyObj) {
      this.authorization.loading = true;
      this.authorization.error = "";
      try {
        const resp: any = await AuthorizationsserviceApi.authorizationUpdate({
          id,
          changes: body,
        });
        const payload =
          resp && typeof resp === "object" && "data" in resp ? resp.data : resp;

        // actualizar detalle si coincide
        console.log('%cprotegeme-app\src\stores\authorizationStore.ts:139 payload', 'color: #007acc;', payload);
        if (
          this.authorization.detail &&
          (this.authorization.detail as AnyObj)._id === id
        ) {
          this.authorization.detail = {
            ...(this.authorization.detail as AnyObj),
            ...payload,
          };
        }
        // actualizar en lista
        const idx = this.authorizationList.items.findIndex(
          (x: AnyObj) => (x._id || x.id) === id
        );
        if (idx !== -1)
          this.authorizationList.items[idx] = {
            ...this.authorizationList.items[idx],
            ...payload,
          };
        return payload;
      } catch (e: any) {
        this.authorization.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo actualizar autorización";
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
        const resp: any = await AuthorizationsserviceApi.authorizationToggle({
          id,
        });
        const payload =
          resp && typeof resp === "object" && "data" in resp ? resp.data : resp;
        const newEstado = payload?.estado ?? null;

        // sync lista
        const idx = this.authorizationList.items.findIndex(
          (x: AnyObj) => (x._id || x.id) === id
        );
        if (idx !== -1 && typeof newEstado === "boolean")
          this.authorizationList.items[idx].estado = newEstado;
        // sync detail
        if (
          this.authorization.detail &&
          (this.authorization.detail as AnyObj)._id === id &&
          typeof newEstado === "boolean"
        ) {
          (this.authorization.detail as AnyObj).estado = newEstado;
        }
        return payload;
      } catch (e: any) {
        this.authorization.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo cambiar estado";
        throw e;
      } finally {
        this.authorization.loading = false;
      }
    },
  },
});
