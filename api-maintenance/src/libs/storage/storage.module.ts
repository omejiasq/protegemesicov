import { Module } from '@nestjs/common';
import { MinioStorageAdapter } from './minio';
import { LocalStorage } from './local.storage';

import { FILE_STORAGE } from './storage.types'; 

@Module({
  providers: [
    {
      provide: FILE_STORAGE,
      useFactory: () => {
        const p = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
        if (p === 'minio') return new MinioStorageAdapter();
        return new LocalStorage();                 // ← fallback correcto
      },
    },
  ],
  exports: [FILE_STORAGE],
})
export class StorageModule {}