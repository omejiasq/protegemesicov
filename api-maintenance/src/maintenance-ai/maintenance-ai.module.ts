import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  WorkshopFormat,
  WorkshopFormatSchema,
} from '../schema/workshop-format.schema';
import {
  MaintenanceDocumentAnalysis,
  MaintenanceDocumentAnalysisSchema,
} from '../schema/maintenance-document-analysis.schema';

import { MaintenanceAiService } from './maintenance-ai.service';
import { MaintenanceAiController } from './maintenance-ai.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkshopFormat.name, schema: WorkshopFormatSchema },
      {
        name: MaintenanceDocumentAnalysis.name,
        schema: MaintenanceDocumentAnalysisSchema,
      },
    ]),
  ],
  controllers: [MaintenanceAiController],
  providers: [MaintenanceAiService],
  exports: [MaintenanceAiService],
})
export class MaintenanceAiModule {}
