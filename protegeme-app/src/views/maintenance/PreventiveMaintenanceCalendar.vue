<template>
  <div class="maintenance-calendar-page">

    <!-- ================= HEADER ================= -->
    <header class="page-header">
      <h2>Agenda Operativa de Flota</h2>
      <p>Semana crítica · 26 al 30 de enero de 2026</p>
    </header>

    <!-- ================= CALENDAR ================= -->
    <section class="calendar-wrapper">
      <ejs-schedule
        height="720px"
        width="100%"
        :selectedDate="selectedDate"
        :views="views"
        :eventSettings="eventSettings"
        :showQuickInfo="true"
        :allowDragAndDrop="false"
        :allowResizing="false"
        :currentView="'Week'"
      >
        <e-views>
          <e-view option="Week" />
          <e-view option="Agenda" />
          <e-view option="Day" />
        </e-views>
      </ejs-schedule>
    </section>

  </div>
</template>

<script setup lang="ts">
import {
  ScheduleComponent as EjsSchedule,
  ViewsDirective as EViews,
  ViewDirective as EView,
  Week,
  Day,
  Agenda,
} from "@syncfusion/ej2-vue-schedule";
import { provide } from "vue";

/* =============================
   PROVIDERS
============================= */
provide("schedule", [Week, Day, Agenda]);

/* =============================
   FECHA BASE (LUNES)
============================= */
const selectedDate = new Date(2026, 0, 26); // 26 enero 2026

/* =============================
   VISTAS
============================= */
const views = ["Week", "Agenda", "Day"];

/* =============================
   EVENTOS – SEMANA CRÍTICA
============================= */
const events = [
  // ---------------- LUNES ----------------
  {
    Id: 1,
    Subject: "Preventivo – ABC123",
    StartTime: new Date(2026, 0, 26, 8, 0),
    EndTime: new Date(2026, 0, 26, 9, 0),
    Description: "Cambio de aceite · Bimestral",
    CategoryColor: "#d1fae5",
  },
  {
    Id: 2,
    Subject: "SOAT vence – DEF456",
    StartTime: new Date(2026, 0, 26, 9, 0),
    EndTime: new Date(2026, 0, 26, 9, 30),
    Description: "Documento obligatorio",
    CategoryColor: "#ffedd5",
  },
  {
    Id: 3,
    Subject: "Alistamiento – GHI789",
    StartTime: new Date(2026, 0, 26, 6, 0),
    EndTime: new Date(2026, 0, 26, 6, 20),
    Description: "Inspección diaria",
    CategoryColor: "#e0f2fe",
  },

  // ---------------- MARTES ----------------
  {
    Id: 4,
    Subject: "Correctivo – JKL321",
    StartTime: new Date(2026, 0, 27, 10, 0),
    EndTime: new Date(2026, 0, 27, 12, 0),
    Description: "Falla sistema de frenos",
    CategoryColor: "#fee2e2",
  },
  {
    Id: 5,
    Subject: "Tecnomecánica – MNO654",
    StartTime: new Date(2026, 0, 27, 8, 30),
    EndTime: new Date(2026, 0, 27, 9, 0),
    Description: "Vence en 3 días",
    CategoryColor: "#ffedd5",
  },

  // ---------------- MIÉRCOLES ----------------
  {
    Id: 6,
    Subject: "Preventivo – PQR987",
    StartTime: new Date(2026, 0, 28, 7, 0),
    EndTime: new Date(2026, 0, 28, 8, 0),
    Description: "Revisión general",
    CategoryColor: "#d1fae5",
  },
  {
    Id: 7,
    Subject: "Licencia conductor – CC123",
    StartTime: new Date(2026, 0, 28, 9, 0),
    EndTime: new Date(2026, 0, 28, 9, 30),
    Description: "Vencimiento licencia",
    CategoryColor: "#ede9fe",
  },

  // ---------------- JUEVES ----------------
  {
    Id: 8,
    Subject: "Alistamiento – STU456",
    StartTime: new Date(2026, 0, 29, 6, 0),
    EndTime: new Date(2026, 0, 29, 6, 20),
    Description: "Inspección diaria",
    CategoryColor: "#e0f2fe",
  },
  {
    Id: 9,
    Subject: "Preventivo – VWX741",
    StartTime: new Date(2026, 0, 29, 11, 0),
    EndTime: new Date(2026, 0, 29, 12, 0),
    Description: "Cambio filtros",
    CategoryColor: "#d1fae5",
  },

  // ---------------- VIERNES ----------------
  {
    Id: 10,
    Subject: "Correctivo – YZA852",
    StartTime: new Date(2026, 0, 30, 14, 0),
    EndTime: new Date(2026, 0, 30, 16, 0),
    Description: "Suspensión delantera",
    CategoryColor: "#fee2e2",
  },
];

/* =============================
   EVENT SETTINGS
============================= */
const eventSettings = {
  dataSource: events,
  fields: {
    id: "Id",
    subject: { name: "Subject" },
    startTime: { name: "StartTime" },
    endTime: { name: "EndTime" },
    description: { name: "Description" },
  },
};
</script>

<style scoped>
.maintenance-calendar-page {
  padding: 16px;
  background: #f8fafc;
  min-height: 100vh;
}

/* Header */
.page-header {
  margin-bottom: 12px;
}
.page-header h2 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: #0f172a;
}
.page-header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

/* Calendar wrapper */
.calendar-wrapper {
  background: #ffffff;
  border-radius: 16px;
  padding: 8px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
}

/* Appointments */
.e-schedule .e-appointment {
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 6px;
}

/* Mobile optimization */
@media (max-width: 768px) {
  .calendar-wrapper {
    padding: 4px;
  }
  .page-header h2 {
    font-size: 1.2rem;
  }
}
</style>
