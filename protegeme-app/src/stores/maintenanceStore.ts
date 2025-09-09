// /src/stores/maintenanceStore.ts
import { defineStore } from "pinia";
import { MaintenanceserviceApi } from "../api/maintenance.service"; // ajustá si tu ruta es distinta

type AnyObj = Record<string, any>;

export const useMaintenanceStore = defineStore("maintenance", {
  state: () => ({
    // Genérico maintenance (detalle/acciones puntuales)
    current: null as AnyObj | null,
    loading: false,
    error: "" as string,

    // ===== NUEVO: listado de mantenimientos =====
    maintenanceList: {
      items: [] as AnyObj[],
      total: 0,
      loading: false,
      error: "" as string,
      page: 1,
      limit: 10,
      // filtros por defecto; podés presetear enterprise_id acá
      filters: {
        search: "",
        plate: "",
        dateFrom: undefined as string | undefined,
        dateTo: undefined as string | undefined,
        tipoId: undefined as number | undefined,
        vigiladoId: undefined as number | undefined,
        enterprise_id: localStorage.getItem("enterprise_id") || "",
      },
    },

    // Programs
    programs: {
      items: [] as AnyObj[],
      loading: false,
      error: "" as string,
      filters: {
        tipoId: undefined as number | undefined,
        vigiladold: undefined as string | undefined,
        search: "",
      },
    },

    // Preventive (detalle)
    preventive: {
      detail: null as AnyObj | null,
      loading: false,
      error: "" as string,
    },

    preventiveList: {
      items: [] as AnyObj[],
      total: 0,
      loading: false,
      error: "" as string,
    },

    correctiveList: {
      items: [] as Record<string, any>[],
      total: 0,
      loading: false,
      error: "" as string,
    },

    enlistmentList: {
      items: [] as Record<string, any>[],
      total: 0,
      loading: false,
      error: "" as string,
    },

    // Corrective (detalle)
    corrective: {
      detail: null as AnyObj | null,
      loading: false,
      error: "" as string,
    },

    // Enlistment
    enlistment: {
      current: null as AnyObj | null,
      activities: [] as AnyObj[],
      loading: false,
      error: "" as string,
    },

    // Files
    files: {
      uploading: false,
      lastRef: null as AnyObj | null,
      base64Cache: {} as Record<
        string,
        { base64: string; mimeType?: string; nombreOriginalArchivo?: string }
      >,
      error: "" as string,
    },
  }),

  actions: {
    // ========== NUEVO: listar mantenimientos ==========
    async maintenanceFetchList(params?: Record<string, any>) {
      const s = this.maintenanceList;
      s.loading = true;
      s.error = "";

      // merge de filtros + paginación
      if (params && typeof params === "object") {
        // si vienen page/limit, actualizamos
        if (typeof params.page === "number") s.page = params.page;
        if (typeof params.limit === "number") s.limit = params.limit;

        // merge filtros
        s.filters = {
          ...s.filters,
          ...[
            "search",
            "plate",
            "dateFrom",
            "dateTo",
            "enterprise_id",
            "tipoId",
            "vigiladoId",
          ].reduce((acc: Record<string, any>, k) => {
            if (
              params[k] !== undefined &&
              params[k] !== null &&
              params[k] !== ""
            )
              acc[k] = params[k];
            return acc;
          }, {}),
        };
      }

      try {
        const query = {
          page: s.page,
          limit: s.limit,
          ...s.filters,
        };

        (query as any).numero_items = s.limit;
        delete (query as any).limit;

        if ((query as any).plate) {
          (query as any).placa = (query as any).plate;
          delete (query as any).plate;
        }

        // Llama al nuevo método del service
        const { data } = await MaintenanceserviceApi.listMaintenances(query);

        // Soporta tanto {items,total} como array plano
        const items = Array.isArray(data) ? data : data?.items ?? [];
        s.items = items;
        s.total =
          (data && typeof data.total === "number"
            ? data.total
            : items.length) || 0;

        return data;
      } catch (e: any) {
        s.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo obtener el listado de mantenimientos";
        throw e;
      } finally {
        s.loading = false;
      }
    },

    maintenanceSetPageLimit(page?: number, limit?: number) {
      const s = this.maintenanceList;
      if (typeof page === "number") s.page = page;
      if (typeof limit === "number") s.limit = limit;
    },

    maintenanceUpdateFilters(
      partial: Partial<{
        search: string;
        plate: string;
        dateFrom?: string;
        dateTo?: string;
        tipoId?: number;
        vigiladoId?: number;
        enterprise_id?: string;
      }>
    ) {
      const s = this.maintenanceList;
      s.filters = { ...s.filters, ...partial };
      s.page = 1;
    },

    async createMaintenance(payload: AnyObj) {
      this.loading = true;
      this.error = "";
      try {
        const { data } = await MaintenanceserviceApi.create(payload);
        this.current = data;
        return data;
      } catch (e: any) {
        this.error =
          e?.response?.data?.message || e?.message || "No se pudo crear";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async getMaintenance(id: string) {
      this.loading = true;
      this.error = "";
      try {
        const { data } = await MaintenanceserviceApi.get(id);
        this.current = data;
        return data;
      } catch (e: any) {
        this.error =
          e?.response?.data?.message || e?.message || "No se pudo obtener";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async updateMaintenance(id: string, payload: AnyObj) {
      this.loading = true;
      this.error = "";
      try {
        const { data } = await MaintenanceserviceApi.update(id, payload);
        this.current = { ...(this.current || {}), ...data };
        return data;
      } catch (e: any) {
        this.error =
          e?.response?.data?.message || e?.message || "No se pudo actualizar";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async toggleMaintenance(id: string) {
      this.loading = true;
      this.error = "";
      try {
        const { data } = await MaintenanceserviceApi.toggle(id);
        if (this.current && (this.current as AnyObj)._id === id) {
          this.current = {
            ...this.current,
            estado: data?.estado ?? !this.current?.estado,
          };
        }
        return data;
      } catch (e: any) {
        this.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo cambiar estado";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // ========== Programs ==========
    async programsFetch(params?: Record<string, any>) {
      this.programs.loading = true;
      this.programs.error = "";
      try {
        const { data } = await MaintenanceserviceApi.listPrograms(params);
        this.programs.items = Array.isArray(data) ? data : data?.items ?? [];
        return data;
      } catch (e: any) {
        this.programs.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo listar programas";
        throw e;
      } finally {
        this.programs.loading = false;
      }
    },

    async programsCreate(body: AnyObj) {
      this.programs.loading = true;
      this.programs.error = "";
      try {
        const { data } = await MaintenanceserviceApi.createProgram(body);
        if (this.programs.items) this.programs.items.unshift(data);
        return data;
      } catch (e: any) {
        this.programs.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo crear programa";
        throw e;
      } finally {
        this.programs.loading = false;
      }
    },

    // ========== Preventive (detalle + list via view) ==========
    async preventiveCreateDetail(payload: AnyObj) {
      this.preventive.loading = true;
      this.preventive.error = "";
      try {
        const { data } = await MaintenanceserviceApi.createPreventive(payload);
        this.preventive.detail = data;
        return data;
      } catch (e: any) {
        this.preventive.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo crear preventivo";
        throw e;
      } finally {
        this.preventive.loading = false;
      }
    },

    async preventiveViewDetail(payload: AnyObj) {
      this.preventive.loading = true;
      this.preventive.error = "";
      try {
        const { data } = await MaintenanceserviceApi.viewPreventive(payload);
        this.preventive.detail = data;
        return data;
      } catch (e: any) {
        this.preventive.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo obtener preventivo";
        throw e;
      } finally {
        this.preventive.loading = false;
      }
    },

    async preventiveFetchList(params?: Record<string, any>) {
      this.preventiveList.loading = true;
      this.preventiveList.error = "";
      try {
        // map FE -> BE
        const query: any = { ...params };
        if (query.limit) {
          query.numero_items = query.limit;
          delete query.limit;
        }
        if (query.plate) {
          query.placa = query.plate;
          delete query.plate;
        }

        const { data } = await MaintenanceserviceApi.listPreventives(query);

        // Soporta {items,total} o array plano (por si acaso)
        const items = Array.isArray(data) ? data : data?.items ?? [];
        this.preventiveList.items = items;
        this.preventiveList.total =
          typeof data?.total === "number" ? data.total : items.length;

        return data;
      } catch (e: any) {
        this.preventiveList.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo listar preventivos";
        throw e;
      } finally {
        this.preventiveList.loading = false;
      }
    },

    async correctiveFetchList(params?: Record<string, any>) {
      this.correctiveList.loading = true;
      this.correctiveList.error = "";
      try {
        const query: any = { ...params };
        if (query.limit) {
          query.numero_items = query.limit;
          delete query.limit;
        }
        if (query.plate) {
          query.placa = query.plate;
          delete query.plate;
        }

        const { data } = await MaintenanceserviceApi.listCorrectives(query);

        const items = Array.isArray(data) ? data : data?.items ?? [];
        this.correctiveList.items = items;
        this.correctiveList.total =
          typeof data?.total === "number" ? data.total : items.length;

        return data;
      } catch (e: any) {
        this.correctiveList.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo listar correctivos";
        throw e;
      } finally {
        this.correctiveList.loading = false;
      }
    },

    // ========== Corrective ==========
    async correctiveCreateDetail(payload: AnyObj) {
      this.corrective.loading = true;
      this.corrective.error = "";
      try {
        const { data } = await MaintenanceserviceApi.createCorrective(payload);
        this.corrective.detail = data;
        return data;
      } catch (e: any) {
        this.corrective.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo crear correctivo";
        throw e;
      } finally {
        this.corrective.loading = false;
      }
    },

    async correctiveViewDetail(payload: AnyObj) {
      this.corrective.loading = true;
      this.corrective.error = "";
      try {
        const { data } = await MaintenanceserviceApi.viewCorrective(payload);
        this.corrective.detail = data;
        return data;
      } catch (e: any) {
        this.corrective.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo obtener correctivo";
        throw e;
      } finally {
        this.corrective.loading = false;
      }
    },

    // ========== Enlistment ==========
    async enlistmentCreate(payload: AnyObj) {
      this.enlistment.loading = true;
      this.enlistment.error = "";
      try {
        const { data } = await MaintenanceserviceApi.createEnlistment(payload);
        this.enlistment.current = data;
        return data;
      } catch (e: any) {
        this.enlistment.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo crear alistamiento";
        throw e;
      } finally {
        this.enlistment.loading = false;
      }
    },

    async enlistmentView(payload: AnyObj) {
      this.enlistment.loading = true;
      this.enlistment.error = "";
      try {
        const { data } = await MaintenanceserviceApi.viewEnlistment(payload);
        this.enlistment.current = data;
        return data;
      } catch (e: any) {
        this.enlistment.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo obtener alistamiento";
        throw e;
      } finally {
        this.enlistment.loading = false;
      }
    },

    async enlistmentFetchActivities() {
      this.enlistment.loading = true;
      this.enlistment.error = "";
      try {
        const { data } = await MaintenanceserviceApi.enlistmentActivities();
        this.enlistment.activities = Array.isArray(data)
          ? data
          : data?.items ?? [];
        return this.enlistment.activities;
      } catch (e: any) {
        this.enlistment.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudieron obtener actividades";
        throw e;
      } finally {
        this.enlistment.loading = false;
      }
    },

    async enlistmentFetchList(params?: Record<string, any>) {
      this.enlistmentList.loading = true;
      this.enlistmentList.error = "";
      try {
        const query: any = { ...params };
        if (query.limit) {
          query.numero_items = query.limit;
          delete query.limit;
        }
        if (query.plate) {
          query.placa = query.plate;
          delete query.plate;
        }

        const { data } = await MaintenanceserviceApi.listEnlistments(query);

        const items = Array.isArray(data) ? data : data?.items ?? [];
        this.enlistmentList.items = items;
        this.enlistmentList.total =
          typeof data?.total === "number" ? data.total : items.length;

        return data;
      } catch (e: any) {
        this.enlistmentList.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo listar alistamientos";
        throw e;
      } finally {
        this.enlistmentList.loading = false;
      }
    },

    // ========== Files ==========
    async uploadFile(file: File | Blob, vigiladoId: string) {
      this.files.uploading = true;
      this.files.error = "";
      try {
        const { data } = await MaintenanceserviceApi.uploadFile(
          file,
          vigiladoId
        );
        this.files.lastRef = data;
        return data;
      } finally {
        this.files.uploading = false;
      }
    },

    async getFileBase64(documento: string, ruta: string) {
      this.files.error = "";
      try {
        const { data } = await MaintenanceserviceApi.getFile(documento, ruta);
        const key = `${ruta}::${documento}`;
        this.files.base64Cache[key] = data;
        return data;
      } catch (e: any) {
        this.files.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo obtener archivo";
        throw e;
      }
    },
  },
});
