import { defineStore } from 'pinia';
import { DashboardServiceApi } from '../api/dashboard.service';

type AnyObj = Record<string, any>;

const MESES = [
  'Ene','Feb','Mar','Abr','May','Jun',
  'Jul','Ago','Sep','Oct','Nov','Dic'
];

export const useDashboardStore = defineStore('dashboard', {
  /* ===================== STATE ===================== */
  state: () => ({
    year: new Date().getFullYear(),
    month: null as number | null,

    data: {
      kpis: {},
      piePreventivos: [],
      trendEnlistamientos: [],
      rankingConductores: [],
      rankingPlacas: [],
      tablaVehiculos: [], // ✅ NUEVO
    },
  }),

  /* ===================== GETTERS ===================== */
  getters: {
    /* ---------- KPIs ---------- */
    kpis: (s) => s.data.kpis ?? {},

    /* ---------- PIE PREVENTIVOS ---------- */
    piePreventivos: (s) =>
      (s.data.piePreventivos ?? []).map((p: any) => ({
        label: p.label,
        value: p.value,
        color: p.color,
      })),

    /* ---------- TENDENCIA ALISTAMIENTOS ---------- */
    trendEnlistamientos: (s) => {
      const arr = s.data.trendEnlistamientos ?? [];

      // 🔹 FILTRADO POR MES → DÍAS
      if (s.month) {
        const daysInMonth = new Date(s.year, s.month, 0).getDate();
        const totals = Array(daysInMonth).fill(0);

        arr.forEach((d: any) => {
          totals[d.periodo - 1] = d.total;
        });

        return {
          labels: Array.from(
            { length: daysInMonth },
            (_, i) => `Día ${i + 1}`
          ),
          data: totals,
        };
      }

      // 🔹 SOLO AÑO → MESES
      const totals = Array(12).fill(0);

      arr.forEach((m: any) => {
        totals[m.periodo - 1] = m.total;
      });

      return {
        labels: MESES,
        data: totals,
      };
    },

    /* ---------- RANKINGS ---------- */
    rankingConductores: (s) =>
      s.data.rankingConductores ?? [],

    rankingPlacas: (s) =>
      s.data.rankingPlacas ?? [],

    /* ---------- TABLA POR PLACA ---------- */
    tablaVehiculos: (s) =>
      s.data.tablaVehiculos ?? [],
  },

  /* ===================== ACTIONS ===================== */
  actions: {
    /* ---------- CARGA PRINCIPAL ---------- */
    async load(year: number, month?: number | null) {
      this.year = year;
      this.month = month ?? null;

      const params: AnyObj = { year };
      if (this.month) params.month = this.month;

      const res = await DashboardServiceApi.get(params);

      console.log('📊 DASHBOARD PARAMS 👉', params);
      console.log('📦 DATA BACKEND 👉', res.data);

      this.data = res.data; // 🔥 reactivo y limpio
    },

    /* ---------- FILTROS ---------- */
    setYear(year: number) {
      this.load(year, this.month);
    },

    setMonth(month: number | null) {
      this.load(this.year, month);
    },

    clearMonth() {
      this.load(this.year, null);
    },
  },
});
