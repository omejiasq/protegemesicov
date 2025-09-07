import { Injectable, HttpException, Logger } from '@nestjs/common';
import fetch, { RequestInit } from 'node-fetch';
import { AuditService } from '../libs/audit/audit.service'; // ajusta path si tu libs están en otra carpeta

type AnyObj = Record<string, any>;
type Ctx = { userId?: string; enterpriseId?: string; operation?: string };

function redact<T extends AnyObj | undefined>(obj: T): T {
  if (!obj) return obj as T;
  const SENSITIVE = ['password', 'contrasena', 'authorization', 'token', 'bearer'];
  const clone: AnyObj = JSON.parse(JSON.stringify(obj));
  for (const k of Object.keys(clone)) {
    if (SENSITIVE.includes(k.toLowerCase())) clone[k] = '***redacted***';
  }
  return clone as T;
}

export type ApiResult<T> = { status: number; ok: boolean; data: T };

@Injectable()
export class ExternalApiService {
  private bearerToken: string | null = null;
  private readonly logger = new Logger(ExternalApiService.name);

  constructor(private readonly audit: AuditService) {}

  /* ========== Infra común (igual que incidents) ========== */

  private mantBase(path: string) {
    const base = process.env.SICOV_MANT_BASE; // ej: https://rutasback.supertransporte.gov.co
    if (!base) throw new Error('Falta env SICOV_MANT_BASE');
    return `${base}${path}`;
  }

  private buildHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      token: process.env.SICOV_TOKEN_VIGILADO as string,
      vigiladoId: process.env.SICOV_VIGILADO_ID as string,
    };
  }

  private async requestWithAudit<T>(
    url: string,
    init: RequestInit,
    ctx: Ctx & { module?: string } = {},
  ): Promise<ApiResult<T>> {
    const started = Date.now();
    let status = 0;
    let ok = false;
    let data: any = undefined;
    let errorMessage: string | undefined;

    try {
      const resp = await fetch(url, init);
      status = resp.status;
      ok = resp.ok;
      const txt = await resp.text();
      try { data = txt ? JSON.parse(txt) : undefined; } catch { data = txt; }
      return { status, ok, data };
    } catch (err: any) {
      errorMessage = err?.message ?? String(err);
      throw err;
    } finally {
      // Body para auditar (si viene como string)
      let reqPayload: any = undefined;
      try {
        const b = (init as any)?.body;
        reqPayload = typeof b === 'string' ? JSON.parse(b) : b;
      } catch { /* ignore */ }

      try {
        await this.audit.log({
          module: ctx.module ?? 'authorizations',
          operation: ctx.operation ?? (init.method ? `${init.method} ${url}` : url),
          endpoint: url,
          requestPayload: redact(reqPayload),
          responseStatus: status || 0,
          responseBody: data,
          success: !!ok,
          durationMs: Date.now() - started,
          userId: ctx.userId,
          enterpriseId: ctx.enterpriseId,
          errorMessage,
        });
      } catch {
        // nunca bloquear por auditoría
      }
    }
  }

  private async login(ctx?: Ctx): Promise<string> {
    if (this.bearerToken) return this.bearerToken;

    // ⚠️ Igual que incidents: usamos v1 (audita aunque falle)
    const url = `${process.env.SICOV_AUTH_BASE}/api/v2/autenticacion/inicio-sesion`;
    const body = {
      usuario: process.env.SICOV_USERNAME,
      contrasena: process.env.SICOV_PASSWORD,
    };

    const res = await this.requestWithAudit<any>(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      { ...ctx, module: 'authorizations', operation: 'login' },
    );

    if (!res.ok) {
      this.logger.error(`Error autenticando en SICOV: ${res.status}`);
      throw new HttpException('No se pudo autenticar', res.status);
    }

    const token = res.data?.token as string | undefined;
    if (!token) {
      this.logger.error(`Login sin token en respuesta`);
      throw new HttpException('Token no recibido', 500);
    }

    this.bearerToken = token;
    return this.bearerToken!;
  }

  /* ========== Endpoints AUTORIZACIONES ========== */

  // POST /api/v2/mantenimiento/guardar-mantenimieto (tipoId=4)
  async guardarMantenimientoBase(
    placa: string,
    ctx?: Ctx,
  ): Promise<ApiResult<any>> {
    const token = await this.login(ctx);
    const endpoint = this.mantBase('/api/v2/mantenimiento/guardar-mantenimieto'); // deja igual si tu back lo exige
    const body = {
      vigiladoId: process.env.SICOV_VIGILADO_ID,
      placa,
      tipoId: 4, // 4 = Autorizaciones
    };

    return this.requestWithAudit<any>(
      endpoint,
      { method: 'POST', headers: this.buildHeaders(token), body: JSON.stringify(body) },
      { ...ctx, module: 'authorizations', operation: 'guardarMantenimientoBase' },
    );
  }

  // POST /api/v2/mantenimiento/guardar-autorizacion
  async guardarAutorizacion(
    mantenimientoId: number,
    item: Record<string, any>,
    ctx?: Ctx,
  ): Promise<ApiResult<any>> {
    const token = await this.login(ctx);
    const endpoint = this.mantBase('/api/v2/mantenimiento/guardar-autorizacion');
    const body = { mantenimientoId, ...item };

    return this.requestWithAudit<any>(
      endpoint,
      { method: 'POST', headers: this.buildHeaders(token), body: JSON.stringify(body) },
      { ...ctx, module: 'authorizations', operation: 'guardarAutorizacion' },
    );
  }

  // POST /api/v2/mantenimiento/visualizar-autorizacion
  async visualizarAutorizacion(mantenimientoId: number, ctx?: Ctx): Promise<ApiResult<any>> {
    const token = await this.login(ctx);
    const endpoint = this.mantBase('/api/v2/mantenimiento/visualizar-autorizacion');

    return this.requestWithAudit<any>(
      endpoint,
      { method: 'POST', headers: this.buildHeaders(token), body: JSON.stringify({ mantenimientoId }) },
      { ...ctx, module: 'authorizations', operation: 'visualizarAutorizacion' },
    );
  }
}