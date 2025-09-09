import { Injectable, HttpException, Logger } from '@nestjs/common';
import { AuditService } from './audit/audit.service';

type AnyObj = Record<string, any>;

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
export class IncidentsExternalApiService {
  private bearerToken: string | null = null;
  private readonly logger = new Logger(IncidentsExternalApiService.name);

  constructor(private readonly audit: AuditService) {}

  private async login(): Promise<string> {
    if (this.bearerToken) return this.bearerToken;
    const url = `${process.env.SICOV_AUTH_BASE}/api/v2/autenticacion/inicio-sesion`;
    const body = JSON.stringify({
      usuario: process.env.SICOV_USERNAME,
      contrasena: process.env.SICOV_PASSWORD,
    });

    const started = Date.now();
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const text = await resp.text();
    let data: any;
    try { data = text ? JSON.parse(text) : undefined; } catch { data = text; }

    // Auditoría del login
    await this.audit.log({
      module: 'incidents',
      operation: 'login',
      endpoint: url,
      requestPayload: redact({ usuario: process.env.SICOV_USERNAME, contrasena: '***redacted***' }),
      responseStatus: resp.status,
      responseBody: data,
      success: resp.ok,
      durationMs: Date.now() - started,
    });

    if (!resp.ok) {
      this.logger.error(`Error autenticando: ${resp.status} ${resp.statusText}`);
      throw new HttpException('No se pudo autenticar', resp.status);
    }

    this.bearerToken = data?.token;
    return this.bearerToken as string;
  }

  private async request(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH',
  body?: any,
  ctx?: { operation?: string; userId?: string; enterpriseId?: string }, // 👈 nuevo
) {
  const started = Date.now();
  let status = 0;
  let ok = false;
  let data: any = undefined;
  let errorMessage: string | undefined;

  try {
    const token = await this.login();
    const resp = await fetch(endpoint, {
      method,
      headers: this.buildHeaders(token),
      body: body ? JSON.stringify(body) : undefined,
    });
    status = resp.status;
    ok = resp.ok;
    const text = await resp.text();
    try { data = text ? JSON.parse(text) : undefined; } catch { data = text; }
    return { status, ok, data };
  } catch (err: any) {
    errorMessage = err?.message ?? String(err);
    throw err;
  } finally {
    try {
      await this.audit.log({
        module: 'incidents',
        operation: ctx?.operation ?? `${method} ${endpoint}`,
        endpoint,
        requestPayload: redact(body),
        responseStatus: status || 0,
        responseBody: data,
        success: !!ok,
        durationMs: Date.now() - started,
        userId: ctx?.userId,
        enterpriseId: ctx?.enterpriseId,
        errorMessage,
      });
    } catch {/* no romper por fallos de auditoría */}
  }
}

  private buildHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      token: process.env.SICOV_TOKEN_VIGILADO as string,
      vigiladoId: process.env.SICOV_VIGILADO_ID as string,
    };
  }

  private novedadBase(path: string) {
    const base = process.env.SICOV_NOVEDAD_BASE || 'https://msdespachosback.thankfulbeach-21114078.eastus.azurecontainerapps.io';
    return `${base}${path}`;
  }

  // request con auditoría y reintento simple si 401/403
  private async requestWithAudit(
    endpoint: string,
    method: string,
    operation: 'crearNovedad' | 'actualizarNovedad' | 'toggleNovedad',
    body?: any,
  ) {
    const started = Date.now();
    const token = await this.login();
    const resp = await fetch(endpoint, {
      method,
      headers: this.buildHeaders(token),
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await resp.text();
    let data: any;
    try { data = text ? JSON.parse(text) : undefined; } catch { data = text; }

    // auditoría principal
    await this.audit.log({
      module: 'incidents',
      operation,
      endpoint,
      requestPayload: redact(body),
      responseStatus: resp.status,
      responseBody: data,
      success: resp.ok,
      durationMs: Date.now() - started,
    });

    // refrescar token y reintentar 1 vez si 401/403
    if (resp.status === 401 || resp.status === 403) {
      this.bearerToken = null;
      const started2 = Date.now();
      const token2 = await this.login();
      const resp2 = await fetch(endpoint, {
        method,
        headers: this.buildHeaders(token2),
        body: body ? JSON.stringify(body) : undefined,
      });
      const txt2 = await resp2.text();
      let data2: any;
      try { data2 = txt2 ? JSON.parse(txt2) : undefined; } catch { data2 = txt2; }

      await this.audit.log({
        module: 'incidents',
        operation: (operation + ':retry') as any,
        endpoint,
        requestPayload: redact(body),
        responseStatus: resp2.status,
        responseBody: data2,
        success: resp2.ok,
        durationMs: Date.now() - started2,
      });

      return { status: resp2.status, ok: resp2.ok, data: data2 };
    }

    return { status: resp.status, ok: resp.ok, data };
  }

  // ====== Endpoints ======

  async crearNovedad(payload: {
    idDespacho: number;
    tipoNovedadId: number;
    descripcion: string;
    otros?: string;
  },
  ctx?: { userId?: string; enterpriseId?: string },
) {
  const endpoint = this.novedadBase('/api/v1/novedades');
  const body = {
    id_despacho: payload.idDespacho,
    tipo_novedad_id: payload.tipoNovedadId,
    descripcion: payload.descripcion,
    otros: payload.otros,
  };
  return this.request(endpoint, 'POST', body, { operation: 'crearNovedad', ...ctx });
}

  async actualizarNovedad(payload: {
    id: number;
    idDespacho: number;
    tipoNovedadId: number;
    descripcion: string;
    otros?: string;
  }) {
    const endpoint = this.novedadBase('/api/v1/novedades');
    const body = {
      id: payload.id,
      id_despacho: payload.idDespacho,
      tipo_novedad_id: payload.tipoNovedadId,
      descripcion: payload.descripcion,
      otros: payload.otros,
    };
    return this.requestWithAudit(endpoint, 'PUT', 'actualizarNovedad', body);
  }

  async toggleNovedad(id: number) {
    const endpoint = this.novedadBase('/api/v1/novedades');
    return this.requestWithAudit(endpoint, 'PATCH', 'toggleNovedad', { id });
  }
}
