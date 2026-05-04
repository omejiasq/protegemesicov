import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

export interface ExportOptions {
  title?: string;
  enterprise?: {
    nombre: string;
    nit: string;
    logo?: string;
  };
  includeHeader?: boolean;
  includeLogo?: boolean;
  headerColor?: string;
  textColor?: string;
}

@Injectable()
export class ExportService {
  /**
   * Genera un archivo Excel con los datos del reporte
   */
  async generateExcel(data: any[], fields: any[], options: ExportOptions = {}): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    let currentRow = 1;

    // Header empresarial si está habilitado
    if (options.includeHeader && options.enterprise) {
      // Logo (si está disponible)
      if (options.includeLogo && options.enterprise.logo) {
        // Placeholder para logo - en una implementación real se cargaría la imagen
        worksheet.mergeCells('A1:B3');
        worksheet.getCell('A1').value = '[LOGO]';
        worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
      }

      // Información de la empresa
      const startCol = options.includeLogo ? 'C' : 'A';
      worksheet.getCell(`${startCol}1`).value = options.enterprise.nombre || 'Empresa';
      worksheet.getCell(`${startCol}2`).value = `NIT: ${options.enterprise.nit || 'N/A'}`;
      worksheet.getCell(`${startCol}3`).value = options.title || 'Reporte de Alistamientos';
      worksheet.getCell(`${startCol}4`).value = `Generado el: ${new Date().toLocaleDateString('es-CO')}`;

      // Estilo del header
      const headerColor = options.headerColor || '#2563EB';
      const textColor = options.textColor || '#FFFFFF';

      for (let i = 1; i <= 4; i++) {
        const cell = worksheet.getCell(`${startCol}${i}`);
        cell.font = {
          bold: i <= 3,
          size: i === 1 ? 16 : i === 3 ? 14 : 10,
          color: { argb: textColor.replace('#', 'FF') }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: headerColor.replace('#', 'FF') }
        };
      }

      currentRow = 6; // Espacio después del header
    }

    // Headers de la tabla
    const visibleFields = fields.filter(field => field.visible !== false);
    const headers = visibleFields.map(field => field.label || field.key);

    worksheet.addRow(headers);
    const headerRow = worksheet.getRow(currentRow);

    // Estilo de headers de columna
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF366092' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    currentRow++;

    // Datos
    data.forEach((row, index) => {
      const rowValues = visibleFields.map(field => {
        const value = this.getNestedValue(row, field.path || field.key);
        return this.formatValue(value, field.type, field.format);
      });

      worksheet.addRow(rowValues);
      const dataRow = worksheet.getRow(currentRow);

      // Estilo alternado para filas
      if (index % 2 === 0) {
        dataRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F9FA' }
          };
        });
      }

      // Bordes
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      currentRow++;
    });

    // Auto-ajustar ancho de columnas
    visibleFields.forEach((field, index) => {
      const column = worksheet.getColumn(index + 1);
      const maxLength = Math.max(
        field.label?.length || 10,
        ...data.map(row => {
          const value = this.getNestedValue(row, field.path || field.key);
          return String(value || '').length;
        }).slice(0, 50) // Solo los primeros 50 para performance
      );
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });

    // Footer con totales si aplica
    const numericFields = visibleFields.filter(field => field.type === 'number' && field.aggregation);
    if (numericFields.length > 0 && data.length > 0) {
      currentRow++;
      const totalsRow = ['TOTALES', ...Array(visibleFields.length - 1).fill('')];

      numericFields.forEach(field => {
        const fieldIndex = visibleFields.findIndex(f => f.key === field.key);
        if (fieldIndex >= 0) {
          const total = data.reduce((sum, row) => {
            const value = this.getNestedValue(row, field.path || field.key);
            return sum + (Number(value) || 0);
          }, 0);

          totalsRow[fieldIndex] = field.aggregation === 'avg'
            ? (total / data.length).toFixed(2)
            : total;
        }
      });

      worksheet.addRow(totalsRow);
      const totalRow = worksheet.getRow(currentRow);
      totalRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2E8F0' }
        };
      });
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Genera un archivo PDF con los datos del reporte
   */
  async generatePDF(data: any[], fields: any[], options: ExportOptions = {}): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        let yPosition = 50;

        // Header empresarial
        if (options.includeHeader && options.enterprise) {
          // Establecer color del texto basado en las opciones
          const textColor = options.textColor || '#000000';
          doc.fillColor(textColor);

          doc.fontSize(20).text(options.enterprise.nombre || 'Empresa', 50, yPosition);
          yPosition += 30;

          doc.fontSize(12).text(`NIT: ${options.enterprise.nit || 'N/A'}`, 50, yPosition);
          yPosition += 20;

          doc.fontSize(16).text(options.title || 'Reporte de Alistamientos', 50, yPosition);
          yPosition += 25;

          doc.fontSize(10).text(`Generado el: ${new Date().toLocaleDateString('es-CO')}`, 50, yPosition);
          yPosition += 40;
        }

        // Tabla de datos
        const visibleFields = fields.filter(field => field.visible !== false);
        const pageWidth = doc.page.width - 100; // Margen izq y der
        const colWidth = pageWidth / visibleFields.length;

        // Headers (asegurar color del texto)
        const textColor = options.textColor || '#000000';
        doc.fillColor(textColor);

        let xPosition = 50;
        visibleFields.forEach(field => {
          doc.fontSize(10).text(field.label || field.key, xPosition, yPosition, {
            width: colWidth,
            align: 'center'
          });
          xPosition += colWidth;
        });

        yPosition += 20;

        // Línea separadora (usar color del texto para la línea)
        const lineColor = options.textColor || '#000000';
        doc.strokeColor(lineColor)
           .lineWidth(1)
           .moveTo(50, yPosition)
           .lineTo(doc.page.width - 50, yPosition)
           .stroke();

        yPosition += 10;

        // Datos (primeras 50 filas para evitar PDFs muy grandes)
        const limitedData = data.slice(0, 50);
        limitedData.forEach(row => {
          if (yPosition > doc.page.height - 100) {
            doc.addPage();
            yPosition = 50;
          }

          xPosition = 50;
          visibleFields.forEach(field => {
            const value = this.getNestedValue(row, field.path || field.key);
            const formattedValue = this.formatValue(value, field.type, field.format);

            doc.fontSize(9).text(String(formattedValue || ''), xPosition, yPosition, {
              width: colWidth,
              align: field.type === 'number' ? 'right' : 'left'
            });
            xPosition += colWidth;
          });

          yPosition += 15;
        });

        // Footer
        if (data.length > 50) {
          yPosition += 20;
          doc.fontSize(10).text(
            `Mostrando las primeras 50 filas de ${data.length} registros totales`,
            50, yPosition,
            { align: 'center' }
          );
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Obtiene un valor anidado usando dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => {
      return current && typeof current === 'object' ? current[prop] : undefined;
    }, obj);
  }

  /**
   * Formatea un valor según su tipo y formato
   */
  private formatValue(value: any, type?: string, format?: string): any {
    if (value === null || value === undefined) {
      return '';
    }

    switch (type) {
      case 'date':
        if (value instanceof Date || typeof value === 'string') {
          const date = new Date(value);
          if (isNaN(date.getTime())) return value;

          switch (format) {
            case 'datetime':
              return date.toLocaleString('es-CO');
            case 'time':
              return date.toLocaleTimeString('es-CO');
            default:
              return date.toLocaleDateString('es-CO');
          }
        }
        return value;

      case 'number':
        if (typeof value === 'number') {
          switch (format) {
            case 'currency':
              return new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP'
              }).format(value);
            case 'percentage':
              return `${value.toFixed(2)}%`;
            default:
              return value.toLocaleString('es-CO');
          }
        }
        return value;

      case 'boolean':
        return value ? 'Sí' : 'No';

      default:
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return String(value);
    }
  }
}