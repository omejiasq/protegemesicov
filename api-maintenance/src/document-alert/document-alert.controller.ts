// src/document-alert/document-alert.controller.ts
import {
  Controller, Get, Post, Patch, Body, Param,
  Query, Request, UseGuards, BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DocumentAlertService } from './document-alert.service';

@Controller('document-alerts')
@UseGuards(AuthGuard('jwt'))
export class DocumentAlertController {
  constructor(private readonly svc: DocumentAlertService) {}

  /**
   * POST /document-alerts
   * La app móvil envía una alerta cuando detecta un documento vencido.
   * Body: { documentType, alertStatus, expiryDate?, daysOverdue,
   *         cardAuthenticity, conductorName?, conductorId?, vehiclePlaca?,
   *         categorias?, rawText?, scannedBy? }
   */
  @Post()
  async create(@Body() body: any, @Request() req: any) {
    if (!body.documentType) throw new BadRequestException('documentType es requerido');
    if (!body.alertStatus)  throw new BadRequestException('alertStatus es requerido');

    return this.svc.create({
      enterprise_id:   req.user.enterprise_id,
      scannedByUserId: req.user.sub,
      ...body,
    });
  }

  /**
   * GET /document-alerts
   * Lista alertas de la empresa con filtros opcionales.
   * Query: acknowledged, documentType, alertStatus, from, to, limit
   */
  @Get()
  async findAll(@Query() q: any, @Request() req: any) {
    return this.svc.findAll(req.user.enterprise_id, {
      acknowledged:  q.acknowledged !== undefined ? q.acknowledged === 'true' : undefined,
      documentType:  q.documentType,
      alertStatus:   q.alertStatus,
      from:          q.from,
      to:            q.to,
      limit:         q.limit ? parseInt(q.limit, 10) : undefined,
    });
  }

  /**
   * GET /document-alerts/unread-count
   * Devuelve { count: N } — usado por el topbar para el badge de notificaciones.
   * Diseñado para polling cada 60 s.
   */
  @Get('unread-count')
  async unreadCount(@Request() req: any) {
    const count = await this.svc.countUnread(req.user.enterprise_id);
    return { count };
  }

  /**
   * GET /document-alerts/summary
   * Resumen agregado para el dashboard de alertas.
   */
  @Get('summary')
  async summary(@Request() req: any) {
    return this.svc.summary(req.user.enterprise_id);
  }

  /**
   * PATCH /document-alerts/:id/acknowledge
   * Marca una alerta como gestionada.
   */
  @Patch(':id/acknowledge')
  async acknowledge(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const name = req.user.name ?? req.user.sub ?? 'Usuario';
    return this.svc.acknowledge(id, req.user.enterprise_id, name);
  }

  /**
   * PATCH /document-alerts/acknowledge-all
   * Marca todas las alertas no gestionadas de la empresa.
   */
  @Patch('acknowledge-all')
  async acknowledgeAll(@Request() req: any) {
    const name = req.user.name ?? req.user.sub ?? 'Usuario';
    return this.svc.acknowledgeAll(req.user.enterprise_id, name);
  }
}
