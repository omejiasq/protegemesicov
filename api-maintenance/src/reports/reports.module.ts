import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { DynamicReportsService } from './services/dynamic-reports.service';
import { ExportService } from './services/export.service';
import { EnterpriseService } from './services/enterprise.service';
import { ReportTemplateService } from './services/report-template.service';

// Importar esquemas necesarios
import { EnlistmentDetail, EnlistmentDetailSchema } from '../schema/enlistment-schema';
import { EnlistmentItemResult, EnlistmentItemResultSchema } from '../schema/enlistment_item_result.schema';
import { ReportTemplate, ReportTemplateSchema } from './schemas/report-template.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EnlistmentDetail.name, schema: EnlistmentDetailSchema },
      { name: EnlistmentItemResult.name, schema: EnlistmentItemResultSchema },
      { name: ReportTemplate.name, schema: ReportTemplateSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [
    DynamicReportsService,
    ExportService,
    EnterpriseService,
    ReportTemplateService,
  ],
  exports: [DynamicReportsService, ExportService, EnterpriseService, ReportTemplateService],
})
export class ReportsModule {}