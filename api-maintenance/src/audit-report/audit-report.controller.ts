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
    return this.svc.getReport({
      enterpriseId: req.user?.enterprise_id,
      userId: req.user?.sub,
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
    );
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
