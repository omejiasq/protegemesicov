import { Injectable, HttpException, Logger } from '@nestjs/common';

@Injectable()
export class MaintenanceExternalApiService {
  private bearerToken: string | null = null;
  private readonly logger = new Logger(MaintenanceExternalApiService.name);

  /** Autenticación contra SICOV */
  private async login(): Promise<string> {
    if (this.bearerToken) return this.bearerToken;
    const base = process.env.SICOV_AUTH_BASE;
    if (!base) throw new Error('Falta variable SICOV_AUTH_BASE');
    const url = `${base}/api/v1/autenticacion/inicio-sesion`;
    const body = JSON.stringify({
      usuario: process.env.SICOV_USERNAME,
      contrasena: process.env.SICOV_PASSWORD,
    });
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!resp.ok) {
      this.logger.error(
        `Error autenticando: ${resp.status} ${resp.statusText}`,
      );
      throw new HttpException('No se pudo autenticar en SICOV', resp.status);
    }
    const data: any = await resp.json();
    this.bearerToken = data?.token;
    return this.bearerToken as string;
  }

  /** Construye encabezados */
  private buildHeaders(token: string, vigiladoId?: string) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      token: process.env.SICOV_TOKEN_VIGILADO as string,
      vigiladoId: vigiladoId || (process.env.SICOV_VIGILADO_ID as string),
    } as Record<string, string>;
  }

  /** Construye URL base del módulo de mantenimientos */
  private mantBase(path: string) {
    const base = process.env.SICOV_MANT_BASE;
    if (!base) throw new Error('Falta variable SICOV_MANT_BASE');
    return `${base}${path}`;
  }

  private async requestOnce(
    endpoint: string,
    method: string,
    body?: any,
    vigiladoId?: string,
  ) {
    const token = await this.login();
    const resp = await fetch(endpoint, {
      method,
      headers: this.buildHeaders(token, vigiladoId),
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await resp.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = text;
    }
    return { status: resp.status, ok: resp.ok, data };
  }

  /** Envía la solicitud con reintento si expira el token */
  private async request(
    endpoint: string,
    method: string,
    body?: any,
    vigiladoId?: string,
  ) {
    let res = await this.requestOnce(endpoint, method, body, vigiladoId);
    if (res.status === 401 || res.status === 403) {
      this.bearerToken = null;
      res = await this.requestOnce(endpoint, method, body, vigiladoId);
    }
    return res;
  }

  /** Lista las placas disponibles para mantenimiento */
  async listarPlacas(query: { tipoId: number; vigiladoId?: string }) {
    const params = new URLSearchParams();
    params.set('tipoId', String(query.tipoId));
    const endpoint = this.mantBase(
      `/api/v2/mantenimiento/listar-placas?${params.toString()}`,
    );
    return this.request(endpoint, 'GET', undefined, query.vigiladoId);
  }

  /** Registra un mantenimiento base y devuelve su ID */
  async guardarMantenimiento(payload: {
    placa: string;
    tipoId: number;
    vigiladoId?: string;
  }) {
    const endpoint = this.mantBase(
      '/api/v2/mantenimiento/guardar-mantenimieto',
    );
    return this.request(
      endpoint,
      'POST',
      {
        vigiladoId: payload.vigiladoId || process.env.SICOV_VIGILADO_ID,
        placa: payload.placa,
        tipoId: payload.tipoId,
      },
      payload.vigiladoId,
    );
  }

  /** Registra el mantenimiento preventivo detallado */
  async guardarPreventivo(payload: {
    fecha: string;
    hora: string;
    nit: number | string;
    razonSocial: string;
    tipoIdentificacion: number;
    numeroIdentificacion: number | string;
    nombresResponsable: string;
    mantenimientoId: number | string;
    detalleActividades: string;
    vigiladoId?: string;
  }) {
    const endpoint = this.mantBase('/api/v2/mantenimiento/guardar-preventivo');
    return this.request(
      endpoint,
      'POST',
      {
        fecha: payload.fecha,
        hora: payload.hora,
        nit: payload.nit,
        razonSocial: payload.razonSocial,
        tipoIdentificacion: payload.tipoIdentificacion,
        numeroIdentificacion: payload.numeroIdentificacion,
        nombresResponsable: payload.nombresResponsable,
        mantenimientoId: payload.mantenimientoId,
        detalleActividades: payload.detalleActividades,
      },
      payload.vigiladoId,
    );
  }

  /** Visualiza el mantenimiento preventivo */
  async visualizarPreventivo(
    mantenimientoId: number | string,
    vigiladoId?: string,
  ) {
    const endpoint = this.mantBase(
      '/api/v2/mantenimiento/visualizar-preventivo',
    );
    return this.request(endpoint, 'POST', { mantenimientoId }, vigiladoId);
  }

  /** Registra el mantenimiento correctivo */
  async guardarCorrectivo(payload: {
    fecha: string;
    hora: string;
    nit: number | string;
    razonSocial: string;
    tipoIdentificacion: number;
    numeroIdentificacion: number | string;
    nombresResponsable: string;
    mantenimientoId: number | string;
    descripcionFalla: string
    detalleActividades: string;
    accionesRealizadas: string
    vigiladoId?: string;
  }) {
    const endpoint = this.mantBase('/api/v2/mantenimiento/guardar-correctivo');
    return this.request(
      endpoint,
      'POST',
      {
        fecha: payload.fecha,
        hora: payload.hora,
        nit: payload.nit,
        razonSocial: payload.razonSocial,
        tipoIdentificacion: payload.tipoIdentificacion,
        numeroIdentificacion: payload.numeroIdentificacion,
        nombresResponsable: payload.nombresResponsable,
        mantenimientoId: payload.mantenimientoId,
        detalleActividades: payload.detalleActividades,
      },
      payload.vigiladoId,
    );
  }

  /** Visualiza el mantenimiento correctivo */
  async visualizarCorrectivo(
    mantenimientoId: number | string,
    vigiladoId?: string,
  ) {
    const endpoint = this.mantBase(
      '/api/v2/mantenimiento/visualizar-correctivo',
    );
    return this.request(endpoint, 'POST', { mantenimientoId }, vigiladoId);
  }

  async guardarAlistamiento(payload: {
    tipoIdentificacionResponsable: number;
    numeroIdentificacionResponsable: number | string;
    nombreResponsable: string;
    tipoIdentificacionConductor: number;
    numeroIdentificacionConductor: number | string;
    nombresConductor: string;
    mantenimientoId: number | string;
    detalleActividades: string;
    actividades: { codigo: string; valor: boolean }[];
    vigiladoId?: string;
  }) {
    const endpoint = this.mantBase('/api/v2/mantenimiento/guardar-alistamiento');
    return this.request(endpoint, 'POST', {
      tipoIdentificacionResponsable: payload.tipoIdentificacionResponsable,
      numeroIdentificacionResponsable: payload.numeroIdentificacionResponsable,
      nombreResponsable: payload.nombreResponsable,
      tipoIdentificacionConductor: payload.tipoIdentificacionConductor,
      numeroIdentificacionConductor: payload.numeroIdentificacionConductor,
      nombresConductor: payload.nombresConductor,
      mantenimientoId: payload.mantenimientoId,
      detalleActividades: payload.detalleActividades,
      actividades: payload.actividades,
    }, payload.vigiladoId);
  }

  /** Visualiza un alistamiento existente */
  async visualizarAlistamiento(mantenimientoId: number | string, vigiladoId?: string) {
    const endpoint = this.mantBase('/api/v2/mantenimiento/visualizar-alistamiento');
    return this.request(endpoint, 'POST', { mantenimientoId }, vigiladoId);
  }

  /** Lista las actividades de alistamiento */
  async listarActividades(vigiladoId?: string) {
    const endpoint = this.mantBase('/api/v2/mantenimiento/listar-actividades');
    return this.request(endpoint, 'GET', undefined, vigiladoId);
  }
}
