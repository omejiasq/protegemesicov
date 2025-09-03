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

const app = createApp(App);
app.use(createPinia());
useAuthStore().hydrate()
app.use(router);
app.use(PrimeVue, {
  theme: { preset: Aura, options: { darkModeSelector: undefined } },
  inputStyle: 'outlined',   // ← evita “filled” oscuro
  ripple: true
})
app.use(ToastService);
app.use(ConfirmationService);

app.mount('#app');