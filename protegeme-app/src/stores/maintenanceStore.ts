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
      detail: null as AnyObj | null,
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

    async programsCreate(body: Record<string, any>) {
      this.programs.loading = true;
      this.programs.error = "";
      try {
        // body puede venir de 2 formas:
        // A) { file, tipoId }  -> subimos y mapeamos
        // B) { documento, nombreOriginal, ruta, tipoId } -> directo
        const t = Number(body?.tipoId);
        if (![1, 2, 3].includes(t)) {
          throw new Error("tipoId inválido o ausente (1|2|3)");
        }

        let documento: string | undefined;
        let nombreOriginal: string | undefined;
        let ruta: string | undefined;

        if (body?.file instanceof File || body?.file instanceof Blob) {
          // Opción A: usar tu wrapper del store (ya retorna el payload):
          // const up = await this.uploadFile(body.file);

          // Opción B: ir directo al service y normalizar respuesta Axios:
          const resp = await MaintenanceserviceApi.uploadFile(body.file);
          console.log('%cprotegeme-app\src\stores\maintenanceStore.ts:310 resp', 'color: #007acc;', resp);
          const up =
            resp && typeof resp === "object" && "data" in resp
              ? resp.data
              : resp;
          console.log(
            "%cprotegeme-appsrcstoresmaintenanceStore.ts:309 up",
            "color: #007acc;"
          );
          // 2) mapear campos que exige /programs/create
          //    (los nombres pueden variar según storage; contemplamos alias comunes)
          documento =
            up?.nombreAlmacenado ?? up?.documento ?? up?.key ?? up?.filename;

          nombreOriginal =
            up?.nombreOriginalArchivo ??
            up?.originalName ??
            up?.originalname ??
            up?.nombreOriginal;

          ruta = up?.ruta ?? up?.url ?? up?.publicUrl ?? up?.path;

          if (!documento || !nombreOriginal || !ruta) {
            console.error("[programsCreate] upload response:", up);
            throw new Error(
              "Upload sin campos suficientes (documento/nombreOriginal/ruta)"
            );
          }
        } else {
          // Ruta 'clásica': ya vienen los 3 campos listos
          documento = body?.documento;
          nombreOriginal = body?.nombreOriginal;
          ruta = body?.ruta;
          if (!documento || !nombreOriginal || !ruta) {
            throw new Error(
              "Faltan campos del archivo: documento/nombreOriginal/ruta"
            );
          }
        }

        const payload = {
          tipoId: t as 1 | 2 | 3,
          documento,
          nombreOriginal,
          ruta,
          // OJO: no enviamos vigiladoId; el back lo resuelve
        };

        const { data } = await MaintenanceserviceApi.createProgram(payload);
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
      
      if (params?.sortBy) query.sortBy = params.sortBy;
      if (params?.sortDir) query.sortDir = params.sortDir;

      try {
        const query: any = {};
    
        // =============================
        // Paginación
        // =============================
        if (params?.page) query.page = params.page;
        if (params?.numero_items) query.numero_items = params.numero_items;
    
        // =============================
        // Filtros estándar (IGUAL alistamientos)
        // =============================
        if (params?.placa) query.placa = params.placa;
        if (params?.fechaDesde) query.fechaDesde = params.fechaDesde;
        if (params?.fechaHasta) query.fechaHasta = params.fechaHasta;
    
        // 👉 Si no se envía nada, backend filtra HOY
        const { data } =
          await MaintenanceserviceApi.listPreventives(query);
    
        const items = Array.isArray(data)
          ? data
          : data?.items ?? [];
    
        this.preventiveList.items = items;
        this.preventiveList.total =
          typeof data?.total === "number"
            ? data.total
            : items.length;
    
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
      
      if (params?.sortBy) query.sortBy = params.sortBy;
      if (params?.sortDir) query.sortDir = params.sortDir;

      try {
        const query: any = {};
    
        // =============================
        // Paginación
        // =============================
        if (params?.page) query.page = params.page;
        if (params?.numero_items) query.numero_items = params.numero_items;
    
        // =============================
        // Filtros estándar (IGUAL alistamientos)
        // =============================
        if (params?.placa) query.placa = params.placa;
        if (params?.fechaDesde) query.fechaDesde = params.fechaDesde;
        if (params?.fechaHasta) query.fechaHasta = params.fechaHasta;
    
        // 👉 Si no se envía nada, backend filtra HOY
        const { data } =
          await MaintenanceserviceApi.listCorrectives(query);
    
        const items = Array.isArray(data)
          ? data
          : data?.items ?? [];
    
        this.correctiveList.items = items;
        this.correctiveList.total =
          typeof data?.total === "number"
            ? data.total
            : items.length;
    
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
    }
    ,
    

    // ========== Corrective ==========
    async correctiveCreateDetail(payload: AnyObj) {
      this.corrective.loading = true;
      this.corrective.error = "";
      try {
        const { data } = await MaintenanceserviceApi.createCorrective(payload);
        console.log(
          "%cprotegeme-appsrcstoresmaintenanceStore.ts:423 data",
          "color: #007acc;",
          data
        );
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
        const resp = await MaintenanceserviceApi.enlistmentActivities();
        // resp puede ser:
        // 1) un array directo
        // 2) axios response -> resp.data = payload
        // 3) payload envelope -> payload = { ok, status, data: [...] }
        const payload =
          resp && typeof resp === "object" && "data" in resp ? resp.data : resp;
        // Ahora extraemos el array de la forma más probable
        const arr = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.items)
          ? payload.items
          : [];
        this.enlistment.activities = arr;
        return this.enlistment.activities;
      } catch (e: any) {
        this.enlistment.error =
          e?.response?.data?.message || e?.message || "Error";
        return [];
      } finally {
        this.enlistment.loading = false;
      }
    },

    async enlistmentFetchList(params?: Record<string, any>) {
      this.enlistmentList.loading = true;
      this.enlistmentList.error = "";
    
      try {
        const query: any = {};
    
        // =============================
        // Paginación (opcional)
        // =============================
        if (params?.page) query.page = params.page;
        if (params?.numero_items) query.numero_items = params.numero_items;
    
        // =============================
        // Filtros reales que usa el backend
        // =============================
        if (params?.placa) {
          query.placa = params.placa;
        }
    
        if (params?.fechaDesde) {
          query.fechaDesde = params.fechaDesde;
        }
    
        if (params?.fechaHasta) {
          query.fechaHasta = params.fechaHasta;
        }
    
        // 👉 Si NO se envía nada, el backend trae SOLO el día actual
        const { data } = await MaintenanceserviceApi.listEnlistments(query);
    
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];
    
        this.enlistmentList.items = items;
        this.enlistmentList.total =
          typeof data?.total === "number"
            ? data.total
            : items.length;
    
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
    async uploadFile(file: File | Blob) {
      this.files.uploading = true;
      this.files.error = "";
      try {
        const { data } = await MaintenanceserviceApi.uploadFile(file);
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
    // maintenanceStore.ts (acciones nuevas dentro de actions:{...})
    async preventiveUpdateDetail(id: string, payload: AnyObj) {
      this.preventive.loading = true;
      this.preventive.error = "";
      try {
        const { data } = await MaintenanceserviceApi.updatePreventive(
          id,
          payload
        );
        // si estás viendo el detalle, mergeá
        if (
          this.preventive.detail &&
          (this.preventive.detail as AnyObj)._id === id
        ) {
          this.preventive.detail = {
            ...(this.preventive.detail as AnyObj),
            ...data,
          };
        }
        // actualizá el item en la lista si existiera
        const idx = this.preventiveList.items.findIndex(
          (x: AnyObj) => x._id === id
        );
        if (idx !== -1)
          this.preventiveList.items[idx] = {
            ...this.preventiveList.items[idx],
            ...data,
          };
        return data;
      } catch (e: any) {
        this.preventive.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo actualizar preventivo";
        throw e;
      } finally {
        this.preventive.loading = false;
      }
    },

    async preventiveToggle(id: string) {
      this.preventive.loading = true;
      this.preventive.error = "";
      try {
        const { data } = await MaintenanceserviceApi.togglePreventive(id);
        // sync detalle
        if (
          this.preventive.detail &&
          (this.preventive.detail as AnyObj)._id === id
        ) {
          (this.preventive.detail as AnyObj).estado = data?.estado;
        }
        // sync lista
        const idx = this.preventiveList.items.findIndex(
          (x: AnyObj) => x._id === id
        );
        if (idx !== -1) this.preventiveList.items[idx].estado = data?.estado;
        return data;
      } catch (e: any) {
        this.preventive.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo cambiar estado";
        throw e;
      } finally {
        this.preventive.loading = false;
      }
    },

    async correctiveUpdateDetail(id: string, payload: any) {
      this.corrective.loading = true;
      this.corrective.error = "";
      try {
        const { data } = await MaintenanceserviceApi.updateCorrective(
          id,
          payload
        );
        const list = this.correctiveList?.items || [];
        const idx = list.findIndex((x: any) => x._id === id);
        if (idx !== -1) list[idx] = { ...list[idx], ...data };
        if (
          this.corrective.detail &&
          (this.corrective.detail as any)._id === id
        ) {
          this.corrective.detail = {
            ...(this.corrective.detail as any),
            ...data,
          };
        }
        return data;
      } catch (e: any) {
        this.corrective.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo actualizar correctivo";
        throw e;
      } finally {
        this.corrective.loading = false;
      }
    },

    async correctiveToggle(id: string) {
      this.corrective.loading = true;
      this.corrective.error = "";
      try {
        const { data } = await MaintenanceserviceApi.toggleCorrective(id);
        const list = this.correctiveList?.items || [];
        const idx = list.findIndex((x: any) => x._id === id);
        if (idx !== -1) list[idx].estado = data?.estado;
        if (
          this.corrective.detail &&
          (this.corrective.detail as any)._id === id
        ) {
          (this.corrective.detail as any).estado = data?.estado;
        }
        return data;
      } catch (e: any) {
        this.corrective.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo cambiar estado";
        throw e;
      } finally {
        this.corrective.loading = false;
      }
    },

    // === ALISTAMIENTO ===
    async enlistmentUpdateDetail(id: string, payload: any) {
      this.enlistment.loading = true;
      this.enlistment.error = "";
      try {
        const { data } = await MaintenanceserviceApi.updateEnlistment(
          id,
          payload
        );
        const list = this.enlistmentList?.items || [];
        const idx = list.findIndex((x: any) => x._id === id);
        if (idx !== -1) list[idx] = { ...list[idx], ...data };
        if (
          this.enlistment.detail &&
          (this.enlistment.detail as any)._id === id
        ) {
          this.enlistment.detail = {
            ...(this.enlistment.detail as any),
            ...data,
          };
        }
        return data;
      } catch (e: any) {
        this.enlistment.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo actualizar alistamiento";
        throw e;
      } finally {
        this.enlistment.loading = false;
      }
    },

    async enlistmentToggle(id: string) {
      this.enlistment.loading = true;
      this.enlistment.error = "";
      try {
        const { data } = await MaintenanceserviceApi.toggleEnlistment(id);
        const list = this.enlistmentList?.items || [];
        const idx = list.findIndex((x: any) => x._id === id);
        if (idx !== -1) list[idx].estado = data?.estado;
        if (
          this.enlistment.detail &&
          (this.enlistment.detail as any)._id === id
        ) {
          (this.enlistment.detail as any).estado = data?.estado;
        }
        return data;
      } catch (e: any) {
        this.enlistment.error =
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo cambiar estado";
        throw e;
      } finally {
        this.enlistment.loading = false;
      }
    },
    async createPreventiveWithProgram({
      maintenancePayload,
      file,
    }: {
      maintenancePayload: any;
      file: File;
    }) {
      // 1) subir archivo (el controller toma vigiladoId del JWT; mando 0 para pasar DTO si aún lo exige)
      const fileRef = await this.uploadFile(file);
      if (!fileRef || !fileRef.nombreAlmacenado)
        throw new Error("No se pudo subir el archivo");

      // 2) crear programa tipo 1 (preventivo)
      await this.programsCreate({
        tipoId: 1,
        documento: fileRef.nombreAlmacenado,
        nombreOriginal: fileRef.nombreOriginalArchivo,
        ruta: fileRef.ruta,
        vigiladoId: 0,
      });

      // 3) crear el preventivo
      return await this.preventiveCreateDetail(maintenancePayload);
    },

    async createCorrectiveWithProgram({
      maintenancePayload,
      file,
    }: {
      maintenancePayload: any;
      file: File;
    }) {
      const fileRef = await this.uploadFile(file);
      await this.programsCreate({
        tipoId: 2,
        documento: fileRef?.nombreAlmacenado,
        nombreOriginal: fileRef?.nombreOriginalArchivo,
        ruta: fileRef?.ruta,
        vigiladoId: 0,
      });
      return this.correctiveCreateDetail(maintenancePayload);
    },

    async createEnlistmentWithProgram({
      maintenancePayload,
      file,
    }: {
      maintenancePayload: any;
      file: File;
    }) {
      const fileRef = await this.uploadFile(file);
      await this.programsCreate({
        tipoId: 3,
        documento: fileRef?.nombreAlmacenado,
        nombreOriginal: fileRef?.nombreOriginalArchivo,
        ruta: fileRef?.ruta,
        vigiladoId: 0,
      });
      return this.enlistmentCreate(maintenancePayload);
    },
  },
});
