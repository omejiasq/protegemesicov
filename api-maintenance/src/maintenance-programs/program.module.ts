import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { FileAsset, FileAssetSchema } from '../schema/file-asset.schema';
import { ProgramFile, ProgramFileSchema } from '../schema/program-file.schema';

import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { ProgramsController } from './program.controller';
import { ProgramsService } from './program.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FileAsset.name, schema: FileAssetSchema },
      { name: ProgramFile.name, schema: ProgramFileSchema },
    ]),
  ],
  controllers: [FilesController, ProgramsController],
  providers: [FilesService, ProgramsService],
  exports: [FilesService, ProgramsService],
})
export class ProgramsModule {}