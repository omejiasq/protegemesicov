// src/reports/services/excel-export.service.ts
import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ReportTemplate } from '../schemas/report-template.schema';

@Injectable()
export class ExcelExportService {
  async generateExcel(
    reportData: any,
    template: ReportTemplate,
    enterpriseInfo?: any
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(template.nombre);

    // Configurar metadata del archivo
    workbook.creator = 'ProtegeMe SICOV';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastPrinted = new Date();

    // Configurar tema de colores basado en branding
    const branding = template.branding || {} as any;
    const primaryColor = branding.headerColor || '#2563EB';
    const textColor = branding.textColor || '#1F2937';

    // Configurar estilos
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor.replace('#', '') } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    const dataStyle = {
      font: { color: { argb: textColor.replace('#', '') }, size: 11 },
      alignment: { horizontal: 'left', vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: 'E5E7EB' } },
        left: { style: 'thin', color: { argb: 'E5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
        right: { style: 'thin', color: { argb: 'E5E7EB' } }
      }
    };

    let currentRow = 1;

    // Header de la empresa si está habilitado
    if (branding.includeHeader !== false) {
      currentRow = await this.addEnterpriseHeader(
        worksheet,
        enterpriseInfo,
        template,
        currentRow
      );
    }

    // Título del reporte
    const titleRow = worksheet.getRow(currentRow);
    titleRow.getCell(1).value = branding.customTitle || template.nombre;
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: textColor.replace('#', '') } };
    titleRow.height = 25;
    currentRow += 2;

    // Información del reporte
    const infoData = [
      ['Descripción:', template.descripcion || 'N/A'],
      ['Categoría:', this.formatCategoria(template.categoria)],
      ['Generado:', new Date().toLocaleString('es-CO')],
      ['Total de registros:', reportData.data?.length || 0]
    ];

    infoData.forEach(([label, value]) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = label;
      row.getCell(1).font = { bold: true };
      row.getCell(2).value = value;
      currentRow++;
    });

    currentRow += 2;

    // Datos del reporte
    if (reportData.data && reportData.data.length > 0) {
      currentRow = this.addReportData(
        worksheet,
        reportData.data,
        template.configuracion.campos,
        headerStyle,
        dataStyle,
        currentRow
      );
    } else {
      worksheet.getCell(currentRow, 1).value = 'No hay datos para mostrar';
      worksheet.getCell(currentRow, 1).font = { italic: true, color: { argb: '6B7280' } };
      currentRow += 2;
    }

    // Resumen estadístico si hay agregaciones
    if (this.hasAggregations(template.configuracion.campos)) {
      currentRow = this.addStatisticalSummary(
        worksheet,
        reportData.data,
        template.configuracion.campos,
        headerStyle,
        dataStyle,
        currentRow
      );
    }

    // Footer con información adicional
    currentRow += 2;
    const footerRow = worksheet.getRow(currentRow);
    footerRow.getCell(1).value = 'Generado por ProtegeMe SICOV - Sistema de Control y Vigilancia';
    footerRow.getCell(1).font = { italic: true, size: 9, color: { argb: '9CA3AF' } };

    // Ajustar anchos de columnas automáticamente
    this.autoFitColumns(worksheet, template.configuracion.campos);

    // Exportar como buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async addEnterpriseHeader(
    worksheet: ExcelJS.Worksheet,
    enterpriseInfo: any,
    template: ReportTemplate,
    startRow: number
  ): Promise<number> {
    let currentRow = startRow;

    if (enterpriseInfo) {
      // Nombre de la empresa
      const companyRow = worksheet.getRow(currentRow);
      companyRow.getCell(1).value = enterpriseInfo.razonSocial || enterpriseInfo.nombre || 'Empresa';
      companyRow.getCell(1).font = { bold: true, size: 14 };
      currentRow++;

      // NIT
      if (enterpriseInfo.nit || enterpriseInfo.vigiladoId) {
        const nitRow = worksheet.getRow(currentRow);
        nitRow.getCell(1).value = `NIT: ${enterpriseInfo.nit || enterpriseInfo.vigiladoId}`;
        nitRow.getCell(1).font = { size: 11 };
        currentRow++;
      }

      // Dirección y teléfono si están disponibles
      if (enterpriseInfo.direccion) {
        const addressRow = worksheet.getRow(currentRow);
        addressRow.getCell(1).value = `Dirección: ${enterpriseInfo.direccion}`;
        addressRow.getCell(1).font = { size: 10 };
        currentRow++;
      }

      if (enterpriseInfo.telefono) {
        const phoneRow = worksheet.getRow(currentRow);
        phoneRow.getCell(1).value = `Teléfono: ${enterpriseInfo.telefono}`;
        phoneRow.getCell(1).font = { size: 10 };
        currentRow++;
      }

      currentRow += 2; // Espacio después del header
    }

    return currentRow;
  }

  private addReportData(
    worksheet: ExcelJS.Worksheet,
    data: any[],
    campos: any[],
    headerStyle: any,
    dataStyle: any,
    startRow: number
  ): number {
    let currentRow = startRow;

    // Headers de columnas
    const headerRow = worksheet.getRow(currentRow);
    campos.forEach((campo, index) => {
      if (campo.visible !== false) {
        const cell = headerRow.getCell(index + 1);
        cell.value = campo.label;
        cell.style = headerStyle as any;
      }
    });
    headerRow.height = 20;
    currentRow++;

    // Datos
    data.forEach((item) => {
      const dataRow = worksheet.getRow(currentRow);
      campos.forEach((campo, index) => {
        if (campo.visible !== false) {
          const cell = dataRow.getCell(index + 1);
          const value = this.getNestedValue(item, campo.path);
          cell.value = this.formatCellValue(value, campo);
          cell.style = dataStyle as any;
        }
      });
      currentRow++;
    });

    return currentRow + 1;
  }

  private addStatisticalSummary(
    worksheet: ExcelJS.Worksheet,
    data: any[],
    campos: any[],
    headerStyle: any,
    dataStyle: any,
    startRow: number
  ): number {
    let currentRow = startRow;

    // Título de la sección
    const titleRow = worksheet.getRow(currentRow);
    titleRow.getCell(1).value = 'Resumen Estadístico';
    titleRow.getCell(1).font = { bold: true, size: 14 };
    currentRow += 2;

    const numericalFields = campos.filter(campo =>
      campo.type === 'number' && campo.visible !== false && campo.aggregation
    );

    if (numericalFields.length > 0) {
      // Headers
      const headerRow = worksheet.getRow(currentRow);
      headerRow.getCell(1).value = 'Campo';
      headerRow.getCell(2).value = 'Total';
      headerRow.getCell(3).value = 'Promedio';
      headerRow.getCell(4).value = 'Mínimo';
      headerRow.getCell(5).value = 'Máximo';

      [1, 2, 3, 4, 5].forEach(col => {
        headerRow.getCell(col).style = headerStyle as any;
      });
      currentRow++;

      // Cálculos estadísticos
      numericalFields.forEach(campo => {
        const values = data
          .map(item => this.getNestedValue(item, campo.path))
          .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
          .map(val => Number(val));

        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          const avg = sum / values.length;
          const min = Math.min(...values);
          const max = Math.max(...values);

          const row = worksheet.getRow(currentRow);
          row.getCell(1).value = campo.label;
          row.getCell(2).value = sum;
          row.getCell(3).value = Number(avg.toFixed(2));
          row.getCell(4).value = min;
          row.getCell(5).value = max;

          [1, 2, 3, 4, 5].forEach(col => {
            row.getCell(col).style = dataStyle as any;
          });

          currentRow++;
        }
      });
    }

    return currentRow + 1;
  }

  private autoFitColumns(worksheet: ExcelJS.Worksheet, campos: any[]): void {
    campos.forEach((campo, index) => {
      if (campo.visible !== false) {
        const column = worksheet.getColumn(index + 1);
        const labelLength = campo.label.length;
        const minWidth = Math.max(labelLength + 2, 15);
        const maxWidth = 50;
        column.width = Math.min(minWidth, maxWidth);
      }
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => {
      return current && typeof current === 'object' ? current[prop] : undefined;
    }, obj);
  }

  private formatCellValue(value: any, campo: any): any {
    if (value === null || value === undefined) {
      return '';
    }

    switch (campo.type) {
      case 'date':
        return value instanceof Date ? value.toLocaleDateString('es-CO') : new Date(value).toLocaleDateString('es-CO');

      case 'number':
        const num = Number(value);
        if (isNaN(num)) return value;

        if (campo.format === 'currency') {
          return num.toLocaleString('es-CO', { style: 'currency', currency: 'COP' });
        } else if (campo.format === 'percentage') {
          return `${(num * 100).toFixed(2)}%`;
        } else {
          return num.toLocaleString('es-CO');
        }

      case 'boolean':
        return value ? 'Sí' : 'No';

      case 'array':
        return Array.isArray(value) ? value.join(', ') : value;

      case 'enum':
        return this.formatEnumValue(value, campo);

      default:
        return String(value);
    }
  }

  private formatEnumValue(value: any, campo: any): string {
    const enumTranslations: Record<string, Record<string, string>> = {
      'estado': {
        'pendiente': 'Pendiente',
        'en_ruta': 'En Ruta',
        'completado': 'Completado',
        'cancelado': 'Cancelado'
      },
      'categoria': {
        'operacional': 'Operacional',
        'gerencial': 'Gerencial',
        'regulatorio': 'Regulatorio',
        'personalizado': 'Personalizado'
      },
      'sync_status': {
        'pending': 'Pendiente',
        'synced': 'Sincronizado',
        'failed': 'Error'
      }
    };

    const fieldTranslations = enumTranslations[campo.path] || {};
    return fieldTranslations[value] || value;
  }

  private formatCategoria(categoria: string): string {
    const categorias: Record<string, string> = {
      'operacional': 'Operacional',
      'gerencial': 'Gerencial',
      'regulatorio': 'Regulatorio',
      'personalizado': 'Personalizado'
    };

    return categorias[categoria] || categoria;
  }

  private hasAggregations(campos: any[]): boolean {
    return campos.some(campo => campo.aggregation && campo.type === 'number');
  }
}