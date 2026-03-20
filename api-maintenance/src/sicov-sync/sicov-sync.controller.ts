// src/sicov-sync/sicov-sync.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SicovSyncService } from './sicov-sync.service';
import { MaintenanceExternalApiService } from '../libs/external-api';

@Controller('sicov-sync')
@UseGuards(AuthGuard('jwt'))
export class SicovSyncController {
  constructor(
    private readonly syncService: SicovSyncService,
    private readonly external: MaintenanceExternalApiService,
  ) {}

  /** Estadísticas globales de la cola (admin) */
  @Get('stats')
  async getStats(@Request() req: any) {
    const enterprise_id = req.user?.enterprise_id;
    return this.syncService.getQueueStats(enterprise_id);
  }

  /** Lista ítems pendientes/fallidos de la empresa */
  @Get('pending')
  async getPending(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const enterprise_id = req.user?.enterprise_id;
    return this.syncService.getPendingItems(
      enterprise_id,
      limit ? Number(limit) : 20,
    );
  }

  /** Reintento manual de un ítem específico */
  @Post(':id/retry')
  async retryOne(@Param('id') id: string) {
    await this.syncService.retryOne(id);
    return { ok: true, message: 'Reintento completado' };
  }

  /**
   * Migración: establece fechaSyncSicov = createdAt en todos los registros
   * con sicov_sync_status = 'synced' que aún no tengan fechaSyncSicov.
   * Afecta alistamientos, preventivos y correctivos de la empresa del usuario.
   *
   * POST /sicov-sync/migrate-sync-dates
   */
  @Post('migrate-sync-dates')
  async migrateSyncDates(@Request() req: any) {
    return this.syncService.migrateFechaSyncSicov(req.user?.enterprise_id);
  }

  /** Dispara el batch inmediatamente (útil para pruebas / urgencias) */
  @Post('trigger-batch')
  async triggerBatch() {
    await this.syncService.processPendingBatch();
    return { ok: true, message: 'Batch ejecutado' };
  }

  /**
   * Expira manualmente los alistamientos pendientes cuyo día de creación
   * ya pasó. Los marca como inactivos (estado=false) y sicov_sync_status='expired'.
   *
   * POST /sicov-sync/expire-old-pending
   */
  @Post('expire-old-pending')
  async expireOldPending() {
    const result = await this.syncService.expireOldPendingEnlistments();
    return {
      ok: true,
      message: `${result.expired} alistamiento(s) expirado(s)`,
      expired: result.expired,
    };
  }

  /**
   * Reparación masiva de transacciones huérfanas en SICOV.
   *
   * Body:
   * {
   *   "placas": ["ABC123", "XYZ789"],
   *   "tipoId": 3,
   *   "recordType": "enlistment",
   *   "vigiladoId": "891100299",          // opcional, usa el del JWT si no se indica
   *   "vigiladoToken": "xxx",             // opcional
   *   "detailPayloadTemplate": {          // campos del alistamiento/preventivo/correctivo
   *     "tipoIdentificacionResponsable": 1,
   *     "numeroIdentificacionResponsable": "12345678",
   *     "nombreResponsable": "Pedro Pérez",
   *     "tipoIdentificacionConductor": 1,
   *     "numeroIdentificacionConductor": "87654321",
   *     "nombresConductor": "Juan López",
   *     "detalleActividades": "Vehículo en buen estado",
   *     "actividades": [1,2,3,4,5,6,7,8,9,10,11]
   *   }
   * }
   *
   * Retorna un resultado por placa: repaired | new | error
   */
  /**
   * Diagnóstico: consulta el estado de una placa directamente en SICOV maestras.
   * GET /sicov-sync/diagnostico?placa=ABC123&nit=891100299
   *
   * Retorna el histórico de mantenimientos preventivos, correctivos y alistamientos
   * que SICOV tiene registrados para esa placa.
   */
  @Get('diagnostico')
  async diagnosticoPlaca(
    @Request() req: any,
    @Query('placa') placa: string,
    @Query('nit') nit?: string,
  ) {
    if (!placa) throw new BadRequestException('Se requiere el parámetro placa');
    const vigiladoNit =
      nit ??
      String(req.user?.vigiladoId ?? process.env.SICOV_VIGILADO_ID ?? '');
    return this.external.consultarMantenimientosPorPlaca({
      nit: vigiladoNit,
      placa: placa.toUpperCase().trim(),
    });
  }

  @Post('repair-orphans')
  async repairOrphans(@Body() body: any, @Request() req: any) {
    const user = req.user;
    return this.syncService.repairOrphanBatch({
      placas: body.placas,
      tipoId: body.tipoId,
      recordType: body.recordType,
      vigiladoId: body.vigiladoId ?? String(user.vigiladoId ?? process.env.SICOV_VIGILADO_ID),
      vigiladoToken: body.vigiladoToken ?? user.vigiladoToken,
      detailPayloadTemplate: body.detailPayloadTemplate ?? {},
      enterprise_id: user.enterprise_id,
    });
  }
}
