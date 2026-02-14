<template>
  <div class="dashboard">
<section class="filters-bar">
  <!-- AÑO -->
  <button
    class="filter-btn"
    :class="{ active: year === 2025 }"
    @click="setYear(2025)"
  >2025</button>

  <button
    class="filter-btn"
    :class="{ active: year === 2026 }"
    @click="setYear(2026)"
  >2026</button>

  <!-- MES -->
  <select
    class="month-select"
    v-model="month"
    @change="setMonth"
  >
    <option :value="null">Todos los meses</option>
    <option
      v-for="(m, i) in MESES"
      :key="i"
      :value="i + 1"
    >
      {{ m }}
    </option>
  </select>
</section>





    <!-- KPIs -->
    <section class="kpis">
      <div class="kpi">
        <span>Total Alistamientos </span>
        <h2>{{ kpis.totalAlistamientos }}</h2>
      </div>

      <div class="kpi alert">
        <span>Preventivos vencidos</span>
        <h2>{{ kpis.preventivosVencidos }}</h2>
      </div>

      <div class="kpi ok">
        <span>Correctivos año</span>
        <h2>{{ kpis.correctivos }}</h2>
      </div>

      <div class="kpi">
        <span>Vehículos con hallazgos</span>
        <h2>{{ kpis.alistamientosConFalla }}</h2>
      </div>
    </section>

    <!-- FILA 1 -->
    <section class="row">
<div class="card wide">
<h3>
  Alistamientos por
  {{ store.month ? 'Día' : 'Mes' }}
</h3>

<ejs-chart
  height="200px"

  :primaryXAxis="{ valueType: 'Category' }"
  :primaryYAxis="{ minimum: 0 }"
  :tooltip="{ enable: true }"
  ref="columnChartRef"
>
  <e-series-collection>
    <e-series
      type="Column"
      :dataSource="meses"
      xName="mes"
      yName="total"
    />
  </e-series-collection>
</ejs-chart>


</div>


<div class="card small">
  <h3>Estado Preventivos</h3>
<ejs-circularchart3d
  ref="pieChartRef"
  id="pie3d"
  height="210"
  width="300"
  :tilt="-45"
  :depth="55"
  :rotation="25"
  :legendSettings="{ 
    visible: true, 
    position: 'Right',
    alignment: 'Center'
  }"
  :tooltip="{ enable: true }"
>
  <e-circularchart3d-series-collection>
  <e-circularchart3d-series
    type="Pie"
    :dataSource="pie3D"
    xName="status"
    yName="value"
    pointColorMapping="color"
    :dataLabel="dataLabel3D"
  />

  </e-circularchart3d-series-collection>

</ejs-circularchart3d>


</div>


    </section>

    <!-- FILA 2 -->
  <!-- TABLA VEHÍCULOS -->
<div class="card wide_table">
  <h3>Detalle</h3>

  <table class="veh-table">
<thead>
  <tr>
    <th @click="setSort('placa')" style="cursor: pointer">
      Placa 
      <span v-if="sortKey === 'placa'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
    </th>
    <th @click="setSort('totalAlistamientos')" style="cursor: pointer">
      Alistamientos 
      <span v-if="sortKey === 'totalAlistamientos'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
    </th>
    <th @click="setSort('preventivosTotal')" style="cursor: pointer">
      Preventivos 
      <span v-if="sortKey === 'preventivosTotal'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
    </th>
    <th @click="setSort('correctivosTotal')" style="cursor: pointer">
      Correctivos 
      <span v-if="sortKey === 'correctivosTotal'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
    </th>
    <th @click="setSort('alistamientosCriticos')" style="cursor: pointer">
      Con hallazgos 
      <span v-if="sortKey === 'alistamientosCriticos'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
    </th>
  </tr>
</thead>

    <tbody>
      <tr v-for="v in paginatedVehiculos" :key="v.placa">
        <td>{{ v.placa }}</td>
        <td>{{ v.totalAlistamientos }}</td>
        <td>{{ v.preventivosTotal }}</td>
        <td>{{ v.correctivosTotal }}</td>
        <td>
          <span
            class="badge"
            :class="{ danger: v.alistamientosConFalla > 0 }"
          >
            {{ v.alistamientosConFalla }}
          </span>
        </td>
      </tr>

      <tr v-if="paginatedVehiculos.length === 0">
        <td colspan="5" class="empty">
          No hay datos para el período seleccionado
        </td>
      </tr>
    </tbody>
  </table>

  <!-- PAGINACIÓN -->
  <div class="pagination">
    <button
      @click="prevPage"
      :disabled="currentPage === 1"
    >
      ◀
    </button>

    <span>Página {{ currentPage }} de {{ totalPages }}</span>

    <button
      @click="nextPage"
      :disabled="currentPage === totalPages"
    >
      ▶
    </button>
  </div>
</div>



  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, provide, watch } from 'vue';
import { useDashboardStore } from '../../stores/DashboardStore';

import {
  ChartComponent as EjsChart,
  SeriesCollectionDirective as ESeriesCollection,
  SeriesDirective as ESeries,
  ColumnSeries, BarSeries, Category, Tooltip, Legend, DataLabel,
  Export
} from '@syncfusion/ej2-vue-charts';

import {
  AccumulationChartComponent as EjsAccumulationchart,
  AccumulationSeriesCollectionDirective as EAccumulationSeriesCollection,
  AccumulationSeriesDirective as EAccumulationSeries,
  PieSeries, AccumulationLegend, AccumulationDataLabel
} from '@syncfusion/ej2-vue-charts';

provide('chart', [ColumnSeries, BarSeries, Category, Tooltip, Legend, DataLabel, Export]);
provide('accumulationchart', [PieSeries, AccumulationLegend, AccumulationDataLabel, Export]);

import {
  CircularChart3DComponent as EjsCircularchart3d,
  CircularChart3DSeriesCollectionDirective,
  CircularChart3DSeriesDirective,
  PieSeries3D,
  CircularChartLegend3D,
  CircularChartTooltip3D,
  CircularChartDataLabel3D
} from '@syncfusion/ej2-vue-charts';

provide('circularchart3d', [
  PieSeries3D,
  CircularChartLegend3D,
  CircularChartTooltip3D,
  CircularChartDataLabel3D   // 👈 OBLIGATORIO
  //,CircularChartExport3D 
]);

const pieChartRef = ref<any>(null);

const store = useDashboardStore();

const ROWS_PER_PAGE = 5;
const currentPage = ref(1);

const tablaVehiculos = computed(() => store.tablaVehiculos ?? []);
/*
const totalPages = computed(() =>
  Math.ceil(tablaVehiculos.value.length / ROWS_PER_PAGE)
);
*/

/*
const paginatedVehiculos = computed(() => {
  const start = (currentPage.value - 1) * ROWS_PER_PAGE;
  return tablaVehiculos.value.slice(start, start + ROWS_PER_PAGE);
});
*/
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

/* 🔄 Reinicia página cuando cambian filtros */
watch(
  () => [store.year, store.month],
  () => {
    currentPage.value = 1;
  }
);

//const year = ref(new Date().getFullYear());
//const month = ref<number | null>(null);
const year = computed(() => store.year);
const month = computed({
  get: () => store.month,
  set: (val) => store.setMonth(val),
});

const placas = computed(() =>
  (store.tablaVehiculos ?? []).map((v: any) => ({
    placa: v.placa,
    alistamientos: v.totalAlistamientos,
    criticos: v.alistamientosCriticos,
    preventivos: v.preventivosTotal,
    vencidos: v.preventivosVencidos,
    correctivos: v.correctivosTotal,
  }))
);



const setYear = (y: number) => {
  store.setYear(y);
};

const conductores = computed(() => {
  return store.rankingConductores.map((c: any) => ({
    nombre: c.nombre,
    total: c.total,
  }));
});

const primaryXAxisCategory = {
  valueType: 'Category',
  majorGridLines: { width: 0 }
};


const primaryXAxis = {
  valueType: 'Category',
  title: 'Mes',
  majorGridLines: { width: 0 }
};

const primaryYAxis = {
  minimum: 0,
};

const tooltip = { enable: true };

const legendSettings = {
  visible: true,
  position: 'Bottom',
  alignment: 'Center'
};

const tooltipPie = {
  enable: true,
  format: '${point.x} : ${point.y} (${point.percentage}%)'
};

const dataLabel3D = {
  visible: true,
  position: 'Outside',
  font: { fontWeight: '600', size: '12px' },
  connectorStyle: { length: '20px' },
  //format: '${point.y}'  // Muestra el valor numérico
  //format: '${point.y} (${point.percentage}%)'
  //format: '${point.x}'
};

/* ================= FILTROS ================= */
//const year = ref(new Date().getFullYear());
//const month = ref<number | null>(null);

onMounted(() => {
  store.load(year.value);
});

const pie3D = computed(() => {
  return store.piePreventivos.map((p: any) => ({
    status: p.label,
    value: p.value,
    color: p.color,
  }));
});

/*
watch(
  conductores,
  (val) => {
    //console.log('conductores WATCH 👉', val);
  },
  { immediate: true }
  
);
*/


watch(
  () => pie3D.value,
  (val) => {
    console.log('pie3D WATCH 👉', val);

    if (pieChartRef.value?.ej2Instances) {
      pieChartRef.value.ej2Instances.dataBind();
    }
  },
  { deep: true }
);



const setRange = (type: string) => {
  const today = new Date();
  let from: Date | null = null;
  let to: Date | null = null;

  switch (type) {
    case 'today':
      from = new Date(today);
      to = new Date(today);
      break;

    case '7':
      from = new Date();
      from.setDate(today.getDate() - 7);
      to = today;
      break;

    case '30':
      from = new Date();
      from.setDate(today.getDate() - 30);
      to = today;
      break;

    case 'year':
      from = new Date(today.getFullYear(), 0, 1);
      to = new Date(today.getFullYear(), 11, 31);
      break;
  }

  store.setDateRange(from, to);
};



/* ================= COMPUTEDS CORRECTOS ================= */

const kpis = computed(() => store.kpis);

/*
const meses = computed(() => {
  const labels = store.trendEnlistamientos.labels;
  const data = store.trendEnlistamientos.data;

  return labels.map((mes: string, i: number) => ({
    mes,
    total: data[i] || 0,
  }));
});
*/
const meses = computed(() => {
  const labels = store.trendEnlistamientos.labels;
  const data = store.trendEnlistamientos.data;

  return labels.map((mes: string, i: number) => ({
    mes,
    total: data[i] || 0,
  }));
});

const MESES = [
  'Ene','Feb','Mar','Abr','May','Jun',
  'Jul','Ago','Sep','Oct','Nov','Dic'
];


/*
areaData.value = {
  labels: response.trendEnlistamientos.map(x => `Mes ${x.mes}`),
  datasets: [
    {
      label: "Enlistamientos",
      data: response.trendEnlistamientos.map(x => x.total),
      fill: true,
      tension: 0.4,
    },
  ],
};
*/
/*
pieData.value = {
  labels: response.piePreventivos.map(x => x.status),
  datasets: [
    {
      data: response.piePreventivos.map(x => x.value),
      backgroundColor: response.piePreventivos.map(x => x.color),
    },
  ],
};
*/





const pie = computed(() => store.piePreventivos);

//const conductores = ref<any[]>([]);


//const placas = computed(() => store.tablaVehiculos);

//const tablaVehiculos = computed(() => store.tablaVehiculos ?? []);


const pageSettings = ref({
  pageSize: 10,
  pageSizes: [5, 10, 20, 50],
  currentPage: 1
});

// Estados para ordenamiento
const sortKey = ref<'placa' | 'totalAlistamientos' | 'preventivosTotal' | 'correctivosTotal' | 'alistamientosCriticos'>('placa');
const sortOrder = ref<'asc' | 'desc'>('asc');

// Función para cambiar orden al hacer click
const setSort = (key: typeof sortKey.value) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
};

// Computed con datos ordenados
const sortedVehiculos = computed(() => {
  const data = [...(store.tablaVehiculos ?? [])];
  
  return data.sort((a, b) => {
    let valA = a[sortKey.value];
    let valB = b[sortKey.value];
    
    // Manejo especial para strings (placa)
    if (sortKey.value === 'placa') {
      valA = String(valA).toUpperCase();
      valB = String(valB).toUpperCase();
    }
    
    if (sortOrder.value === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });
});

// Paginación usa sortedVehiculos en lugar de tablaVehiculos
const totalPages = computed(() =>
  Math.ceil(sortedVehiculos.value.length / ROWS_PER_PAGE)
);

const paginatedVehiculos = computed(() => {
  const start = (currentPage.value - 1) * ROWS_PER_PAGE;
  return sortedVehiculos.value.slice(start, start + ROWS_PER_PAGE);
});

</script>


<style scoped>
.dashboard{padding:24px;display:flex;flex-direction:column;gap:24px;background:#f1f5f9}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.kpi{background:#fff;padding:18px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.06)}
.kpi.alert{border-left:6px solid #f87171}
.kpi.ok{border-left:6px solid #34d399}
.row{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.card{background:white;padding:16px;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.06)}

.filters{
  display:flex;
  gap:12px;
}

.row{
  display:grid;
  grid-template-columns: 2fr 1fr; /* mensual ancho, pie angosto */
  gap:18px
}

.card.wide{grid-column: span 1;}
.card.small{grid-column: span 1;}

.card{
  background:white;
  padding:10px;
  border-radius:16px;
  box-shadow:0 6px 18px rgba(0,0,0,.06);
  height:260px;
}


.filters-bar{
  display:flex;
  gap:.6rem;
}

.filter-btn{
  border:1px solid #e5e7eb;
  background:white;
  padding:.45rem .9rem;
  border-radius:999px;
  font-weight:600;
  cursor:pointer;
  transition:.2s;
}

.filter-btn:hover{
  background:#eff6ff;
  border-color:#93c5fd;
}

.filter-btn.active{
  background:#2563eb;
  color:white;
  border-color:#2563eb;
}

.kpi-card{
  padding: .7rem 1rem;
}

.kpi-value{
  font-size: 1.6rem;
}

.kpi{
  background:#fff;
  height:80px;
  border-radius:14px;
  box-shadow:0 6px 18px rgba(0,0,0,.06);
  display:flex;
  flex-direction:column;
  justify-content:center;
  align-items:center;
  text-align:center;
}

.kpi h2{
  margin:0;
  font-size:1.4rem;
}

.month-select{
  border:1px solid #e5e7eb;
  border-radius:999px;
  padding:.45rem .9rem;
  font-weight:600;
  cursor:pointer;
}

.crit-table{
  width:100%;
  border-collapse:collapse;
  margin-top:12px;
}

.crit-table th,
.crit-table td{
  padding:10px;
  border-bottom:1px solid #e5e7eb;
  text-align:left;
}

.crit-table th{
  font-weight:700;
  background:#f8fafc;
}

.veh-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}

.veh-table th,
.veh-table td {
  padding: 10px;
  border-bottom: 1px solid #e5e7eb;
  text-align: center;
}

.veh-table th {
  background: #f8fafc;
  font-weight: 700;
}

.badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: #e5e7eb;
  font-weight: 600;
}

.badge.danger {
  background: #fee2e2;
  color: #b91c1c;
}

.empty {
  padding: 20px;
  text-align: center;
  color: #6b7280;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}

.pagination button {
  border: 1px solid #e5e7eb;
  background: white;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.card.wide_table {
  height: 300px;       /* ajusta a gusto: 480–600 */
}

</style>
