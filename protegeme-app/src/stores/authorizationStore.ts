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
    async authorizationFetchAll(params?: {
      filters?: Record<string, any>;
      pageSize?: number; // tamaño por tirada contra el backend (default 1000)
      hardCap?: number; // opcional, límite de seguridad
    }) {
      const list = this.authorizationList;
      list.loading = true;
      list.error = "";

      try {
        const limit = Math.max(1, Number(params?.pageSize) || 1000);
        const f = { ...(list.filters || {}), ...(params?.filters || {}) };

        // armo filtro base (placa en mayúsculas)
        const baseQ: any = {};
        if (typeof f.placa === "string" && f.placa.trim()) {
          baseQ.placa = f.placa.trim().toUpperCase();
        } else if (typeof f.plate === "string" && f.plate.trim()) {
          baseQ.placa = f.plate.trim().toUpperCase();
        }

        let page = 1;
        let acc: AnyObj[] = [];
        let total = 0;

        // loop hasta traer todo
        while (true) {
          const q = { ...baseQ, page, numero_items: limit, _ts: Date.now() };
          const resp: any = await AuthorizationsserviceApi.authorizationList(q);
          const payload =
            resp && typeof resp === "object" && "data" in resp
              ? resp.data
              : resp;

          const chunk = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
            ? payload.data
            : [];

          total = Number(
            payload?.total ?? payload?.count ?? acc.length + chunk.length
          );
          acc = acc.concat(chunk);

          if (
            chunk.length < limit ||
            acc.length >= total ||
            (params?.hardCap && acc.length >= params.hardCap)
          )
            break;

          page++;
        }

        // dejo la lista completa para client-side paging
        list.items = acc;
        list.total = acc.length;
        list.page = 1; // siempre arranca en 1
        // no toco list.limit: lo decide la tabla (10/20/50/100)

        return { items: acc, total: acc.length };
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
        console.log(
          "%cprotegeme-appsrcstoresauthorizationStore.ts:139 payload",
          "color: #007acc;",
          payload
        );
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
