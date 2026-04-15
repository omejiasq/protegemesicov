// src/audit-report/audit-report.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditReportService } from './audit-report.service';

@Controller('audit-report')
@UseGuards(AuthGuard('jwt'))
export class AuditReportController {
  constructor(private readonly svc: AuditReportService) {}

  @Get()
  async getReport(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('operation') operation?: string,
    @Query('success') success?: string,
    @Query('includeInternal') includeInternal?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const isSuperAdmin = req.user?.role === 'superadmin';
    return this.svc.getReport({
      enterpriseId: req.user?.enterprise_id,
      userId: req.user?.sub,
      isSuperAdmin,
      from,
      to,
      operation,
      success: success === 'true' ? true : success === 'false' ? false : undefined,
      includeInternal: includeInternal === 'true',
      page:  page  ? Number(page)  : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Get('operations')
  async getOperations(@Request() req: any) {
    return this.svc.getAvailableOperations(
      req.user?.enterprise_id,
      req.user?.sub,
      req.user?.role === 'superadmin',
    );
  }

  /**
   * GET /audit-report/stats-runt?year=2026&month=4
   * Devuelve los 8 campos de estadística exigidos por el RUNT.
   * Superadmin ve todas las empresas; usuario normal solo la suya.
   */
  @Get('stats-runt')
  async getStatsRunt(
    @Request() req: any,
    @Query('year')  year?:  string,
    @Query('month') month?: string,
  ) {
    return this.svc.getStatsRunt({
      enterpriseId: req.user?.enterprise_id,
      isSuperAdmin: req.user?.role === 'superadmin',
      year:  year  ? Number(year)  : undefined,
      month: month ? Number(month) : undefined,
    });
  }

  /**
   * GET /audit-report/req7?from=2026-01-01&to=2026-04-30&page=1&limit=50
   * GET /audit-report/req7?forExport=true   ← sin paginación, hasta 10 000 filas
   * Datos del Requisito 7 del Anexo Técnico SICOV.
   */
  @Get('req7')
  async getReq7(
    @Request() req: any,
    @Query('from')      from?:      string,
    @Query('to')        to?:        string,
    @Query('page')      page?:      string,
    @Query('limit')     limit?:     string,
    @Query('forExport') forExport?: string,
  ) {
    return this.svc.getReq7Data({
      enterpriseId: req.user?.enterprise_id,
      isSuperAdmin: req.user?.role === 'superadmin',
      from,
      to,
      page:      page  ? Number(page)  : 1,
      limit:     limit ? Number(limit) : 50,
      forExport: forExport === 'true',
    });
  }

  /**
   * Migración: rellena enterpriseId en registros históricos del usuario actual.
   * POST /audit-report/migrate
   */
  @Post('migrate')
  async migrate(@Request() req: any) {
    return this.svc.migrateEnterpriseId(
      req.user?.enterprise_id,
      req.user?.sub,
    );
  }

  @Get(':id')
  async getDetail(@Request() req: any, @Param('id') id: string) {
    return this.svc.getDetail(id, req.user?.enterprise_id, req.user?.sub);
  }
}
