import { defineStore } from "pinia";
import { useVehiclesStore } from "./vehiclesStore";
import { useDriversStore } from "./driversStore";
import { IncidentsserviceApi } from "../api/incidents.service";
import { AuthorizationsserviceApi } from "../api/authorization.service";

export const useDashboardStore = defineStore("dashboard", {
  state: () => ({
    kpis: {
      vehiclesActive: 0,
      driversActive: 0,
      documentsExpiring: 0,
      incidentsOpen: 0,
      authorizationOpen: 0,
    },
    expiringList: [] as any[],
    recent: [] as any[], // actividad reciente (incidents u otros)
    loading: false,
  }),
  actions: {
    async load() {
      this.loading = true;
      try {
        const vehicles = useVehiclesStore();
        const drivers = useDriversStore();
        const [vehAct, drvAct, expiring, incidents, authTotal] =
          await Promise.all([
            vehicles.countActive(),
            drivers.countActive(),
            vehicles.soonToExpire(30),
            IncidentsserviceApi.list?.({ page: 1, numero_items: 5 })
              .then((r) => r?.data?.items ?? r?.data ?? [])
              .catch(() => []),

            // 👉 pedir 1 item y leer el total global
            AuthorizationsserviceApi.authorizationList({
              page: 1,
              numero_items: 1,
            })
              .then((r: any) => {
                const p = r?.data ?? r;
                if (typeof p?.total === "number") return p.total;
                if (typeof p?.count === "number") return p.count;
                if (Array.isArray(p?.items)) return p.items.length;
                if (Array.isArray(p)) return p.length;
                return 0;
              })
              .catch(() => 0),
          ]);

        this.kpis.vehiclesActive = vehAct;
        this.kpis.driversActive = drvAct;
        this.kpis.documentsExpiring = expiring.total;
        this.kpis.incidentsOpen = Array.isArray(incidents)
          ? incidents.length
          : 0;

        // 👉 ahora sí, el total real de autorizaciones
        this.kpis.authorizationOpen = authTotal;

        this.expiringList = expiring.list;
        this.recent = incidents;
      } finally {
        this.loading = false;
      }
    },
  },
});
