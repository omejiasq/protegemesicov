import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileController } from './files.controller';
import { FileService } from './files.service';
import { StorageModule } from '../libs/storage/storage.module';
import { FileAsset, FileAssetSchema } from '../schema/file-asset.schema';
import { MaintenanceExternalApiService } from 'src/libs/external-api';
import { AuditModule } from 'src/libs/audit/audit.module';

@Module({
  imports: [StorageModule, MongooseModule.forFeature([{ name: FileAsset.name, schema: FileAssetSchema }]),
  AuditModule
],
  controllers: [FileController],
  providers: [FileService, MaintenanceExternalApiService],
  exports: [FileService],
})
export class FileModule {}