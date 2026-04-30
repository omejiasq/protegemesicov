// src/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportTemplateService } from './services/report-template.service';
import { ExcelExportService } from './services/excel-export.service';
import { FieldDiscoveryService } from './services/field-discovery.service';
import { ReportTemplate, ReportTemplateSchema } from './schemas/report-template.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReportTemplate.name, schema: ReportTemplateSchema }
    ])
  ],
  controllers: [ReportsController],
  providers: [
    ReportTemplateService,
    ExcelExportService,
    FieldDiscoveryService
  ],
  exports: [
    ReportTemplateService,
    ExcelExportService,
    FieldDiscoveryService
  ]
})
export class ReportsModule {}