import { Module } from '@nestjs/common';
import { FILE_STORAGE } from './storage.types';
import { LocalStorage } from './local.storage';
import { OracleStorage } from './oracle.storage';

@Module({
  providers: [
    {
      provide: FILE_STORAGE,
      useFactory: () => {
        const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
        if (provider === 'oracle') {
          return new OracleStorage();
        }
        return new LocalStorage();
      },
    },
  ],
  exports: [FILE_STORAGE],
})
export class StorageModule {}
