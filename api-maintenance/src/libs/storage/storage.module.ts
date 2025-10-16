import { Module } from '@nestjs/common';
import { MinioStorageAdapter } from './minio';
import { LocalStorage } from './local.storage';
import { FILE_STORAGE } from './storage.types';

@Module({
  providers: [{
    provide: FILE_STORAGE,
    useFactory: () => {
      const p = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
      const inst = p === 'minio' ? new MinioStorageAdapter() : new LocalStorage();
      console.log('[Storage]', { pid: process.pid, provider: inst.constructor.name });
      return inst;
    },
  }],
  exports: [FILE_STORAGE],
})
export class StorageModule {}