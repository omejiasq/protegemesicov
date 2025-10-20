import { Module } from '@nestjs/common';
import { MinioStorageAdapter } from './minio';
import { LocalStorage } from './local.storage';
import { FILE_STORAGE } from './storage.types';

@Module({
  providers: [{
    provide: FILE_STORAGE,
    useFactory: async () => {
      const local = new LocalStorage();

      // Heurística: si piden explícitamente minio o hay credenciales, probamos
      const wantsMinio =
        (process.env.STORAGE_PROVIDER || '').toLowerCase() === 'minio' ||
        !!(process.env.MINIO_ENDPOINT && process.env.MINIO_ACCESS_KEY && process.env.MINIO_SECRET_KEY);

      if (wantsMinio) {
        try {
          const minio = new MinioStorageAdapter();
          if (await minio.isReady()) {
            console.log('[Storage] Provider: MinIO');
            return minio;
          }
          console.warn('[Storage] MinIO no disponible; fallback a Local');
        } catch (e) {
          console.warn('[Storage] Error inicializando MinIO; fallback a Local', e);
        }
      }

      console.log('[Storage] Provider: Local');
      return local;
    },
  }],
  exports: [FILE_STORAGE],
})
export class StorageModule {}