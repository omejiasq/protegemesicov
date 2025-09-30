// src/libs/external-api.ts
import { Injectable, HttpException, Logger } from '@nestjs/common';
import { AuditService } from './audit/audit.service';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type AnyObj = Record<string, any>;

@Injectable()
export class MaintenanceExternalApiService {
  private bearerToken: string | null = null;
  private readonly logger = new Logger(MaintenanceExternalApiService.name);

  constructor(private readonly audit: AuditService) {
    console.log('MaintenanceExternalApiService initialized');
  }

  async __smokeAuditOnce() {
  await this.audit.log({
    module: 'maintenance',
    operation: '__smoke',
    endpoint: 'local://smoke',
    responseStatus: 200,
    success: true,
    responseBody: { hello: 'world' },
  });
}

  private async safeJson(resp: Response) {
    const text = await resp.text();
    try { return text ? JSON.parse(text) : undefined; } catch { return text; }
  }

  private redact<T extends AnyObj | undefined>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;
    const SENSITIVE = ['password', 'contrasena', 'authorization', 'token', 'bearer'];
    const clone: AnyObj = JSON.parse(JSON.stringify(obj));
    for (const k of Object.keys(clone)) {
      if (SENSITIVE.includes(k.toLowerCase())) clone[k] = '***redacted***';
    }
    return clone as T;
  }

  /** Base de Mantenimientos */
  private mantBase(path: string) {
    const base = process.env.SICOV_MANT_BASE;
    if (!base) throw new Error('Falta variable SICOV_MANT_BASE');
    return `${base}${path}`;
  }

  /** Login robusto: soporta varias formas de token */
  private async login(): Promise<string> {
    if (this.bearerToken) return this.bearerToken;

    const base = process.env.SICOV_AUTH_BASE;
    if (!base) throw new Error('Falta variable SICOV_AUTH_BASE');

    const url = `${base}/api/v1/autenticacion/inicio-sesion`;
    const body = {
      usuario: process.env.SICOV_USERNAME,
      contrasena: process.env.SICOV_PASSWORD,
    };

    const started = Date.now();
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data: any = await this.safeJson(resp);

    // Auditar el login (sin exponer contraseña)
    await this.audit.log({
      module: 'maintenance',
      operation: 'login',
      endpoint: url,
      requestPayload: { usuario: process.env.SICOV_USERNAME, contrasena: '***redacted***' },
      responseStatus: resp.status,
      responseBody: data,
      success: resp.ok,
      durationMs: Date.now() - started,
    });

    if (!resp.ok) {
      this.logger.error(`Error autenticando: ${resp.status} ${resp.statusText}`);
      throw new HttpException('No se pudo autenticar en SICOV', resp.status);
    }

    const candidate =
      data?.token ??
      data?.access_token ??
      data?.data?.token ??
      data?.data?.access_token ??
      data?.result?.token;

    if (!candidate) {
      throw new HttpException('Login OK pero sin token en respuesta', 500);
    }

    this.bearerToken = String(candidate);
    return this.bearerToken;
  }

  /** Construye headers incluyendo variantes comunes; normaliza documento */
private buildHeaders(token: string, vigiladoId?: string) {
  if (!token || token === 'undefined') {
    throw new HttpException('Token Bearer no inicializado', 500);
  }

  const tokenVigilado = process.env.SICOV_TOKEN_VIGILADO ?? '';
  if (!tokenVigilado) this.logger.warn('SICOV_TOKEN_VIGILADO vacío');

  const rawDoc =
    (vigiladoId ?? process.env.SICOV_VIGILADO_ID ?? '').toString();
  const documento = rawDoc.replace(/[.\- ]/g, ''); // normaliza “12.345.678” -> “12345678”
  if (!documento) this.logger.warn('Documento de vigilado vacío (ni param ni env)');

  // Headers que el proveedor te pidió expresamente:
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    token: tokenVigilado,
    documento, // 👈 SIEMPRE va en cada petición
  } as Record<string, string>;
}

  /** Core de request con auditoría y re-intento si expira el token */
  private async requestWithAudit(
    endpoint: string,
    method: HttpMethod,
    operation: string,
    body?: AnyObj,
    vigiladoId?: string,
  ) {
    const started = Date.now();
    const token = await this.login();

    const resp = await fetch(endpoint, {
      method,
      headers: this.buildHeaders(token, vigiladoId),
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await this.safeJson(resp);

    await this.audit.log({
      module: 'maintenance',
      operation,
      endpoint,
      requestPayload: this.redact(body),
      responseStatus: resp.status,
      responseBody: data,
      success: resp.ok,
      durationMs: Date.now() - started,
    });

    // Reintento si 401/403 (token vencido)
    if (resp.status === 401 || resp.status === 403) {
      this.bearerToken = null; // forzar nuevo login
      const retryStarted = Date.now();
      const retryToken = await this.login();

      const retry = await fetch(endpoint, {
        method,
        headers: this.buildHeaders(retryToken, vigiladoId),
        body: body ? JSON.stringify(body) : undefined,
      });
      const retryData = await this.safeJson(retry);

      await this.audit.log({
        module: 'maintenance',
        operation: `${operation}:retry`,
        endpoint,
        requestPayload: this.redact(body),
        responseStatus: retry.status,
        responseBody: retryData,
        success: retry.ok,
        durationMs: Date.now() - retryStarted,
      });

      if (!retry.ok) throw new HttpException('Error en SICOV', retry.status);
      return { ok: true, status: retry.status, data: retryData };
    }

    if (!resp.ok) throw new HttpException('Error en SICOV', resp.status);
    return { ok: true, status: resp.status, data };
  }

  /** -------------------------
   *  Endpoints Mantenimiento
   *  ------------------------- */

  /** Lista las placas disponibles para mantenimiento */
  async listarPlacas(query: { tipoId: number; vigiladoId?: string }) {
    const params = new URLSearchParams();
    params.set('tipoId', String(query.tipoId));
    const endpoint = this.mantBase(`/api/v2/mantenimiento/listar-placas?${params.toString()}`);
    return this.requestWithAudit(endpoint, 'GET', 'listarPlacas', undefined, query.vigiladoId);
  }

  /** Registra un mantenimiento base y devuelve su ID */
  async guardarMantenimiento(payload: {
    placa: string;
    tipoId: number;
    vigiladoId?: string;
  }) {
    const endpoint = this.mantBase('/api/v2/mantenimiento/guardar-mantenimieto');
    const body = {
      vigiladoId: payload.vigiladoId || process.env.SICOV_VIGILADO_ID,
      placa: payload.placa,
      tipoId: payload.tipoId,
    };
    return this.requestWithAudit(endpoint, 'POST', 'guardarMantenimiento', body, payload.vigiladoId);
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
    const body = {
      fecha: payload.fecha,
      hora: payload.hora,
      nit: payload.nit,
      razonSocial: payload.razonSocial,
      tipoIdentificacion: payload.tipoIdentificacion,
      numeroIdentificacion: payload.numeroIdentificacion,
      nombresResponsable: payload.nombresResponsable,
      mantenimientoId: payload.mantenimientoId,
      detalleActividades: payload.detalleActividades,
      documento_vigilado: (payload.vigiladoId || process.env.SICOV_VIGILADO_ID || '').toString().replace(/[.\- ]/g, ''),
    };
    return this.requestWithAudit(endpoint, 'POST', 'guardarPreventivo', body, payload.vigiladoId);
  }

  /** Visualiza el mantenimiento preventivo */
  async visualizarPreventivo(mantenimientoId: number | string, vigiladoId?: string) {
    const endpoint = this.mantBase('/api/v2/mantenimiento/visualizar-preventivo');
    const body = { mantenimientoId };
    return this.requestWithAudit(endpoint, 'POST', 'visualizarPreventivo', body, vigiladoId);
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
    descripcionFalla: string;
    detalleActividades: string;
    accionesRealizadas: string;
    vigiladoId?: string;
  }) {
    const endpoint = this.mantBase('/api/v2/mantenimiento/guardar-correctivo');
    const body = {
      fecha: payload.fecha,
      hora: payload.hora,
      nit: payload.nit,
      razonSocial: payload.razonSocial,
      tipoIdentificacion: payload.tipoIdentificacion,
      numeroIdentificacion: payload.numeroIdentificacion,
      nombresResponsable: payload.nombresResponsable,
      mantenimientoId: payload.mantenimientoId,
      descripcionFalla: payload.descripcionFalla,
      detalleActividades: payload.detalleActividades,
      accionesRealizadas: payload.accionesRealizadas,
      documento_vigilado: (payload.vigiladoId || process.env.SICOV_VIGILADO_ID || '').toString().replace(/[.\- ]/g, ''),
    };
    return this.requestWithAudit(endpoint, 'POST', 'guardarCorrectivo', body, payload.vigiladoId);
  }

  /** Visualiza el mantenimiento correctivo */
  async visualizarCorrectivo(mantenimientoId: number | string, vigiladoId?: string) {
    const endpoint = this.mantBase('/api/v2/mantenimiento/visualizar-correctivo');
    const body = { mantenimientoId };
    return this.requestWithAudit(endpoint, 'POST', 'visualizarCorrectivo', body, vigiladoId);
  }

  /** Registra un alistamiento */
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
    const body = {
      tipoIdentificacionResponsable: payload.tipoIdentificacionResponsable,
      numeroIdentificacionResponsable: payload.numeroIdentificacionResponsable,
      nombreResponsable: payload.nombreResponsable,
      tipoIdentificacionConductor: payload.tipoIdentificacionConductor,
      numeroIdentificacionConductor: payload.numeroIdentificacionConductor,
      nombresConductor: payload.nombresConductor,
      mantenimientoId: payload.mantenimientoId,
      detalleActividades: payload.detalleActividades,
      actividades: payload.actividades,
      documento_vigilado: (payload.vigiladoId || process.env.SICOV_VIGILADO_ID || '').toString().replace(/[.\- ]/g, ''),
    };
    return this.requestWithAudit(endpoint, 'POST', 'guardarAlistamiento', body, payload.vigiladoId);
  }

  /** Visualiza un alistamiento existente */
  async visualizarAlistamiento(mantenimientoId: number | string, vigiladoId?: string) {
    const endpoint = this.mantBase('/api/v2/mantenimiento/visualizar-alistamiento');
    const body = { mantenimientoId };
    return this.requestWithAudit(endpoint, 'POST', 'visualizarAlistamiento', body, vigiladoId);
  }

  /** Lista las actividades de alistamiento */
  async listarActividades(vigiladoId?: string) {
    const endpoint = this.mantBase('/api/v2/mantenimiento/listar-actividades');
    return this.requestWithAudit(endpoint, 'GET', 'listarActividades', undefined, vigiladoId);
  }
}
