<template>
  <div class="dashboard">

    <!-- ================= HEADER ================= -->
    <header class="header">
      <h1>Tablero Ejecutivo · Mantenimientos</h1>
    </header>

    <!-- ================= KPI ================= -->
    <section class="kpis-wrapper">
  
      <div class="kpi-card primary">
        <span class="kpi-label">Alistamientos / día</span>
        <span class="kpi-value">166</span>
      </div>
      <div class="kpi-card warning">
        <span class="kpi-label">Vencimientos</span>
        <span class="kpi-value"> 87</span>
      </div>
        <div class="kpi-card primary">
        <span class="kpi-label">Cumplimiento</span>
        <span class="kpi-value"> 95%</span>
      </div>
    </section>

    <!-- ================= CHARTS ================= -->
    <section class="charts-grid">

      <!-- PIE (ESTILO TABLEAU) -->
      <div class="chart-card" id="chart-pie">
        <div class="chart-header">
          <h3>Estado de Preventivos</h3>
          <button @click="toggleFullscreen('chart-pie')">⛶</button>
        </div>

<ejs-circularchart3d
  id="pie3d"
  height="280"
  :tilt="-45"
  :depth="55"
  :rotation="25"
  :legendSettings="{ 
    visible: true, 
    position: 'Bottom',
    alignment: 'Center'
  }"
  :tooltip="{ enable: true }"
>
  <e-circularchart3d-series-collection>
    <e-circularchart3d-series
      type="Pie"
      :dataSource="preventiveStatus"
      xName="status"
      yName="value"
      pointColorMapping="color"
    />

  </e-circularchart3d-series-collection>

</ejs-circularchart3d>





        
      </div>

<!-- COMPARATIVO -->
<div class="chart-card" id="chart-trend">
  <div class="chart-header">
    <h3>Comparativo Mensual · Preventivos vs Alistamientos</h3>
    <button @click="toggleFullscreen('chart-trend')">⛶</button>
  </div>

  <ejs-chart
    height="300"
    :primaryXAxis="primaryXAxis"
    :primaryYAxis="primaryYAxis"
    :axes="secondaryAxes"
    :tooltip="{ enable: true, shared: true }"
    :legendSettings="{ visible: true }"
  >
    <e-series-collection>

      <!-- ALISTAMIENTOS (ESCALA ALTA) -->
      <e-series
        type="Column"
        name="Alistamientos"
        :dataSource="trendData"
        xName="month"
        yName="enlistments"
        fill="#bfdbfe"
        columnSpacing="0.2"
      />

      <!-- PREVENTIVOS (ESCALA BAJA) -->
      <e-series
        type="Line"
        name="Mantenimientos Preventivos"
        :dataSource="trendData"
        xName="month"
        yName="preventive"
        yAxisName="secondary"
        width="3"
        fill="#2563eb"
        marker="{ visible: true, width: 10, height: 10 }"
      />

    </e-series-collection>
  </ejs-chart>
</div>


    </section>

    <!-- ================= TABLE ================= -->
    <section class="table-section">
      <div class="table-header">
        <h3>Análisis Mensual de Mantenimientos Preventivos</h3>

    <button
      class="excel-btn"
      @click="exportTable"
      title="Exportar a Excel"
    >
      <img src="/icons/excel.png" alt="Excel" />
    </button>

      </div>

        <ejs-grid
          ref="gridRef"
          :dataSource="tableData"
          height="320"
          :allowExcelExport="true"
          :allowPaging="true"
          :pageSettings="{ pageSize: 8 }"
          :queryCellInfo="customiseCell"
        >
        <e-columns>

          <e-column field="mes" headerText="Mes" width="80" />

          <e-column field="programados" headerText="Programados" width="120" textAlign="Right" />

          <e-column field="ejecutados" headerText="Ejecutados" width="120" textAlign="Right" />

          <e-column field="cumplimiento" headerText="Cumplimiento" width="120" textAlign="Right" />

        </e-columns>
      </ejs-grid>
      
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue';

/* ===== Charts ===== */
import {
  AccumulationChartComponent as EjsAccumulationchart,
  AccumulationSeriesCollectionDirective as EAccumulationSeriesCollection,
  AccumulationSeriesDirective as EAccumulationSeries,
  ChartComponent as EjsChart,
  SeriesCollectionDirective as ESeriesCollection,
  SeriesDirective as ESeries,
  LineSeries,
  ColumnSeries,
  Category,
  Tooltip,
  Zoom,
  Legend
} from '@syncfusion/ej2-vue-charts';

const customiseCell = (args: any) => {
  if (args.column.field === 'cumplimiento') {
    const value = args.data.cumplimiento;

    if (value < 80) {
      args.cell.classList.add('cumplimiento-red');
    } else if (value < 90) {
      args.cell.classList.add('cumplimiento-orange');
    } else {
      args.cell.classList.add('cumplimiento-green');
    }

    // Opcional: formato %
    args.cell.innerText = `${value}%`;
  }
};


const secondaryAxes = [
  {
    name: 'secondary',
    title: 'Mantenimientos Preventivos',
    opposedPosition: true,
    minimum: 0,
    labelFormat: '{value}',
    majorGridLines: { width: 0 } // limpia visualmente
  }
];
const primaryXAxis = {
  valueType: 'Category',
  title: 'Mes',
  majorGridLines: { width: 0 }
};


/* ===== Grid ===== */
import {
  GridComponent as EjsGrid,
  ColumnsDirective as EColumns,
  ColumnDirective as EColumn,
  Page,
  ExcelExport
} from '@syncfusion/ej2-vue-grids';

provide('chart', [LineSeries, ColumnSeries, Category, Tooltip, Zoom, Legend]);
provide('grid', [Page, ExcelExport]);

import {
  CircularChart3DComponent as EjsCircularchart3d,
  CircularChart3DSeriesCollectionDirective,
  CircularChart3DSeriesDirective,
  PieSeries3D,
  CircularChartLegend3D,
  CircularChartTooltip3D
} from '@syncfusion/ej2-vue-charts';

provide('circularchart3d', [
  PieSeries3D,
  CircularChartLegend3D,
  CircularChartTooltip3D
]);

const getTrendClass = (value: number) => {
  if (value >= 5) return 'trend-green';
  if (value >= -5) return 'trend-yellow';
  return 'trend-red';
};


/* ===== DATA ===== */
const pastelPalette = ['#93c5fd', '#bfdbfe', '#60a5fa'];

const preventiveStatus = [
  {
    status: 'Vigentes',
    value: 820,
    color: '#cfe8ff' // azul pastel suave (Tableau style)
  },
  {
    status: 'Próximos',
    value: 310,
    color: '#fff1b8' // amarillo pastel suave
  },
  {
    status: 'Vencidos',
    value: 118,
    color: '#ffd6d6' // rojo pastel MUY suave
  }
];


const trendData = [
  { month: 'Ene', preventive: 80, enlistments: 188 },
  { month: 'Feb', preventive: 95, enlistments: 210 },
  { month: 'Mar', preventive: 110, enlistments: 230 },
  { month: 'Abr', preventive: 105, enlistments: 240 },
  { month: 'May', preventive: 120, enlistments: 260 },
  
  { month: 'Jun', preventive: 160, enlistments: 2850 },
  { month: 'Jul', preventive: 166, enlistments: 3570 },
  { month: 'Ago', preventive: 167, enlistments: 4769 },
  { month: 'Sep', preventive: 176, enlistments: 4845 },
  { month: 'Oct', preventive: 177, enlistments: 4845 },
  { month: 'Nov', preventive: 178, enlistments: 4850 },
  { month: 'Dic', preventive: 180, enlistments: 4980 }

];

const tableData = trendData.map(m => {
  const programados = m.preventive + 10;
  const cumplimiento = Math.round((m.preventive / programados) * 100);
  return {
    mes: m.month,
    programados,
    ejecutados: m.preventive,
    cumplimiento,
    tendencia: cumplimiento - 85
  };
});

/* ===== CONFIG ===== */
const primaryYAxis = {
  title: 'Alistamientos',
  labelFormat: '{value}',
  minimum: 0,
};

const zoomSettings = {
  enableMouseWheelZooming: true,
  enableSelectionZooming: true,
  mode: 'X'
};

/* ===== FULLSCREEN ===== */
const toggleFullscreen = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen();
};

//const gridRef = ref();
const gridRef = ref<any>(null);
//const exportTable = () => gridRef.value?.excelExport();
const exportTable = () => {
  if (gridRef.value) {
    gridRef.value.excelExport();
  }
};

</script>

<style scoped>
.dashboard {
  padding: 1.5rem;
  background: #f8fafc;
  display: grid;
  gap: 1.5rem;
}

/* HEADER */
.header {
  padding-bottom: .5rem;
  border-bottom: 1px solid #e5e7eb;
}
.subtitle { color: #64748b; }

/* KPI */
.kpis-wrapper {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 1rem;
  margin-top: .5rem;
}
.kpi-card {
  background: white;
  border-radius: 14px;
  padding: 1.25rem;
  box-shadow: 0 4px 20px rgba(0,0,0,.06);
  border-left: 6px solid #93c5fd;
}
.kpi-card.warning { border-left-color: #fde68a; }
.kpi-label {
  color: #64748b;
  font-size: .85rem;
}
.kpi-value {
  font-size: 2rem;
  font-weight: 700;
}

/* CHARTS */
.charts-grid {
  display: grid;
  grid-template-columns: 2fr 3fr; /* PIE | BARRAS */
  gap: 1.5rem;
}
.chart-card {
  background: white;
  border-radius: 16px;
  padding: 1rem;
  box-shadow: 0 4px 20px rgba(0,0,0,.06);
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* TABLE */
.table-section {
  background: white;
  border-radius: 16px;
  padding: 1rem;
  box-shadow: 0 4px 20px rgba(0,0,0,.06);
}
.table-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: .5rem;
}

/* SEMÁFORO PASTEL */
.trend-soft {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  font-weight: 600;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.dot.green { background: #bbf7d0; }
.dot.yellow { background: #fef3c7; }
.dot.red { background: #fecaca; }

/* ================= SEMÁFORO TENDENCIA ================= */
.trend-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.85rem;
  min-width: 90px;
}

/* DOT */
.trend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

/* POSITIVO */
.trend-green {
  background: #ecfdf5;
  color: #065f46;
}
.trend-green .trend-dot {
  background: #34d399;
}

/* NEUTRO */
.trend-yellow {
  background: #fffbeb;
  color: #92400e;
}
.trend-yellow .trend-dot {
  background: #facc15;
}

/* NEGATIVO */
.trend-red {
  background: #fef2f2;
  color: #991b1b;
}
.trend-red .trend-dot {
  background: #f87171;
}

/* ================= EXCEL ICON BUTTON ================= */
.excel-btn {
  background: #ecfdf5;
  border: 1px solid #d1fae5;
  border-radius: 10px;
  padding: 0.45rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .2s ease;
}

.excel-btn img {
  width: 20px;
  height: 20px;
}

.excel-btn:hover {
  background: #d1fae5;
  transform: scale(1.05);
}

.excel-btn:active {
  transform: scale(0.95);
}

/* ===== CUMPLIMIENTO SEMÁFORO CELDA ===== */
.cumplimiento-green {
  background-color: #ecfdf5;
  color: #065f46;
  font-weight: 700;
}

.cumplimiento-orange {
  background-color: #fffbeb;
  color: #92400e;
  font-weight: 700;
}

.cumplimiento-red {
  background-color: #fef2f2;
  color: #991b1b;
  font-weight: 700;
}
.cumplimiento-green,
.cumplimiento-orange,
.cumplimiento-red {
  border-radius: 6px;
}

:deep(.cumplimiento-green) {
  background-color: #ecfdf5 !important;
  color: #065f46 !important;
  font-weight: 700;
}

:deep(.cumplimiento-orange) {
  background-color: #fffbeb !important;
  color: #92400e !important;
  font-weight: 700;
}

:deep(.cumplimiento-red) {
  background-color: #fef2f2 !important;
  color: #991b1b !important;
  font-weight: 700;
}

:deep(.cumplimiento-green),
:deep(.cumplimiento-orange),
:deep(.cumplimiento-red) {
  border-radius: 6px;
  text-align: center;
}


</style>
