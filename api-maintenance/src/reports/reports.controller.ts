import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { DynamicReportsService } from './services/dynamic-reports.service';
import { ExportService } from './services/export.service';
import { EnterpriseService } from './services/enterprise.service';
import { ReportTemplateService } from './services/report-template.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import {
  DynamicQueryDto,
  ExportQueryDto,
  DatasetResponseDto,
  QueryResultDto
} from './dto/dynamic-reports.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly dynamicReportsService: DynamicReportsService,
    private readonly exportService: ExportService,
    private readonly enterpriseService: EnterpriseService,
    private readonly templateService: ReportTemplateService,
  ) {}

  // ── Gestión de Datasets ──────────────────────────────────────────────────────────────────────────────

  /**
   * Obtiene todos los datasets disponibles
   */
  @Get('datasets')
  async getAvailableDatasets(): Promise<{ success: boolean; data: DatasetResponseDto[] }> {
    try {
      const datasets = await this.dynamicReportsService.getAvailableDatasets();

      return {
        success: true,
        data: datasets
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener los datasets disponibles',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtiene la definición de un dataset específico
   */
  @Get('datasets/alistamientos')
  async getAlistamientosDataset(): Promise<{ success: boolean; data: DatasetResponseDto }> {
    try {
      const dataset = await this.dynamicReportsService.getAlistamientosDataset();

      return {
        success: true,
        data: dataset
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener el dataset de alistamientos',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtiene la definición del dataset de mantenimientos preventivos
   */
  @Get('datasets/preventivos')
  async getPreventiveMaintenanceDataset(): Promise<{ success: boolean; data: DatasetResponseDto }> {
    try {
      const dataset = await this.dynamicReportsService.getPreventiveMaintenanceDataset();

      return {
        success: true,
        data: dataset
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener el dataset de mantenimientos preventivos',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtiene la definición del dataset de mantenimientos correctivos
   */
  @Get('datasets/correctivos')
  async getCorrectiveMaintenanceDataset(): Promise<{ success: boolean; data: DatasetResponseDto }> {
    try {
      const dataset = await this.dynamicReportsService.getCorrectiveMaintenanceDataset();

      return {
        success: true,
        data: dataset
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener el dataset de mantenimientos correctivos',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ── Consultas Dinámicas ──────────────────────────────────────────────────────────────────────────────

  /**
   * Ejecuta una consulta dinámica contra un dataset
   */
  @Post('query')
  async executeQuery(
    @Body(ValidationPipe) queryDto: DynamicQueryDto,
    @Req() req: any
  ): Promise<{ success: boolean; data: QueryResultDto; message: string }> {
    try {
      const result = await this.dynamicReportsService.executeQuery(
        queryDto,
        req.user.enterprise_id
      );

      return {
        success: true,
        data: result,
        message: `Consulta ejecutada exitosamente. ${result.totalRecords} registros encontrados.`
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al ejecutar la consulta',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Busca placas disponibles para autobúsqueda
   */
  @Get('search/placas/:dataset')
  async searchPlacas(
    @Param('dataset') dataset: string,
    @Req() req: any
  ): Promise<{ success: boolean; data: string[] }> {
    console.log(`🚗🚗🚗 [searchPlacas] ================== INICIO ==================`);
    console.log(`🚗 [searchPlacas] Dataset: ${dataset}`);
    console.log(`🚗 [searchPlacas] Enterprise ID: ${req.user?.enterprise_id}`);
    
    try {
      // Extraer el token del header Authorization
      const authHeader = req.headers.authorization;
      const token = authHeader ? authHeader.replace('Bearer ', '') : null;
      
      console.log(`🚗 [searchPlacas] Token presente: ${!!token}`);
      
      const placas = await this.dynamicReportsService.searchPlacas(
        dataset,
        req.user.enterprise_id,
        token
      );

      console.log(`✅ [searchPlacas] Retornando ${placas.length} placas`);

      return {
        success: true,
        data: placas
      };
    } catch (error) {
      console.error('❌ [searchPlacas] Error en endpoint:', error);
      console.error('❌ [searchPlacas] Error stack:', error.stack);
      throw new HttpException(
        error.message || 'Error al buscar placas',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // ── Exportación ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * Exporta los resultados de una consulta a Excel
   */
  @Post('export/excel')
  async exportToExcel(
    @Body(ValidationPipe) queryDto: ExportQueryDto,
    @Req() req: any,
    @Res() res: Response
  ) {
    try {
      // Ejecutar la consulta
      const result = await this.dynamicReportsService.executeQuery(
        queryDto,
        req.user.enterprise_id
      );

      // Obtener información de la empresa desde la colección enterprises
      const enterpriseInfo = await this.enterpriseService.getEnterpriseInfo(req.user.enterprise_id) || {
        _id: req.user.enterprise_id,
        name: 'Empresa',
        vigiladoId: 'N/A',
        logo: null
      };

      const enterpriseForExport = {
        nombre: enterpriseInfo.name,
        nit: enterpriseInfo.vigiladoId,
        logo: enterpriseInfo.logo || undefined
      };

      // Obtener el dataset correcto basado en la consulta
      const availableDatasets = await this.dynamicReportsService.getAvailableDatasets();
      const dataset = availableDatasets.find(d => d.id === queryDto.dataset) ||
                     await this.dynamicReportsService.getAlistamientosDataset();

      // Generar campos para exportación (estáticos), excluyendo dispositivo
      const staticFields = queryDto.fields
        .filter(fieldKey => fieldKey !== 'dispositivo') // Excluir la columna dispositivo
        .map(fieldKey => {
          const fieldDef = dataset.fields.find(f => f.key === fieldKey);
          return {
            key: fieldKey,
            label: fieldDef?.label || fieldKey,
            type: fieldDef?.type || 'string',
            visible: true
          };
        });

      // Agregar campos dinámicos si existen
      const dynamicFields = result.dynamicColumns ? result.dynamicColumns.map(col => ({
        key: col.key,
        label: col.label,
        type: col.type || 'string',
        visible: true
      })) : [];

      // Combinar campos estáticos y dinámicos
      const fields = [...staticFields, ...dynamicFields];

      console.log('📊 [exportToExcel] Campos para exportación:');
      console.log('   - Campos estáticos:', staticFields.length);
      console.log('   - Campos dinámicos:', dynamicFields.length);
      console.log('   - Total campos:', fields.length);

      // Opciones de exportación
      const exportOptions = {
        title: queryDto.customTitle || `Reporte de ${dataset.name}`,
        enterprise: enterpriseForExport,
        includeHeader: queryDto.includeHeader ?? true,
        includeLogo: queryDto.includeLogo ?? false,
        headerColor: queryDto.headerColor || '#FFFFFF',
        textColor: queryDto.textColor || '#000000'
      };

      // Generar Excel
      const buffer = await this.exportService.generateExcel(
        result.data,
        fields,
        exportOptions
      );

      const fileName = `alistamientos_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length
      });

      res.send(buffer);
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al exportar a Excel',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Exporta los resultados de una consulta a PDF
   */
  @Post('export/pdf')
  async exportToPDF(
    @Body(ValidationPipe) queryDto: ExportQueryDto,
    @Req() req: any,
    @Res() res: Response
  ) {
    try {
      // Ejecutar la consulta (limitada a 100 registros para PDF)
      const limitedQuery = { ...queryDto, limit: Math.min(queryDto.limit || 100, 100) };
      const result = await this.dynamicReportsService.executeQuery(
        limitedQuery,
        req.user.enterprise_id
      );

      // Obtener información de la empresa desde la colección enterprises
      const enterpriseInfo = await this.enterpriseService.getEnterpriseInfo(req.user.enterprise_id) || {
        _id: req.user.enterprise_id,
        name: 'Empresa',
        vigiladoId: 'N/A',
        logo: null
      };

      const enterpriseForExport = {
        nombre: enterpriseInfo.name,
        nit: enterpriseInfo.vigiladoId,
        logo: enterpriseInfo.logo || undefined
      };

      // Obtener el dataset correcto basado en la consulta
      const availableDatasets = await this.dynamicReportsService.getAvailableDatasets();
      const dataset = availableDatasets.find(d => d.id === queryDto.dataset) ||
                     await this.dynamicReportsService.getAlistamientosDataset();

      // Generar campos para exportación (estáticos), excluyendo dispositivo
      const staticFields = queryDto.fields
        .filter(fieldKey => fieldKey !== 'dispositivo') // Excluir la columna dispositivo
        .map(fieldKey => {
          const fieldDef = dataset.fields.find(f => f.key === fieldKey);
          return {
            key: fieldKey,
            label: fieldDef?.label || fieldKey,
            type: fieldDef?.type || 'string',
            visible: true
          };
        });

      // Agregar campos dinámicos si existen
      const dynamicFields = result.dynamicColumns ? result.dynamicColumns.map(col => ({
        key: col.key,
        label: col.label,
        type: col.type || 'string',
        visible: true
      })) : [];

      // Combinar campos estáticos y dinámicos
      const fields = [...staticFields, ...dynamicFields];

      console.log('📊 [exportToPDF] Campos para exportación:');
      console.log('   - Campos estáticos:', staticFields.length);
      console.log('   - Campos dinámicos:', dynamicFields.length);
      console.log('   - Total campos:', fields.length);

      // Opciones de exportación (con fondo blanco y texto negro para PDF)
      const exportOptions = {
        title: queryDto.customTitle || `Reporte de ${dataset.name}`,
        enterprise: enterpriseForExport,
        includeHeader: queryDto.includeHeader ?? true,
        includeLogo: queryDto.includeLogo ?? false,
        headerColor: queryDto.headerColor || '#FFFFFF',
        textColor: queryDto.textColor || '#000000'
      };

      // Generar PDF
      const buffer = await this.exportService.generatePDF(
        result.data,
        fields,
        exportOptions
      );

      const fileName = `alistamientos_${new Date().toISOString().split('T')[0]}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length
      });

      res.send(buffer);
    } catch (error) {
      console.error('Error en exportToPDF:', error);
      throw new HttpException(
        error.message || 'Error al exportar a PDF',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ── Gestión de Plantillas ────────────────────────────────────────────────────────────────────────────

  /**
   * Crear una nueva plantilla de reporte
   */
  @Post('templates')
  async createTemplate(
    @Body(ValidationPipe) createDto: CreateTemplateDto,
    @Req() req: any
  ) {
    try {
      const template = await this.templateService.create(
        createDto,
        req.user.enterprise_id,
        req.user.sub
      );

      return {
        success: true,
        data: template,
        message: 'Plantilla creada exitosamente'
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al crear la plantilla',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Obtener todas las plantillas de la empresa
   */
  @Get('templates')
  async getTemplates(@Req() req: any) {
    try {
      const templates = await this.templateService.findByEnterprise(
        req.user.enterprise_id,
        req.user.sub
      );

      return {
        success: true,
        data: templates
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener las plantillas',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtener una plantilla específica
   */
  @Get('templates/:id')
  async getTemplate(
    @Param('id') templateId: string,
    @Req() req: any
  ) {
    try {
      const template = await this.templateService.findById(
        templateId,
        req.user.enterprise_id,
        req.user.sub
      );

      return {
        success: true,
        data: template
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener la plantilla',
        HttpStatus.NOT_FOUND
      );
    }
  }

  /**
   * Actualizar una plantilla
   */
  @Put('templates/:id')
  async updateTemplate(
    @Param('id') templateId: string,
    @Body(ValidationPipe) updateDto: UpdateTemplateDto,
    @Req() req: any
  ) {
    try {
      const template = await this.templateService.update(
        templateId,
        updateDto,
        req.user.enterprise_id,
        req.user.sub
      );

      return {
        success: true,
        data: template,
        message: 'Plantilla actualizada exitosamente'
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al actualizar la plantilla',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Eliminar una plantilla
   */
  @Delete('templates/:id')
  async deleteTemplate(
    @Param('id') templateId: string,
    @Req() req: any
  ) {
    try {
      await this.templateService.remove(
        templateId,
        req.user.enterprise_id,
        req.user.sub
      );

      return {
        success: true,
        message: 'Plantilla eliminada exitosamente'
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al eliminar la plantilla',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Duplicar una plantilla
   */
  @Post('templates/:id/duplicate')
  async duplicateTemplate(
    @Param('id') templateId: string,
    @Body('newName') newName: string,
    @Req() req: any
  ) {
    try {
      const template = await this.templateService.duplicate(
        templateId,
        req.user.enterprise_id,
        req.user.sub,
        newName
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

  /**
   * Ejecutar consulta desde una plantilla
   */
  @Post('templates/:id/execute')
  async executeTemplate(
    @Param('id') templateId: string,
    @Req() req: any
  ) {
    try {
      console.log('🔧 [executeTemplate] Ejecutando template:', templateId);
      const template = await this.templateService.findById(
        templateId,
        req.user.enterprise_id,
        req.user.sub
      );

      console.log('🔧 [executeTemplate] Template encontrado:', {
        dataset: template.dataset,
        fields: template.fields,
        filters: template.filters?.length || 0,
        mode: template.mode
      });

      // Convertir la plantilla a un query DTO
      const queryDto: DynamicQueryDto = {
        dataset: template.dataset,
        fields: template.fields,
        filters: template.filters || [],
        groupBy: template.groupBy || [],
        aggregations: template.aggregations || [],
        mode: template.mode,
        limit: template.limit
      };

      console.log('🔧 [executeTemplate] Query DTO preparado:', queryDto);

      const result = await this.dynamicReportsService.executeQuery(
        queryDto,
        req.user.enterprise_id
      );

      return {
        success: true,
        data: result,
        message: `Plantilla "${template.name}" ejecutada exitosamente. ${result.totalRecords} registros encontrados.`
      };
    } catch (error) {
      console.error('❌ [executeTemplate] Error:', error.message);
      console.error('❌ [executeTemplate] Stack:', error.stack);
      throw new HttpException(
        error.message || 'Error al ejecutar la plantilla',
        HttpStatus.BAD_REQUEST
      );
    }
  }
}