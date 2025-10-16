import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileController } from './files.controller';
import { FileService } from './files.service';
import { StorageModule } from '../libs/storage/storage.module';
import { FileAsset, FileAssetSchema } from '../schema/file-asset.schema';

@Module({
  imports: [StorageModule, MongooseModule.forFeature([{ name: FileAsset.name, schema: FileAssetSchema }])],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}