import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { FileAsset, FileAssetSchema } from '../schema/file-asset.schema';
import { ProgramFile, ProgramFileSchema } from '../schema/program-file.schema';

import { ProgramsController } from './program.controller';
import { ProgramsService } from './program.service';
import { StorageModule } from 'src/libs/storage/storage.module';

import { MaintenanceExternalApiService } from 'src/libs/external-api';
import { AuditModule } from 'src/libs/audit/audit.module'; 

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FileAsset.name, schema: FileAssetSchema },
      { name: ProgramFile.name, schema: ProgramFileSchema },
    ]),
    StorageModule,
    AuditModule, // <-- necesario para external-api.ts
  ],
  controllers: [ProgramsController],
  providers: [ProgramsService, MaintenanceExternalApiService],
  exports: [ProgramsService],
})
export class ProgramsModule {}
