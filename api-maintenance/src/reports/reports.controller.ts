// src/reports/reports.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { ReportTemplateService } from './services/report-template.service';
import { ExcelExportService } from './services/excel-export.service';
import { FieldDiscoveryService } from './services/field-discovery.service';
import {
  CreateReportTemplateDto,
  UpdateReportTemplateDto,
  GenerateReportDto,
  ReportFieldsQueryDto,
  DuplicateTemplateDto
} from './dto/report-template.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly reportTemplateService: ReportTemplateService,
    private readonly excelExportService: ExcelExportService,
    private readonly fieldDiscoveryService: FieldDiscoveryService,
  ) {}

  // ── Gestión de plantillas de reportes ────────────────────────────────

  @Post('templates')
  async createTemplate(
    @Body(ValidationPipe) createDto: CreateReportTemplateDto,
    @Req() req: any
  ) {
    try {
      const template = await this.reportTemplateService.create(
        createDto,
        req.user.enterprise_id,
        req.user.sub
      );

      return {
        success: true,
        data: template,
        message: 'Plantilla de reporte creada exitosamente'
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al crear la plantilla de reporte',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('templates')
  async getTemplates(
    @Query() filters: any,
    @Req() req: any
  ) {
    try {
      const templates = await this.reportTemplateService.findAll(
        req.user.enterprise_id,
        {
          categoria: filters.categoria,
          activo: filters.activo === 'true',
          isPublic: filters.isPublic === 'true',
          search: filters.search
        }
      );

      return {
        success: true,
        data: templates,
        total: templates.length
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener las plantillas de reportes',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('templates/:id')
  async getTemplate(
    @Param('id') id: string,
    @Req() req: any
  ) {
    try {
      const template = await this.reportTemplateService.findById(
        id,
        req.user.enterprise_id
      );

      if (!template) {
        throw new HttpException(
          'Plantilla de reporte no encontrada',
          HttpStatus.NOT_FOUND
        );
      }

      return {
        success: true,
        data: template
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al obtener la plantilla de reporte',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateReportTemplateDto,
    @Req() req: any
  ) {
    try {
      const template = await this.reportTemplateService.update(
        id,
        updateDto,
        req.user.enterprise_id
      );

      if (!template) {
        throw new HttpException(
          'Plantilla de reporte no encontrada',
          HttpStatus.NOT_FOUND
        );
      }

      return {
        success: true,
        data: template,
        message: 'Plantilla de reporte actualizada exitosamente'
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error al actualizar la plantilla de reporte',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Delete('templates/:id')
  async deleteTemplate(
    @Param('id') id: string,
    @Req() req: any
  ) {
    try {
      const deleted = await this.reportTemplateService.remove(
        id,
        req.user.enterprise_id
      );

      if (!deleted) {
        throw new HttpException(
          'Plantilla de reporte no encontrada',
          HttpStatus.NOT_FOUND
        );
      }

      return {
        success: true,
        message: 'Plantilla de reporte eliminada exitosamente'
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al eliminar la plantilla de reporte',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('templates/:id/duplicate')
  async duplicateTemplate(
    @Param('id') id: string,
    @Body(ValidationPipe) duplicateDto: DuplicateTemplateDto,
    @Req() req: any
  ) {
    try {
      const template = await this.reportTemplateService.duplicateTemplate(
        id,
        req.user.enterprise_id,
        duplicateDto.newName
      );

      return {
        success: true,
        data: template,
        message: 'Plantilla duplicada exitosamente'
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al duplicar la plantilla',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // ── Generación de reportes ───────────────────────────────────────────

  @Post('templates/:id/generate')
  async generateReport(
    @Param('id') id: string,
    @Body(ValidationPipe) generateDto: GenerateReportDto,
    @Req() req: any
  ) {
    try {
      const reportData = await this.reportTemplateService.generateReport(
        id,
        generateDto,
        req.user.enterprise_id
      );

      return {
        success: true,
        data: reportData,
        message: 'Reporte generado exitosamente'
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al generar el reporte',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('templates/:id/export')
  async exportReport(
    @Param('id') id: string,
    @Body(ValidationPipe) generateDto: GenerateReportDto,
    @Req() req: any,
    @Res() res: Response
  ) {
    try {
      // Generar los datos del reporte
      const reportData = await this.reportTemplateService.generateReport(
        id,
        generateDto,
        req.user.enterprise_id
      );

      // Obtener información de la empresa para el branding
      const enterpriseInfo = req.user.enterprise || {
        razonSocial: 'Empresa',
        nit: req.user.enterprise_id
      };

      const format = generateDto.format || 'excel';

      if (format === 'excel') {
        // Generar Excel con branding
        const buffer = await this.excelExportService.generateExcel(
          reportData,
          reportData.template,
          enterpriseInfo
        );

        const fileName = `${reportData.template.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.set({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': buffer.length
        });

        res.send(buffer);
      } else if (format === 'csv') {
        // Generar CSV simple
        const csvData = this.generateCSV(reportData.data, reportData.template.configuracion.campos);
        const fileName = `${reportData.template.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

        res.set({
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${fileName}"`
        });

        res.send(csvData);
      } else {
        throw new HttpException(
          'Formato de exportación no soportado',
          HttpStatus.BAD_REQUEST
        );
      }
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al exportar el reporte',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ── Descubrimiento de campos ─────────────────────────────────────────

  @Get('collections')
  async getAvailableCollections() {
    try {
      const collections = await this.fieldDiscoveryService.getAvailableCollections();

      return {
        success: true,
        data: collections
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener las colecciones disponibles',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('fields')
  async getAvailableFields(
    @Body(ValidationPipe) queryDto: ReportFieldsQueryDto
  ) {
    try {
      const fields = await this.reportTemplateService.getAvailableFields(
        queryDto.collections
      );

      return {
        success: true,
        data: fields
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener los campos disponibles',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('collections/:name/fields')
  async getCollectionFields(
    @Param('name') collectionName: string,
    @Query() filters: any
  ) {
    try {
      const fields = await this.fieldDiscoveryService.getFilteredFields(
        collectionName,
        {
          types: filters.types ? filters.types.split(',') : undefined,
          excludePaths: filters.excludePaths ? filters.excludePaths.split(',') : undefined,
          includeNested: filters.includeNested === 'true'
        }
      );

      return {
        success: true,
        data: fields
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener los campos de la colección',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ── Métodos auxiliares ───────────────────────────────────────────────

  private generateCSV(data: any[], campos: any[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    const visibleFields = campos.filter(campo => campo.visible !== false);
    const headers = visibleFields.map(campo => campo.label);
    const csvRows = [headers.join(',')];

    data.forEach(item => {
      const row = visibleFields.map(campo => {
        const value = this.getNestedValue(item, campo.path);
        const formattedValue = this.formatCSVValue(value);
        return `"${formattedValue}"`; // Escapar con comillas
      });
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => {
      return current && typeof current === 'object' ? current[prop] : undefined;
    }, obj);
  }

  private formatCSVValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return value.toLocaleDateString('es-CO');
    }

    if (Array.isArray(value)) {
      return value.join('; ');
    }

    return String(value).replace(/"/g, '""'); // Escapar comillas dobles
  }
}