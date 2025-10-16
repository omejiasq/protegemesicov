import { Module } from '@nestjs/common';
import { StorageDebugController } from './storage-debug.controller';
import { StorageModule as LibStorageModule } from '../libs/storage/storage.module';

@Module({
  imports: [LibStorageModule],
  controllers: [StorageDebugController],
})
export class StorageDebugModule {}