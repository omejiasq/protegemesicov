import { Injectable, HttpException, Logger } from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class ExternalApiService {
  private bearerToken: string | null = null;
  private readonly logger = new Logger(ExternalApiService.name);

  private async login(): Promise<string> {
    // Reautenticar sólo cuando no haya token
    if (this.bearerToken) return this.bearerToken;

    const url = `${process.env.SICOV_AUTH_BASE}/api/v1/autenticacion/inicio-sesion`;
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
      this.logger.error('Error autenticando en SICOV', resp.statusText);
      throw new HttpException('No se pudo autenticar', resp.status);
    }

    const data: any = await resp.json();
    this.bearerToken = data.token;
    return (this.bearerToken as string);
  }

  private async request(endpoint: string, method: string, body?: any): Promise<any> {
    const token = await this.login();

    const headers: any = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      token: process.env.SICOV_TOKEN_VIGILADO,
      vigiladoId: process.env.SICOV_VIGILADO_ID,
    };

    const resp = await fetch(endpoint, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseBody = await resp.json();
    return { status: resp.status, data: responseBody };
  }

  // Ejemplo para listar placas
  async listarPlacas(tipoId: number) {
    const endpoint = `${process.env.SICOV_MANT_BASE}/api/v2/mantenimiento/listar-placas?tipoId=${tipoId}&vigiladoId=${process.env.SICOV_VIGILADO_ID}`;
    return this.request(endpoint, 'GET');
  }

  // Registrar mantenimiento base
  async crearMantenimientoBase(placa: string, tipoId: number) {
    const endpoint = `${process.env.SICOV_MANT_BASE}/api/v2/mantenimiento/guardar-mantenimieto`;
    const body = { placa, tipoId, vigiladoId: process.env.SICOV_VIGILADO_ID };
    return this.request(endpoint, 'POST', body);
  }

  // Registrar detalle preventivo/correctivo/alistamiento
  async guardarPreventivo(dto: any) {
    const endpoint = `${process.env.SICOV_MANT_BASE}/api/v2/mantenimiento/guardar-preventivo`;
    return this.request(endpoint, 'POST', dto);
  }
  // Idéntico para Correctivo y Alistamiento…

  async guardarCorrectivo(dto: any) {
  const endpoint = `${process.env.SICOV_MANT_BASE}/api/v2/mantenimiento/guardar-correctivo`;
  return this.request(endpoint, 'POST', dto);
}

// Registrar detalle ALISTAMIENTO
async guardarAlistamiento(dto: any) {
  const endpoint = `${process.env.SICOV_MANT_BASE}/api/v2/mantenimiento/guardar-alistamiento`;
  return this.request(endpoint, 'POST', dto);
}

// (opcional, útil para el formulario de alistamiento)
async listarActividades() {
  const endpoint = `${process.env.SICOV_MANT_BASE}/api/v2/mantenimiento/listar-actividades`;
  return this.request(endpoint, 'GET');
}
}
