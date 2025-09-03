import { defineStore } from 'pinia';
import { useVehiclesStore } from './vehiclesStore';
import { useDriversStore } from './driversStore';
import { IncidentsserviceApi } from '../api/incidents.service';

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    kpis: {
      vehiclesActive: 0,
      driversActive: 0,
      documentsExpiring: 0,
      incidentsOpen: 0,
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
        const drivers  = useDriversStore();

        const [vehAct, drvAct, expiring, incidents] = await Promise.all([
          vehicles.countActive(),
          drivers.countActive(),
          vehicles.soonToExpire(30),
          // si tu API soporta estado, filtra abiertos. Si no, solo últimos 5.
          IncidentsserviceApi.list?.({ page: 1, numero_items: 5 }).then(r => r.data.items ?? r.data ?? []).catch(() => []),
        ]);

        this.kpis.vehiclesActive   = vehAct;
        this.kpis.driversActive    = drvAct;
        this.kpis.documentsExpiring= expiring.total;
        this.kpis.incidentsOpen    = Array.isArray(incidents) ? incidents.length : 0;

        this.expiringList = expiring.list;
        this.recent       = incidents;
      } finally {
        this.loading = false;
      }
    }
  }
});
