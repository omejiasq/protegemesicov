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
    try {
      return text ? JSON.parse(text) : undefined;
    } catch {
      return text;
    }
  }

  private redact<T extends AnyObj | undefined>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;
    const SENSITIVE = [
      'password',
      'contrasena',
      'authorization',
      'token',
      'bearer',
    ];
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

  private asInt(v: unknown): number {
    const n = Number((v ?? '').toString().trim());
    if (!Number.isFinite(n))
      throw new HttpException('Valor numérico inválido', 400);
    return n;
  }
  private asStr(v: unknown): string {
    return (v ?? '').toString().trim();
  }
  private toDocumento(v: unknown): string {
    return (v ?? '').toString().replace(/\D+/g, '');
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
      requestPayload: {
        usuario: process.env.SICOV_USERNAME,
        contrasena: '***redacted***',
      },
      responseStatus: resp.status,
      responseBody: data,
      success: resp.ok,
      durationMs: Date.now() - started,
    });

    if (!resp.ok) {
      this.logger.error(
        `Error autenticando: ${resp.status} ${resp.statusText}`,
      );
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
      module: 'maintenance',
      operation,
      endpoint,
      requestPayload: this.redact(body),
      responseStatus: resp.status,
      responseBody: data,
      success: resp.ok,
      durationMs: Date.now() - started,
    });

    if (resp.status === 401 || resp.status === 403) {
      this.bearerToken = null;
      const retryStarted = Date.now();
      const retryToken = await this.login();

      const retry = await fetch(endpoint, {
        method,
        headers: this.buildHeaders(retryToken, vigiladoId, vigiladoToken),
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

      if (!resp.ok) {
        throw new HttpException(
          { message: 'Error en SICOV', data },
          resp.status,
        );
      }
      return { ok: true, status: retry.status, data: retryData };
    }

    if (!resp.ok) throw new HttpException('Error en SICOV', resp.status);
    return { ok: true, status: resp.status, data };
  }

  private async requestWithAuditSafe(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    operation: string,
    body?: Record<string, any>,
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
        module: 'maintenance',
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

  private bufToU8(buf: Buffer): Uint8Array {
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  private bufToArrayBuffer(buf: Buffer): ArrayBuffer {
    const view = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const copy = new Uint8Array(view.byteLength);
    copy.set(view); // copia para garantizar ArrayBuffer estándar
    return copy.buffer; // <- ArrayBuffer válido para Blob/File
  }

  private async requestMultipartWithAuditFactorySafe(
    endpoint: string,
    operation: string,
    makeForm: () => FormData,
    vigiladoId?: string,
    vigiladoToken?: string,
  ) {
    const started = Date.now();
    const token = await this.login();

    // headers base, sin Content-Type fijo (boundary lo pone fetch)
    const base = this.buildHeaders(token, vigiladoId, vigiladoToken);
    delete (base as any)['Content-Type'];

    // 1) primer intento
    let form = makeForm();
    let resp = await fetch(endpoint, {
      method: 'POST',
      headers: base as any,
      body: form as any,
    });
    let data = await this.safeJson(resp);

    await this.audit.log({
      module: 'maintenance',
      operation,
      endpoint,
      requestPayload: { multipart: true },
      responseStatus: resp.status,
      responseBody: data,
      success: resp.ok,
      durationMs: Date.now() - started,
    });

    // 2) retry auth
    if (resp.status === 401 || resp.status === 403) {
      this.bearerToken = null;
      const retryStarted = Date.now();
      const retryToken = await this.login();
      const retryHeaders = this.buildHeaders(
        retryToken,
        vigiladoId,
        vigiladoToken,
      );
      delete (retryHeaders as any)['Content-Type'];

      // IMPORTANTE: reconstruir el FormData (no reusar el stream)
      form = makeForm();
      resp = await fetch(endpoint, {
        method: 'POST',
        headers: retryHeaders as any,
        body: form as any,
      });
      data = await this.safeJson(resp);

      await this.audit.log({
        module: 'maintenance',
        operation: `${operation}:retry`,
        endpoint,
        requestPayload: { multipart: true },
        responseStatus: resp.status,
        responseBody: data,
        success: resp.ok,
        durationMs: Date.now() - retryStarted,
      });
    }

    if (!resp.ok)
      throw new HttpException(data ?? 'Error en SICOV', resp.status);
    return { ok: true, status: resp.status, data };
  }

  /** -------------------------
   *  Endpoints Mantenimiento
   *  ------------------------- */

  /** Lista las placas disponibles para mantenimiento */
  async listarPlacas(query: { tipoId: number; vigiladoId?: string }) {
    const params = new URLSearchParams();
    params.set('tipoId', String(query.tipoId));
    const endpoint = this.mantBase(
      `/api/v2/mantenimiento/listar-placas?${params.toString()}`,
    );
    return this.requestWithAudit(
      endpoint,
      'GET',
      'listarPlacas',
      undefined,
      query.vigiladoId,
    );
  }

  async guardarMantenimiento(payload: {
    placa: string;
    tipoId: number;
    vigiladoId?: string;
    vigiladoToken?: string;
  }) {
    const endpoint = this.mantBase(
      '/api/v2/mantenimiento/guardar-mantenimieto',
    );
    const body = {
      vigiladoId: payload.vigiladoId,
      placa: payload.placa,
      tipoId: payload.tipoId,
    };
    return this.requestWithAudit(
      endpoint,
      'POST',
      'guardarMantenimiento',
      body,
      payload.vigiladoId,
      payload.vigiladoToken,
    );
  }

  async guardarPreventivo(payload: {
    fecha: string;
    hora: string;
    nit: string | number;
    razonSocial: string;
    tipoIdentificacion: number | string;
    numeroIdentificacion: string | number;
    nombresResponsable: string;
    mantenimientoId: number | string; // <- viene string desde tu externalId
    detalleActividades: string;
    vigiladoId?: string;
    vigiladoToken?: string;
  }) {
    const endpoint = this.mantBase('/api/v2/mantenimiento/guardar-preventivo');

    // NORMALIZACIÓN ESTRICTA DE TIPOS
    const body = {
      fecha: this.asStr(payload.fecha),
      hora: this.asStr(payload.hora),
      nit: this.asInt(payload.nit), // string
      razonSocial: this.asStr(payload.razonSocial),
      tipoIdentificacion: this.asInt(payload.tipoIdentificacion), // number
      numeroIdentificacion: this.asStr(payload.numeroIdentificacion),
      nombresResponsable: this.asStr(payload.nombresResponsable),
      mantenimientoId: this.asInt(payload.mantenimientoId), // number (clave)
      detalleActividades: this.asStr(payload.detalleActividades),
    };

    return this.requestWithAuditSafe(
      endpoint,
      'POST',
      'guardarPreventivo',
      body,
      payload.vigiladoId,
      payload.vigiladoToken,
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
    const body = { mantenimientoId };
    return this.requestWithAudit(
      endpoint,
      'POST',
      'visualizarPreventivo',
      body,
      vigiladoId,
    );
  }

  /** Registra el mantenimiento correctivo */
  async guardarCorrectivo(payload: {
    fecha: string;
    hora: string;
    nit: number | string;
    razonSocial: string;
    tipoIdentificacion: number | string;
    numeroIdentificacion: number | string;
    nombresResponsable: string;
    mantenimientoId: number | string;
    //descripcionFalla: string;
    detalleActividades: string;
    //accionesRealizadas: string;
    // ⬇️ AHORA OPCIONALES
    descripcionFalla?: string;
    accionesRealizadas?: string;

    vigiladoId?: string;
    vigiladoToken?: string;
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
      documento_vigilado: (payload.vigiladoId || '')
        .toString()
        .replace(/[.\- ]/g, ''),
    };
    return this.requestWithAudit(
      endpoint,
      'POST',
      'guardarCorrectivo',
      body,
      payload.vigiladoId,
      payload.vigiladoToken,
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
    const body = { mantenimientoId };
    return this.requestWithAudit(
      endpoint,
      'POST',
      'visualizarCorrectivo',
      body,
      vigiladoId,
    );
  }

  /** Registra un alistamiento */
  async guardarAlistamiento(payload: {
    tipoIdentificacionResponsable: number;
    numeroIdentificacionResponsable: string;
    nombreResponsable: string;
    tipoIdentificacionConductor: number | string;
    numeroIdentificacionConductor: number;
    nombresConductor: string;
    mantenimientoId: number | string; // externo
    detalleActividades: string;
    actividades: (number | string)[];
    vigiladoId?: string; // headers
    vigiladoToken?: string; // headers
  }) {
    const url = `https://rutasback.supertransporte.gov.co/api/v2/mantenimiento/guardar-alistamiento`;

    const body = {
      tipoIdentificacionResponsable: Number(
        payload.tipoIdentificacionResponsable,
      ),
      numeroIdentificacionResponsable: String(
        payload.numeroIdentificacionResponsable,
      ).trim(),
      nombreResponsable: String(payload.nombreResponsable).trim(),
      tipoIdentificacionConductor: Number(payload.tipoIdentificacionConductor),
      numeroIdentificacionConductor: String(
        payload.numeroIdentificacionConductor,
      ).trim(),
      nombresConductor: String(payload.nombresConductor).trim(),
      mantenimientoId: Number(payload.mantenimientoId),
      detalleActividades: String(payload.detalleActividades).trim(),
      actividades: (payload.actividades ?? []).map((x) => Number(x)),
    };

    return this.requestWithAuditSafe(
      url,
      'POST',
      'guardarAlistamiento',
      body,
      payload.vigiladoId,
      payload.vigiladoToken,
    );
  }

  /** Visualiza un alistamiento existente */
  async visualizarAlistamiento(
    mantenimientoId: number | string,
    vigiladoId?: string,
  ) {
    const endpoint = this.mantBase(
      '/api/v2/mantenimiento/visualizar-alistamiento',
    );
    const body = { mantenimientoId };
    return this.requestWithAudit(
      endpoint,
      'POST',
      'visualizarAlistamiento',
      body,
      vigiladoId,
    );
  }

  /** Lista las actividades de alistamiento */
  async listarActividades(vigiladoId?: string) {
    const endpoint = this.mantBase('/api/v2/mantenimiento/listar-actividades');
    return this.requestWithAudit(
      endpoint,
      'GET',
      'listarActividades',
      undefined,
      vigiladoId,
    );
  }

  async guardarArchivo(payload: {
    buffer: Buffer; // Multer memoryStorage
    filename: string; // file.originalname
    mimetype: string; // file.mimetype
    vigiladoId?: string | number; // headers/body
    vigiladoToken?: string; // headers
  }) {
    if (payload.vigiladoId == null) {
      throw new Error(
        'vigiladoId es requerido para adjuntar idVigilado en el formulario.',
      );
    }
    const endpoint = this.mantBase('/api/v2/archivos');
    const id = String(payload.vigiladoId);

    // Fábrica de FormData: se usa en el primer intento y en el retry.
    const makeForm = () => {
      const ab = this.bufToArrayBuffer(payload.buffer as Buffer);
      const filePart = new File([ab], payload.filename, {
        type: payload.mimetype,
      });
      const form = new FormData();
      form.append('archivo', filePart); // filename se toma del File
      form.append('idVigilado', id); // la externa lo espera así
      return form;
    };

    // NO fijes Content-Type; fetch arma el boundary.
    return this.requestMultipartWithAuditFactorySafe(
      endpoint,
      'guardarArchivo',
      makeForm,
      id, // headers: vigiladoId
      payload.vigiladoToken, // headers: vigiladoToken si aplica
    );
  }

  async crearArchivoPrograma(payload: {
    tipoId: 1 | 2 | 3;
    documento: string; // nombreAlmacenado
    nombreOriginal: string; // nombreOriginalArchivo
    ruta: string; // URL pública
    placa?: string;
    vigiladoId?: string | number; // headers/body
    vigiladoToken?: string; // headers
  }) {
    const endpoint = this.mantBase('/api/v2/archivos_programas');
    const id =
      payload.vigiladoId != null ? String(payload.vigiladoId) : undefined;

    // 👇 La externa espera `idVigilado` en el body
    const body = {
      tipoId: Number(payload.tipoId),
      documento: this.asStr(payload.documento),
      nombreOriginal: this.asStr(payload.nombreOriginal),
      ruta: this.asStr(payload.ruta),
      placa: payload.placa ? this.asStr(payload.placa) : undefined,
      vigiladoId: id,
    };

    console.log('%capi-maintenance\src\libs\external-api.ts:631 body', 'color: #007acc;', body);

    // Audita + reintenta con tu requestWithAuditSafe
    return this.requestWithAuditSafe(
      endpoint,
      'POST',
      'crearArchivoPrograma',
      body,
      id, // headers: vigiladoId
      payload.vigiladoToken, // headers: vigiladoToken (si aplica)
    );
  }
}
