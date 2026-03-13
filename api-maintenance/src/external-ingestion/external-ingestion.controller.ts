// src/external-ingestion/external-ingestion.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeyGuard } from './api-key.guard';
import { ExternalIngestionService } from './external-ingestion.service';

// ============================================================
// Gestión de API Keys (requieren JWT de empresa)
// ============================================================
@Controller('external-api/keys')
@UseGuards(AuthGuard('jwt'))
export class ApiKeyManagementController {
  constructor(private readonly svc: ExternalIngestionService) {}

  /**
   * Crea una nueva API Key para la empresa del usuario autenticado.
   * Body: { name: string, vigiladoId?: string, vigiladoToken?: string, demoMode?: boolean }
   * ⚠️ La clave se muestra UNA SOLA VEZ. Guárdela en un lugar seguro.
   */
  @Post()
  async create(@Body() body: any, @Request() req: any) {
    const user = req.user;
    return this.svc.createApiKey(
      user.enterprise_id,
      body.name,
      body.vigiladoId,
      body.vigiladoToken,
      user.sub,
      body.demoMode === true,
    );
  }

  /** Lista las API Keys de la empresa (sin mostrar el hash) */
  @Get()
  async list(@Request() req: any) {
    return this.svc.listApiKeys(req.user.enterprise_id);
  }

  /** Revoca una API Key */
  @Delete(':id')
  async revoke(@Param('id') id: string, @Request() req: any) {
    return this.svc.revokeApiKey(id, req.user.enterprise_id);
  }
}

// ============================================================
// Ingesta desde sistemas externos (requieren X-Api-Key header)
// ============================================================
@Controller('external-api')
@UseGuards(ApiKeyGuard)
export class ExternalIngestionController {
  constructor(private readonly svc: ExternalIngestionService) {}

  // ── Alistamientos ────────────────────────────────────────

  /** Crear un alistamiento individual */
  @Post('enlistments')
  async createEnlistment(@Body() body: any, @Request() req: any) {
    return this.svc.createEnlistment(body, req.apiKeyContext);
  }

  /**
   * Crear múltiples alistamientos en una sola llamada (batch).
   * Body: array de objetos, misma estructura que POST /external-api/enlistments
   * Respuesta: array con resultado por ítem { index, status, id?, error? }
   */
  @Post('enlistments/batch')
  async batchEnlistments(@Body() body: any, @Request() req: any) {
    if (!Array.isArray(body)) throw new BadRequestException('Se esperaba un array');
    if (body.length > 500) throw new BadRequestException('Máximo 500 ítems por lote');
    return this.svc.batchEnlistments(body, req.apiKeyContext);
  }

  // ── Preventivos ──────────────────────────────────────────

  /** Crear un mantenimiento preventivo individual */
  @Post('preventives')
  async createPreventive(@Body() body: any, @Request() req: any) {
    return this.svc.createPreventive(body, req.apiKeyContext);
  }

  /**
   * Crear múltiples preventivos en una sola llamada (batch).
   * Body: array de objetos
   */
  @Post('preventives/batch')
  async batchPreventives(@Body() body: any, @Request() req: any) {
    if (!Array.isArray(body)) throw new BadRequestException('Se esperaba un array');
    if (body.length > 500) throw new BadRequestException('Máximo 500 ítems por lote');
    return this.svc.batchPreventives(body, req.apiKeyContext);
  }

  // ── Correctivos ──────────────────────────────────────────

  /** Crear un mantenimiento correctivo individual */
  @Post('correctives')
  async createCorrective(@Body() body: any, @Request() req: any) {
    return this.svc.createCorrective(body, req.apiKeyContext);
  }

  /**
   * Crear múltiples correctivos en una sola llamada (batch).
   * Body: array de objetos
   */
  @Post('correctives/batch')
  async batchCorrectives(@Body() body: any, @Request() req: any) {
    if (!Array.isArray(body)) throw new BadRequestException('Se esperaba un array');
    if (body.length > 500) throw new BadRequestException('Máximo 500 ítems por lote');
    return this.svc.batchCorrectives(body, req.apiKeyContext);
  }

  // ── Vehículos ────────────────────────────────────────────

  /**
   * Crear o actualizar un vehículo (upsert por placa).
   * Si la placa ya existe para la empresa, actualiza los campos enviados.
   * Si no existe, crea el registro.
   * Body: { placa: string, clase?, marca?, modelo?, ... }
   */
  @Post('vehicles')
  async upsertVehicle(@Body() body: any, @Request() req: any) {
    return this.svc.upsertVehicle(body, req.apiKeyContext);
  }

  /**
   * Crear o actualizar múltiples vehículos en una sola llamada (batch).
   * Body: array de objetos, misma estructura que POST /external-api/vehicles
   * Respuesta: array con resultado por ítem { index, status, id?, error? }
   */
  @Post('vehicles/batch')
  async batchVehicles(@Body() body: any, @Request() req: any) {
    if (!Array.isArray(body)) throw new BadRequestException('Se esperaba un array');
    if (body.length > 500) throw new BadRequestException('Máximo 500 ítems por lote');
    return this.svc.batchVehicles(body, req.apiKeyContext);
  }

  // ── Conductores ──────────────────────────────────────────

  /**
   * Crear o actualizar un conductor (upsert por numeroIdentificacion).
   * Si el número de identificación ya existe para la empresa, actualiza los campos enviados.
   * Body: { numeroIdentificacion: string, tipoIdentificacionPrincipal: string,
   *         primerNombrePrincipal: string, primerApellidoPrincipal: string, ... }
   */
  @Post('drivers')
  async upsertDriver(@Body() body: any, @Request() req: any) {
    return this.svc.upsertDriver(body, req.apiKeyContext);
  }

  /**
   * Crear o actualizar múltiples conductores en una sola llamada (batch).
   * Body: array de objetos, misma estructura que POST /external-api/drivers
   * Respuesta: array con resultado por ítem { index, status, id?, error? }
   */
  @Post('drivers/batch')
  async batchDrivers(@Body() body: any, @Request() req: any) {
    if (!Array.isArray(body)) throw new BadRequestException('Se esperaba un array');
    if (body.length > 500) throw new BadRequestException('Máximo 500 ítems por lote');
    return this.svc.batchDrivers(body, req.apiKeyContext);
  }
}
