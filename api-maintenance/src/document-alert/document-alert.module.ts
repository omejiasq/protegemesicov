// src/document-alert/document-alert.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentAlert, DocumentAlertSchema } from './document-alert.schema';
import { DocumentAlertService } from './document-alert.service';
import { DocumentAlertController } from './document-alert.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentAlert.name, schema: DocumentAlertSchema },
    ]),
  ],
  controllers: [DocumentAlertController],
  providers: [DocumentAlertService],
  exports: [DocumentAlertService],
})
export class DocumentAlertModule {}
