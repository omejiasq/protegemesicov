import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import { useAuthStore } from "../stores/authStore";

const routes: RouteRecordRaw[] = [
  // RUTA PÚBLICA
  {
    path: "/login",
    name: "login",
    component: () => import("../views/LoginView.vue"),
    meta: { public: true },
  },

  // CAMBIO DE CONTRASEÑA OBLIGATORIO (requiere auth pero no layout completo)
  {
    path: "/change-password",
    name: "change-password",
    component: () => import("../views/ChangePasswordView.vue"),
    meta: { requiresAuth: true },
  },

  // FUEC — vista de impresión/PDF (sin layout, requiere auth)
  {
    path: "/fuec/:id/print",
    name: "fuec-print",
    component: () => import("../views/maintenance/FuecPrint.vue"),
    meta: { requiresAuth: true },
  },

  // RUTAS PRIVADAS ENVUELTAS POR EL LAYOUT
  {
    path: "/",
    component: () => import("../layouts/AppLayout.vue"), // << PARENT
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        name: "dashboard",
        //component: () => import("../views/DashboardView.vue"),
        component: () => import("../views/maintenance/MaintenanceDashboard.vue"),
      },
      {
        path: "vehicles",
        name: "vehicles",
        component: () => import("../views/VehicleListView.vue"),
      },
      {
        path: "drivers",
        name: "drivers",
        component: () => import("../views/DriverListView.vue"),
      },
      {
        path: "maintenance/overview",
        name: "maintenance/overview",
        component: () => import("../views/maintenance/Overview.vue"),
      },
      {
        path: "maintenance/maintenance",
        name: "maintenance/maintenance",
        component: () => import("../views/maintenance/Maintenance.vue"),
      },
      {
        path: "maintenance/program",
        name: "maintenance/program",
        component: () => import("../views/maintenance/ProgramView.vue"),
      },
      {
        path: "maintenance/preventive",
        name: "maintenance/preventive",
        component: () => import("../views/maintenance/Preventive.vue"),
      },
      {
        path: "maintenance/corrective",
        name: "maintenance/corrective",
        component: () => import("../views/maintenance/Corrective.vue"),
      },
      {
        path: "maintenance/enlistment",
        name: "maintenance/enlistment",
        component: () => import("../views/maintenance/Enlistment.vue"),
      },
      {
        path: "authorizations",
        name: "authorizations",
        component: () => import("../views/AuthorizationsView.vue"),
      },
            {
        path: "incidents",
        name: "incidents",
        component: () => import("../views/IncidentsView.vue"),
      },

      {
        path: "/maintenance/maintenancedashboard",
        name: "/maintenance/maintenancedashboard",
        component: () => import("../views/maintenance/MaintenanceDashboard.vue"),
      },
      {
        path: "/maintenance/maintenancecalendar",
        name: "/maintenance/maintenancecalendar",
        component: () => import("../views/maintenance/PreventiveMaintenanceCalendar.vue"),
      },
      {
        path: '/vehicles/edit/:id',
        name: 'vehicle-edit',
        component: () => import('../views/VehicleEdit.vue'),
        //component: () => import("../views/VehicleListView.vue"),
        props: true
      },
      {
        path: 'vehiclescreate',
        name: 'vehiclescreate',
        component: () => import('../views/VehicleCreate.vue'),
        props: true
      },
      {
        path: 'drivercreate',
        name: 'drivercreate',
        component: () => import('../views/DriverCreate.vue'),
        props: true
      },
      {
        path: "/corrective-report/:id",
        name: "corrective-report",
        component: () => import('../views/maintenance/CorrectiveDetail.vue'),
        props: true
      },
      {
        path: '/drivers/:id/edit',
        name: 'driver-edit',
        component: () => import('../views/DriverEdit.vue')
      },

      // ─── STAFF (admin, operator, viewer) ───
      {
        path: "staff",
        name: "staff",
        component: () => import("../views/StaffList.vue"),
      },
      {
        path: "staff/create",
        name: "staff-create",
        component: () => import("../views/StaffCreate.vue"),
      },
      {
        path: "staff/:id/edit",
        name: "staff-edit",
        component: () => import("../views/StaffEdit.vue"),
        props: true,
      },

      {
        path: "/preventive-report/:id",
        name: "preventive-report",
        component: () => import('../views/maintenance/PreventiveDetail.vue'),
        props: true
      },

      {
        path: "enterprise/settings",
        name: "enterprise-settings",
        component: () => import("../views/EnterpriseSettings.vue"),
      },

      {
        path: "maintenance/types",
        name: "maintenance/types",
        component: () => import("../views/maintenance/MaintenanceTypes.vue"),
      },

      {
        path: "maintenance/inspection-types",
        name: "maintenance/inspection-types",
        component: () => import("../views/maintenance/InspectionTypes.vue"),
      },

      {
        path: "maintenance/fuec",
        name: "maintenance/fuec",
        component: () => import("../views/maintenance/Fuec.vue"),
      },

      {
        path: "maintenance/suppliers",
        name: "maintenance/suppliers",
        component: () => import("../views/maintenance/Suppliers.vue"),
      },

      {
        path: "maintenance/response-types",
        name: "maintenance/response-types",
        component: () => import("../views/maintenance/ResponseTypes.vue"),
      },

      // ─── REPORTES (admin) ───
      {
        path: "audit-report",
        name: "audit-report",
        component: () => import("../views/AuditReport.vue"),
      },

      // ─── PERMISOS DE MENÚ (admin) ───
      {
        path: "enterprise/menu-permissions",
        name: "menu-permissions",
        component: () => import("../views/MenuPermissions.vue"),
      },

      // ─── PESV ───
      {
        path: 'pesv/dashboard',
        name: 'pesv-dashboard',
        component: () => import('../views/pesv/PesvDashboard.vue'),
      },
      {
        path: 'pesv/working-hours',
        name: 'pesv-working-hours',
        component: () => import('../views/pesv/WorkingHours.vue'),
      },
      {
        path: 'pesv/habits',
        name: 'pesv-habits',
        component: () => import('../views/pesv/HabitsReport.vue'),
      },
      {
        path: 'pesv/breathalyzer',
        name: 'pesv-breathalyzer',
        component: () => import('../views/pesv/BreathlyzerLog.vue'),
      },
      {
        path: 'pesv/training',
        name: 'pesv-training',
        component: () => import('../views/pesv/Training.vue'),
      },
      {
        path: 'pesv/evidence',
        name: 'pesv-evidence',
        component: () => import('../views/pesv/Evidence.vue'),
      },
      {
        path: 'pesv/f1',
        name: 'pesv-f1',
        component: () => import('../views/pesv/PesvF1.vue'),
      },
      {
        path: 'pesv/incidents',
        name: 'pesv-incidents',
        component: () => import('../views/pesv/PesvIncidents.vue'),
      },
      {
        path: 'pesv/risk-matrix',
        name: 'pesv-risk-matrix',
        component: () => import('../views/pesv/RiskMatrix.vue'),
      },
      {
        path: 'pesv/annual-plan',
        name: 'pesv-annual-plan',
        component: () => import('../views/pesv/AnnualPlan.vue'),
      },
      {
        path: 'pesv/non-conformities',
        name: 'pesv-non-conformities',
        component: () => import('../views/pesv/NonConformities.vue'),
      },
      {
        path: 'pesv/km-importer',
        name: 'pesv-km-importer',
        component: () => import('../views/pesv/GpsKmImporter.vue'),
      },
      // ─── REPORTES DINÁMICOS (PESV) ───
      {
        path: 'pesv/reports',
        name: 'pesv-reports',
        component: () => import('../views/reports/ReportsManager.vue'),
      },
      {
        path: 'pesv/reports/create',
        name: 'pesv-reports-create',
        component: () => import('../views/reports/CreateReport.vue'),
      },
      {
        path: 'pesv/reports/view/:id',
        name: 'pesv-reports-view',
        component: () => import('../views/reports/ViewReport.vue'),
        props: true,
      },
      {
        path: 'pesv/reports/edit/:id',
        name: 'pesv-reports-edit',
        component: () => import('../views/reports/EditReport.vue'),
        props: true,
      },
      {
        path: 'pesv/reports/results',
        name: 'pesv-reports-results',
        component: () => import('../views/reports/ResultsReport.vue'),
      },

      // ─── ALERTAS DE DOCUMENTOS ───
      {
        path: 'maintenance/document-alerts',
        name: 'document-alerts',
        component: () => import('../views/maintenance/DocumentAlerts.vue'),
      },

      // ─── INTEGRACIÓN DE DATOS ───
      {
        path: 'enterprise/data-sync',
        name: 'enterprise-data-sync',
        component: () => import('../views/integrations/DataSync.vue'),
      },

      // ─── DESPACHOS (solo empresas CARRETERA) ───
      {
        path: 'despachos',
        name: 'despachos',
        component: () => import('../views/terminales/Despachos.vue'),
      },
      {
        path: 'despachos/novedades',
        name: 'despachos-novedades',
        component: () => import('../views/terminales/Novedades.vue'),
      },

      // ─── REDIRECCIONES PARA COMPATIBILIDAD ───
      {
        path: 'despachos/salidas',
        redirect: '/despachos',
      },
      {
        path: 'despachos/llegadas',
        redirect: '/despachos',
      },

      // ─── SUPERADMIN ───
      {
        path: "admin/enterprises",
        name: "admin-enterprises",
        component: () => import("../views/admin/EnterpriseManagement.vue"),
        meta: { requiresSuperAdmin: true },
      },
      {
        path: "admin/menu-catalog",
        name: "admin-menu-catalog",
        component: () => import("../views/admin/MenuCatalog.vue"),
        meta: { requiresSuperAdmin: true },
      },

    ],
  },

  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();

  if (to.meta?.public) {
    if (to.name === "login" && auth.isAuthenticated)
      return next({ name: "dashboard", replace: true });
    return next();
  }
  if (to.meta?.requiresAuth && !auth.isAuthenticated) {
    return next({ name: "login", replace: true });
  }

  // Si el usuario debe cambiar su contraseña, redirigir salvo que ya esté en esa ruta
  if (auth.isAuthenticated && auth.user?.must_change_password && to.name !== "change-password") {
    return next({ name: "change-password", replace: true });
  }

  if (to.meta?.requiresSuperAdmin && !auth.isSuperAdmin) {
    return next({ name: "dashboard", replace: true });
  }
  return next();
});

export default router;
