// src/terminales/terminales-external-api.ts
//
// Cliente para los endpoints de Terminales de la API Supertransporte.
// Base URL: variable de entorno SICOV_TERM_BASE  (ej: https://rutasback.supertransporte.gov.co)
// Auth: misma sesión que los demás módulos (SICOV_AUTH_BASE / SICOV_USERNAME / SICOV_PASSWORD)
//
import { Injectable, HttpException, Logger } from '@nestjs/common';
import { AuditService } from '../libs/audit/audit.service';

type AnyObj = Record<string, any>;
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type SafeResult = { ok: boolean; status: number; data: any; error?: string };

@Injectable()
export class TerminalesExternalApiService {
  private bearerToken: string | null = null;
  private readonly logger = new Logger(TerminalesExternalApiService.name);

  constructor(private readonly audit: AuditService) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private termBase(path: string): string {
    const base = process.env.SICOV_TERM_BASE;
    if (!base) throw new Error('Falta variable de entorno SICOV_TERM_BASE');
    return `${base}${path}`;
  }

  private async safeJson(resp: Response): Promise<any> {
    const text = await resp.text();
    try { return text ? JSON.parse(text) : undefined; } catch { return text; }
  }

  private redact<T extends AnyObj | undefined>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;
    const SENSITIVE = ['password', 'contrasena', 'token', 'bearer', 'authorization'];
    const clone: AnyObj = JSON.parse(JSON.stringify(obj));
    for (const k of Object.keys(clone)) {
      if (SENSITIVE.includes(k.toLowerCase())) clone[k] = '***redacted***';
    }
    return clone as T;
  }

  private async login(): Promise<string> {
    if (this.bearerToken) return this.bearerToken;

    const base = process.env.SICOV_AUTH_BASE;
    if (!base) throw new Error('Falta variable SICOV_AUTH_BASE');

    const url = `${base}/api/v1/autenticacion/inicio-sesion`;
    const started = Date.now();
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: process.env.SICOV_USERNAME,
        contrasena: process.env.SICOV_PASSWORD,
      }),
    });

    const data: any = await this.safeJson(resp);

    await this.audit.log({
      module: 'terminales',
      operation: 'login',
      endpoint: url,
      requestPayload: { usuario: process.env.SICOV_USERNAME, contrasena: '***redacted***' },
      responseStatus: resp.status,
      responseBody: data,
      success: resp.ok,
      durationMs: Date.now() - started,
    });

    if (!resp.ok) throw new HttpException('No se pudo autenticar en SICOV (terminales)', resp.status);

    const token =
      data?.token ?? data?.access_token ?? data?.data?.token ?? data?.data?.access_token;
    if (!token) throw new HttpException('Login OK pero sin token', 500);

    this.bearerToken = String(token);
    return this.bearerToken;
  }

  private buildHeaders(
    token: string,
    vigiladoId?: string,
    vigiladoToken?: string,
  ): Record<string, string> {
    const nit = (vigiladoId ?? process.env.SICOV_VIGILADO_ID ?? '').toString().replace(/\D+/g, '');
    const vToken = vigiladoToken ?? process.env.SICOV_TOKEN_VIGILADO ?? '';
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      token: vToken,
      vigiladoId: nit,
    };
  }

  private async request(
    endpoint: string,
    method: HttpMethod,
    operation: string,
    body?: AnyObj,
    vigiladoId?: string,
    vigiladoToken?: string,
  ) {
    const started = Date.now();
    const token = await this.login();

    let resp = await fetch(endpoint, {
      method,
      headers: this.buildHeaders(token, vigiladoId, vigiladoToken),
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = await this.safeJson(resp);

    await this.audit.log({
      module: 'terminales',
      operation,
      endpoint,
      requestPayload: this.redact(body),
      responseStatus: resp.status,
      responseBody: data,
      success: resp.ok,
      durationMs: Date.now() - started,
    });

    // Retry on auth expiry
    if (resp.status === 401 || resp.status === 403) {
      this.bearerToken = null;
      const retryToken = await this.login();
      resp = await fetch(endpoint, {
        method,
        headers: this.buildHeaders(retryToken, vigiladoId, vigiladoToken),
        body: body ? JSON.stringify(body) : undefined,
      });
      data = await this.safeJson(resp);
      await this.audit.log({
        module: 'terminales',
        operation: `${operation}:retry`,
        endpoint,
        requestPayload: this.redact(body),
        responseStatus: resp.status,
        responseBody: data,
        success: resp.ok,
        durationMs: 0,
      });
    }

    return { ok: resp.ok, status: resp.status, data } as SafeResult;
  }

  // Variante segura: no lanza excepción — devuelve { ok: false, error }
  private async requestSafe(
    endpoint: string,
    method: HttpMethod,
    operation: string,
    body?: AnyObj,
    vigiladoId?: string,
    vigiladoToken?: string,
  ): Promise<SafeResult> {
    try {
      return await this.request(endpoint, method, operation, body, vigiladoId, vigiladoToken);
    } catch (e: any) {
      await this.audit.log({
        module: 'terminales',
        operation: `${operation}:safe-error`,
        endpoint,
        requestPayload: this.redact(body),
        responseStatus: e?.status ?? 500,
        responseBody: { message: e?.message || 'error' },
        success: false,
        durationMs: 0,
      });
      return { ok: false, status: e?.status ?? 500, data: null, error: e?.message ?? String(e) };
    }
  }

  // ── Salidas / Despachos ───────────────────────────────────────────────────

  async crearSalida(
    payload: {
      idDespachoTerminal: string;
      terminalDespacho: string;
      nitEmpresaTransporte: string;
      razonSocial?: string;
      numeroPasajero?: number;
      valorTiquete?: number;
      valorTotalTasaUso?: number;
      valorPruebaAlcoholimetria?: number;
      observaciones?: string;
    },
    ctx: { vigiladoId?: string; vigiladoToken?: string },
  ) {
    return this.requestSafe(
      this.termBase('/api/despachos/'),
      'POST',
      'crearSalida',
      payload,
      ctx.vigiladoId,
      ctx.vigiladoToken,
    );
  }

  async listarSalidas(ctx: { vigiladoId?: string; vigiladoToken?: string }) {
    return this.requestSafe(
      this.termBase('/api/despachos/'),
      'GET',
      'listarSalidas',
      undefined,
      ctx.vigiladoId,
      ctx.vigiladoToken,
    );
  }

  // ── Llegadas ─────────────────────────────────────────────────────────────

  async crearLlegada(
    payload: {
      tipollegada_id: number;
      despacho_id: number;
      terminalllegada: string;
      numero_pasajero?: number;
      horallegada?: string;
      fechallegada?: string;
    },
    ctx: { vigiladoId?: string; vigiladoToken?: string },
  ) {
    return this.requestSafe(
      this.termBase('/api/llegada'),
      'POST',
      'crearLlegada',
      payload,
      ctx.vigiladoId,
      ctx.vigiladoToken,
    );
  }

  async crearLlegadaVehiculo(
    payload: { llegada_id: number } & Record<string, any>,
    ctx: { vigiladoId?: string; vigiladoToken?: string },
  ) {
    return this.requestSafe(
      this.termBase('/api/llegadavehiculo'),
      'POST',
      'crearLlegadaVehiculo',
      payload,
      ctx.vigiladoId,
      ctx.vigiladoToken,
    );
  }

  async crearLlegadaConductor(
    payload: { llegada_id: number } & Record<string, any>,
    ctx: { vigiladoId?: string; vigiladoToken?: string },
  ) {
    return this.requestSafe(
      this.termBase('/api/llegadaconductor'),
      'POST',
      'crearLlegadaConductor',
      payload,
      ctx.vigiladoId,
      ctx.vigiladoToken,
    );
  }

  // ── Novedades ─────────────────────────────────────────────────────────────

  async crearNovedad(
    payload: {
      id_despacho: number;
      tipo_novedad_id: number;
      descripcion?: string;
      otros?: string;
    },
    ctx: { vigiladoId?: string; vigiladoToken?: string },
  ) {
    return this.requestSafe(
      this.termBase('/api/novedades'),
      'POST',
      'crearNovedad',
      payload,
      ctx.vigiladoId,
      ctx.vigiladoToken,
    );
  }

  async crearNovedadVehiculo(
    payload: { idNovedad: number } & Record<string, any>,
    ctx: { vigiladoId?: string; vigiladoToken?: string },
  ) {
    return this.requestSafe(
      this.termBase('/api/novedadesvehiculo'),
      'POST',
      'crearNovedadVehiculo',
      payload,
      ctx.vigiladoId,
      ctx.vigiladoToken,
    );
  }

  async crearNovedadConductor(
    payload: { idNovedad: number } & Record<string, any>,
    ctx: { vigiladoId?: string; vigiladoToken?: string },
  ) {
    return this.requestSafe(
      this.termBase('/api/novedadesconductor'),
      'POST',
      'crearNovedadConductor',
      payload,
      ctx.vigiladoId,
      ctx.vigiladoToken,
    );
  }
}
