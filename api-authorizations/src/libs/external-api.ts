import { Injectable, HttpException, Logger } from '@nestjs/common';
import { AuditService } from '../libs/audit/audit.service';

type AnyObj = Record<string, any>;
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Ctx = {
  userId?: string;
  enterpriseId?: string;
  operation?: string;
  vigiladoId?: string; // << nuevo
  vigiladoToken?: string; // << nuevo
};

@Injectable()
export class ExternalApiService {
  private bearerToken: string | null = null;
  private readonly logger = new Logger(ExternalApiService.name);

  constructor(private readonly audit: AuditService) {}

  /* ---------- Infra COMÚN (idéntica a maintenance) ---------- */

  private async safeJson(resp: Response) {
    const txt = await resp.text();
    try {
      return txt ? JSON.parse(txt) : undefined;
    } catch {
      return txt;
    }
  }

  private redact<T extends AnyObj | undefined>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj as T;
    const S = ['password', 'contrasena', 'authorization', 'token', 'bearer'];
    const c: AnyObj = JSON.parse(JSON.stringify(obj));
    for (const k of Object.keys(c))
      if (S.includes(k.toLowerCase())) c[k] = '***redacted***';
    return c as T;
  }

  private mantBase(path: string) {
    const base = process.env.SICOV_MANT_BASE;
    if (!base) throw new Error('Falta env SICOV_MANT_BASE');
    return `${base}${path}`;
  }

  /** Login robusto (mismo criterio que maintenance) */
  private async login(): Promise<string> {
    if (this.bearerToken) return this.bearerToken;

    const base = process.env.SICOV_AUTH_BASE;
    if (!base) throw new Error('Falta env SICOV_AUTH_BASE');

    // usa v1 (más estable); si tu entorno exige v2, cambia aquí la ruta
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
    const data = await this.safeJson(resp);

    await this.audit.log({
      module: 'authorizations',
      operation: 'login',
      endpoint: url,
      requestPayload: {
        usuario: process.env.SICOV_USERNAME,
        contrasena: '***redacted***',
      },
      responseStatus: resp.status,
      responseBody: data,
      success: resp.ok,
      durationMs: Date.now() - started,
    });

    if (!resp.ok)
      throw new HttpException('No se pudo autenticar en SICOV', resp.status);

    const token =
      data?.token ??
      data?.access_token ??
      data?.data?.token ??
      data?.data?.access_token ??
      data?.result?.token;

    if (!token) throw new HttpException('Login OK pero sin token', 500);

    this.bearerToken = String(token);
    return this.bearerToken!;
  }

  private buildHeaders(
    token: string,
    vigiladoId?: string,
    vigiladoToken?: string,
  ) {
    const nit = (vigiladoId ?? process.env.SICOV_VIGILADO_ID ?? '')
      .toString()
      .replace(/\D+/g, '');
    const vToken = vigiladoToken ?? process.env.SICOV_TOKEN_VIGILADO ?? '';
    if (!nit) this.logger.warn('vigiladoId vacío (JWT/env)');
    if (!vToken) this.logger.warn('vigiladoToken vacío (JWT/env)');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      token: vToken,
      vigiladoId: nit,
    } as Record<string, string>;
  }

  private async requestWithAudit(
    endpoint: string,
    method: HttpMethod,
    operation: string,
    body?: AnyObj,
    vigiladoId?: string,
    vigiladoToken?: string,
  ) {
    const started = Date.now();
    const token = await this.login();

    const resp = await fetch(endpoint, {
      method,
      headers: this.buildHeaders(token, vigiladoId, vigiladoToken),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await this.safeJson(resp);

    await this.audit.log({
      module: 'authorizations',
      operation,
      endpoint,
      requestPayload: this.redact(body),
      responseStatus: resp.status,
      responseBody: data,
      success: resp.ok,
      durationMs: Date.now() - started,
    });

    // retry si 401/403 (igual que maintenance)
    if (resp.status === 401 || resp.status === 403) {
      this.bearerToken = null;
      const retryToken = await this.login();
      const retry = await fetch(endpoint, {
        method,
        headers: this.buildHeaders(retryToken, vigiladoId, vigiladoToken),
        body: body ? JSON.stringify(body) : undefined,
      });
      const retryData = await this.safeJson(retry);

      await this.audit.log({
        module: 'authorizations',
        operation: `${operation}:retry`,
        endpoint,
        requestPayload: this.redact(body),
        responseStatus: retry.status,
        responseBody: retryData,
        success: retry.ok,
        durationMs: 0,
      });

      if (!retry.ok) throw new HttpException('Error en SICOV', retry.status);
      return { ok: true, status: retry.status, data: retryData };
    }

    if (!resp.ok) throw new HttpException('Error en SICOV', resp.status);
    return { ok: true, status: resp.status, data };
  }

  private async requestWithAuditSafe(
    endpoint: string,
    method: HttpMethod,
    operation: string,
    body?: AnyObj,
    vigiladoId?: string,
    vigiladoToken?: string,
  ) {
    try {
      return await this.requestWithAudit(
        endpoint,
        method,
        operation,
        body,
        vigiladoId,
        vigiladoToken,
      );
    } catch (e: any) {
      await this.audit.log({
        module: 'authorizations',
        operation: `${operation}:safe-error`,
        endpoint,
        requestPayload: this.redact(body),
        responseStatus: e?.status ?? 500,
        responseBody: e?.response?.data ??
          e?.data ?? { message: e?.message || 'safe error' },
        success: false,
        durationMs: 0,
      });
      return {
        ok: false,
        status: e?.status ?? 500,
        error: e?.message ?? String(e),
      };
    }
  }

  /* ---------- SOLO cambian los endpoints/cuerpos ---------- */

  // 1) Mantenimiento base tipo 4 (autorizaciones)
  async guardarMantenimientoBase(params: {
    placa: string;
    vigiladoId?: string;
    vigiladoToken?: string;
  }) {
    const endpoint = this.mantBase(
      '/api/v2/mantenimiento/guardar-mantenimieto',
    );
    const body = {
      vigiladoId: params.vigiladoId,
      placa: params.placa,
      tipoId: 4,
    };
    return this.requestWithAuditSafe(
      endpoint,
      'POST',
      'guardarMantenimientoBase',
      body,
      params.vigiladoId,
      params.vigiladoToken,
    );
  }

  // 2) Guardar autorización
  async guardarAutorizacion(params: {
    mantenimientoId: number | string;
    item: Record<string, any>; // mapea tu DTO aquí (fechas, NNA, otorgante, autorizados, archivos…)
    vigiladoId?: string;
    vigiladoToken?: string;
  }) {
    const endpoint = this.mantBase(
      '/api/v2/mantenimiento/guardar-autorizacion',
    );
    const body = {
      mantenimientoId: Number(params.mantenimientoId),
      ...params.item,
    };
    return this.requestWithAuditSafe(
      endpoint,
      'POST',
      'guardarAutorizacion',
      body,
      params.vigiladoId,
      params.vigiladoToken,
    );
  }

  // 3) Visualizar autorización
  async visualizarAutorizacion(params: {
    mantenimientoId: number | string;
    vigiladoId?: string;
  }) {
    const endpoint = this.mantBase(
      '/api/v2/mantenimiento/visualizar-autorizacion',
    );
    const body = { mantenimientoId: Number(params.mantenimientoId) };
    return this.requestWithAudit(
      endpoint,
      'POST',
      'visualizarAutorizacion',
      body,
      params.vigiladoId,
    );
  }
}
