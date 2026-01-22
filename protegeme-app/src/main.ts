import { createApp } from 'vue';
import App from './App.vue';

import { createPinia } from 'pinia';
import router from './router';

import { useAuthStore } from './stores/authStore';

import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import 'primeicons/primeicons.css';

import './style.css'

// Syncfusion base
import { registerLicense, enableRipple } from "@syncfusion/ej2-base";

// Plugins Syncfusion
import { PivotViewPlugin } from "@syncfusion/ej2-vue-pivotview";
//import { ChartPlugin } from "@syncfusion/ej2-vue-charts";
import { ChartPlugin, CircularChart3DPlugin } from "@syncfusion/ej2-vue-charts"
import { SchedulePlugin } from "@syncfusion/ej2-vue-schedule";

//import { CircularChart3DPlugin } from "@syncfusion/ej2-vue-charts";

// CSS Syncfusion (MUY IMPORTANTE)
import "@syncfusion/ej2-material-theme/styles/material.css";

// Licencia
registerLicense(
  "Ngo9BigBOggjHTQxAR8/V1JGaF5cX2dCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdlWX5ccHVWQmRfWEBxV0tWYEs="
);


const app = createApp(App);
app.use(createPinia());
useAuthStore().hydrate()
app.use(router);

app.use(PivotViewPlugin);
app.use(ChartPlugin);
app.use(SchedulePlugin);
app.use(CircularChart3DPlugin);

app.use(PrimeVue, {
  theme: { preset: Aura, options: { darkModeSelector: undefined } },
  inputStyle: 'outlined',   // ← evita “filled” oscuro
  ripple: true
})
app.use(ToastService);
app.use(ConfirmationService);

app.mount('#app');