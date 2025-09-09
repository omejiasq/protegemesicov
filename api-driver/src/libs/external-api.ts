import { Injectable, HttpException, Logger } from '@nestjs/common';
import { AuditService } from '../libs/audit/audit.service'; // ajusta el path si tu layout difiere

type AnyObj = Record<string, any>;
type Ctx = { userId?: string; enterpriseId?: string; operation?: string };
export type ApiResult<T> = { status: number; ok: boolean; data: T };

function redact<T extends AnyObj | undefined>(obj: T): T {
  if (!obj) return obj as T;
  const SENSITIVE = ['password', 'contrasena', 'authorization', 'token', 'bearer'];
  const clone: AnyObj = JSON.parse(JSON.stringify(obj));
  for (const k of Object.keys(clone)) {
    if (SENSITIVE.includes(k.toLowerCase())) clone[k] = '***redacted***';
  }
  return clone as T;
}

@Injectable()
export class ExternalApiService {
  private bearerToken: string | null = null;
  private readonly logger = new Logger(ExternalApiService.name);

  constructor(private readonly audit: AuditService) {}

  /* ========= infra común (igual que incidents/authorizations) ========= */

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
      let reqPayload: any = undefined;
      try {
        const b = (init as any)?.body;
        reqPayload = typeof b === 'string' ? JSON.parse(b) : b;
      } catch { /* ignore */ }

      try {
        await this.audit.log({
          module: ctx.module ?? 'drivers',
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

    // Usamos v2 (audita aunque falle)
    const url = `${process.env.SICOV_AUTH_BASE}/api/v1/autenticacion/inicio-sesion`;
    const body = {
      usuario: process.env.SICOV_USERNAME,
      contrasena: process.env.SICOV_PASSWORD,
    };

    const res = await this.requestWithAudit<any>(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      { ...ctx, module: 'drivers', operation: 'login' },
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

  /* ========= endpoints útiles para drivers ========= */

  /**
   * Consulta la API integradora para obtener un resumen del conductor/vehículo.
   * Devuelve bloques conductor_1 / conductor_2 (licencias, exámenes, alcoholimetría).
   */
  async integradoraResumen(payload: {
    numeroIdentificacion1?: string;
    numeroIdentificacion2?: string;
    placa?: string;
    nit?: string;
    fechaConsulta?: string | Date;
  }, ctx?: Ctx) {
    const token = await this.login(ctx);

    const base = process.env.SICOV_INTEGRADORA_BASE || 'https://sicovintegradora.supertransporte.gov.co';
    const url  = `${base}/api-integradora/resumen`;

    const toYmd = (d?: string|Date) => {
      const dt = d ? new Date(d) : new Date();
      return isNaN(dt.getTime()) ? undefined : dt.toISOString().slice(0,10);
    };

    const body = {
      placa: payload.placa,
      numeroIdentificacion1: payload.numeroIdentificacion1,
      numeroIdentificacion2: payload.numeroIdentificacion2,
      nit: payload.nit || process.env.SICOV_NIT,
      fechaConsulta: toYmd(payload.fechaConsulta),
    };

    return this.requestWithAudit<any>(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
      { ...ctx, module: 'drivers', operation: 'integradoraResumen' },
    );
  }
}
