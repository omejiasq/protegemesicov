// src/stores/authStore.ts
import { defineStore } from 'pinia';
import { AuthserviceApi } from '../api/auth.service';
import {http} from '../api/http';

type User = {
  _id: string;
  usuario: string;
  nombre: string;
  apellido?: string | null;
  telefono?: string | null;
  correo: string;
};

type Role = {
  _id?: string;
  nombre: string;
  modulos: any[];
};

type LoginPayload = {
  usuario?: string;  // o correo, según tu backend
  password: string;
};

type LoginResponse = {
  usuario: User;
  token: string;
  rol?: Role;
  enterprise_id?: string;
};

type RegisterResponse = {
  usuario?: any;
  token?: string | null;
  enterprise_id?: string;
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
};

type AuthSnapshot = {
  user: User | null;
  token: string | null;
  rol: Role | null;
  enterprise_id: string | null;
};

const AUTH_KEY = 'auth';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: null as string | null,
    role: null as Role | null,
    enterpriseId: null as string | null,
    loading: false,
    error: '' as string,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (s) => Boolean(s.token),
    profileName: (s) => s.user?.nombre || s.user?.usuario || 'Usuario',
  },

  actions: {
    /** Carga la sesión desde localStorage y configura Axios */
    hydrate() {
      try {
        // Compat: si venías usando claves sueltas
        const legacyToken = localStorage.getItem('access_token') || '';
        const legacyEnterprise = localStorage.getItem('enterprise_id') || '';

        const raw = localStorage.getItem(AUTH_KEY);
        const parsed: AuthSnapshot | null = raw ? JSON.parse(raw) : null;

        this.user = parsed?.user ?? null;
        this.token = parsed?.token ?? (legacyToken || null);
        this.role = parsed?.rol ?? null;
        this.enterpriseId = parsed?.enterprise_id ?? (legacyEnterprise || null);
        this.error = '';

        // Configurar headers globales si hay token
        if (this.token) {
          http.defaults.headers.common.Authorization = `Bearer ${this.token}`;
        }
        if (this.enterpriseId) {
          (http.defaults.headers.common as any)['x-enterprise-id'] = this.enterpriseId;
        }
      } catch {
        this.user = null;
        this.token = null;
        this.role = null;
        this.enterpriseId = null;
      } finally {
        this.initialized = true;
      }
    },

    /** Persiste la sesión completa en localStorage y configura Axios */
    persistSession() {
      const snapshot: AuthSnapshot = {
        user: this.user,
        token: this.token,
        rol: this.role,
        enterprise_id: this.enterpriseId,
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(snapshot));

      if (this.token) {
        http.defaults.headers.common.Authorization = `Bearer ${this.token}`;
      } else {
        delete http.defaults.headers.common.Authorization;
      }

      if (this.enterpriseId) {
        (http.defaults.headers.common as any)['x-enterprise-id'] = this.enterpriseId;
      } else {
        delete (http.defaults.headers.common as any)['x-enterprise-id'];
      }
    },

    async login(payload: LoginPayload) {
      this.loading = true;
      this.error = '';
      try {
        const { data } = (await AuthserviceApi.login(payload)) as { data: LoginResponse };

        if (!data?.token) throw new Error('No se recibió token');

        this.user = data.usuario;
        this.token = data.token;
        this.role = data.rol ?? null;
        this.enterpriseId = data.enterprise_id ?? null;

        this.persistSession();
        return data;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'Error de autenticación';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async register(payload: any) {
      this.loading = true;
      this.error = '';
      try {
        const { data } = (await AuthserviceApi.register(payload)) as { data: RegisterResponse };
        return data;
      } catch (e: any) {
        this.error = e?.response?.data?.message || e?.message || 'Error al registrar';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /** Cambia de empresa y actualiza header */
    selectEnterprise(id: string) {
      this.enterpriseId = id;
      this.persistSession();
    },

    logout() {
      this.user = null;
      this.token = null;
      this.role = null;
      this.enterpriseId = null;
      this.error = '';
      localStorage.removeItem(AUTH_KEY);
      // limpiar headers globales
      delete http.defaults.headers.common.Authorization;
      delete (http.defaults.headers.common as any)['x-enterprise-id'];
      // (Compat) limpiar claves viejas si existían
      localStorage.removeItem('access_token');
      localStorage.removeItem('enterprise_id');
    },
  },
});
