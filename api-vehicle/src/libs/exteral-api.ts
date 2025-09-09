import { Injectable, HttpException, Logger } from '@nestjs/common';
import { AuditService } from './audit/audit.service';

type AnyObj = Record<string, any>;
type Ctx = { userId?: string; enterpriseId?: string; operation?: string };
export type ApiResult<T> = { status: number; ok: boolean; data: T };

function redact<T extends AnyObj | undefined>(obj: T): T {
  if (!obj) return obj as T;
  const S = ['password', 'contrasena', 'authorization', 'token', 'bearer'];
  const c: AnyObj = JSON.parse(JSON.stringify(obj));
  for (const k of Object.keys(c)) if (S.includes(k.toLowerCase())) c[k] = '***redacted***';
  return c as T;
}

@Injectable()
export class VehicleExternalApiService {
  private bearerToken: string | null = null;
  private readonly logger = new Logger(VehicleExternalApiService.name);

  constructor(private readonly audit: AuditService) {}

  /* ================= infra común (auditoría) ================= */

  private async requestWithAudit<T>(
    url: string,
    init: RequestInit,
    ctx: Ctx & { module?: string } = {},
  ): Promise<ApiResult<T>> {
    const started = Date.now();
    let status = 0, ok = false, data: any = undefined, errorMessage: string | undefined;
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
      try { const b = (init as any)?.body; reqPayload = typeof b === 'string' ? JSON.parse(b) : b; } catch {}
      try {
        await this.audit.log({
          module: ctx.module ?? 'vehicles',
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
      } catch { /* nunca bloquear por auditoría */ }
    }
  }

  private async login(ctx?: Ctx): Promise<string> {
    if (this.bearerToken) return this.bearerToken;
    const url = `${process.env.SICOV_AUTH_BASE}/api/v1/autenticacion/inicio-sesion`;
    const body = { usuario: process.env.SICOV_USERNAME, contrasena: process.env.SICOV_PASSWORD };
    const res = await this.requestWithAudit<any>(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      { ...ctx, module: 'vehicles', operation: 'login' },
    );
    if (!res.ok) throw new HttpException('No se pudo autenticar', res.status);
    const token = res.data?.token as string | undefined;
    if (!token) throw new HttpException('Token no recibido', 500);
    this.bearerToken = token;
    return token;
  }

  /* ================= bases y headers ================= */

  // Base de DESPACHO V1 (correcta para VEHÍCULOS en V1)
  private despV1(path: string) {
    const base = process.env.SICOV_DESPACHO_BASE; // p.ej. https://sicovreportes.supertransporte.gov.co/despachoback
    if (!base) throw new Error('Falta env SICOV_DESPACHO_BASE');
    return `${base}/api/v1${path}`; // <- agrega /api/v1
  }

  // Headers de DESPACHO (requiere NIT en "documento")
  private headersDespacho(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      token: process.env.SICOV_TOKEN_VIGILADO as string,
      documento: process.env.SICOV_NIT as string,          // <- NIT, NO "vigiladoId"
    };
  }

  /* ================= helpers de mapeo ================= */

  private toExternalPayload(v: Partial<{
    placa: string;
    clase: number;
    nivelServicio: number;
    soat?: string;
    fechaVencimientoSoat?: string | Date;
    revisionTecnicoMecanica?: string;
    fechaRevisionTecnicoMecanica?: string | Date;
    idPolizas?: string;
    tipoPoliza?: string;
    vigencia?: string | Date;
    tarjetaOperacion?: string;
    fechaTarjetaOperacion?: string | Date;
  }>) {
    const toIso = (d?: string | Date) => d ? new Date(d).toISOString() : undefined;
    return {
      placa: v.placa,
      claseId: v.clase,
      nivelServicioId: v.nivelServicio,
      soatNumero: v.soat,
      soatVencimiento: toIso(v.fechaVencimientoSoat),
      rtmNumero: v.revisionTecnicoMecanica,
      rtmFecha: toIso(v.fechaRevisionTecnicoMecanica),
      polizaId: v.idPolizas,
      polizaTipo: v.tipoPoliza,
      polizaVigencia: toIso(v.vigencia),
      tarjetaOperacionNumero: v.tarjetaOperacion,
      tarjetaOperacionFecha: toIso(v.fechaTarjetaOperacion),
    };
  }

  /* ================= endpoints vehículo (V1 Despacho) ================= */

  // POST /vehiculos
  async crearVehiculo(local: {
    placa: string; clase: number; nivelServicio: number;
    soat?: string; fechaVencimientoSoat?: string | Date;
    revisionTecnicoMecanica?: string; fechaRevisionTecnicoMecanica?: string | Date;
    idPolizas?: string; tipoPoliza?: string; vigencia?: string | Date;
    tarjetaOperacion?: string; fechaTarjetaOperacion?: string | Date;
  }, ctx?: Ctx) {
    const token = await this.login(ctx);
    const url = this.despV1(`/vehiculos`); // <- /api/v1/vehiculos
    const body = this.toExternalPayload(local);
    return this.requestWithAudit<any>(
      url,
      { method: 'POST', headers: this.headersDespacho(token), body: JSON.stringify(body) },
      { ...ctx, module: 'vehicles', operation: 'crearVehiculo' },
    );
  }

  // PUT /vehiculos/:id
  async actualizarVehiculo(externalId: string, local: Partial<{
    placa: string; clase: number; nivelServicio: number;
    soat?: string; fechaVencimientoSoat?: string | Date;
    revisionTecnicoMecanica?: string; fechaRevisionTecnicoMecanica?: string | Date;
    idPolizas?: string; tipoPoliza?: string; vigencia?: string | Date;
    tarjetaOperacion?: string; fechaTarjetaOperacion?: string | Date;
  }>, ctx?: Ctx) {
    const token = await this.login(ctx);
    const url = this.despV1(`/vehiculos/${encodeURIComponent(externalId)}`);
    const body = this.toExternalPayload(local);
    return this.requestWithAudit<any>(
      url,
      { method: 'PUT', headers: this.headersDespacho(token), body: JSON.stringify(body) },
      { ...ctx, module: 'vehicles', operation: 'actualizarVehiculo' },
    );
  }

  // PATCH /vehiculos/:id/toggle
  async toggleVehiculo(externalId: string, ctx?: Ctx) {
    const token = await this.login(ctx);
    const url = this.despV1(`/vehiculos/${encodeURIComponent(externalId)}/toggle`);
    return this.requestWithAudit<any>(
      url,
      { method: 'PATCH', headers: this.headersDespacho(token) },
      { ...ctx, module: 'vehicles', operation: 'toggleVehiculo' },
    );
  }

  /* ============ integradora / paramétricas / nivel servicio (ya correctos) ============ */

  async integradoraResumen(payload: {
    numeroIdentificacion1?: string;
    numeroIdentificacion2?: string;
    placa: string;
    nit?: string;
    fechaConsulta?: string | Date;
  }, ctx?: Ctx) {
    const token = await this.login(ctx);
    const base = process.env.SICOV_INTEGRADORA_BASE || 'https://sicovintegradora.supertransporte.gov.co';
    const url = `${base}/api-integradora/resumen`;
    const toYmd = (d?: string | Date) => {
      const dt = d ? new Date(d) : new Date();
      return isNaN(dt.getTime()) ? undefined : dt.toISOString().slice(0, 10);
    };
    const body = {
      numeroIdentificacion1: payload.numeroIdentificacion1,
      numeroIdentificacion2: payload.numeroIdentificacion2,
      placa: payload.placa,
      nit: payload.nit || process.env.SICOV_NIT,
      fechaConsulta: toYmd(payload.fechaConsulta),
    };
    return this.requestWithAudit<any>(
      url,
      { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      { ...ctx, module: 'vehicles', operation: 'integradoraResumen' },
    );
  }

  async listarClasesVehiculo(ctx?: Ctx) {
    const base = process.env.SICOV_PARAM_BASE || 'https://parametricasback.azurewebsites.net';
    const url = `${base}/api/v1/parametrica/listar-clase-vehiculo`;
    return this.requestWithAudit<any>(
      url,
      { method: 'GET', headers: { Authorization: `Bearer ${process.env.SICOV_PARAM_TOKEN || ''}` } },
      { ...ctx, module: 'vehicles', operation: 'listarClasesVehiculo' },
    );
  }

  async listarNivelServicio(ctx?: Ctx) {
    const token = await this.login(ctx);
    const base = process.env.SICOV_DESPACHO_BASE || 'https://sicovreportes.supertransporte.gov.co/despachoback';
    const url = `${base}/api/v1/nivelservicio`;
    return this.requestWithAudit<any>(
      url,
      { method: 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', token: process.env.SICOV_TOKEN_VIGILADO || '', documento: process.env.SICOV_NIT || '' } },
      { ...ctx, module: 'vehicles', operation: 'listarNivelServicio' },
    );
  }
}
