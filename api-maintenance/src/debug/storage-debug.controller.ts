import { Controller, Get, Inject } from '@nestjs/common';
import { FILE_STORAGE, type FileStorage } from '../libs/storage/storage.types';

@Controller('debug/storage')
export class StorageDebugController {
  constructor(@Inject(FILE_STORAGE) private readonly storage: FileStorage) {}

  @Get('whoami')
  whoami() {
    const ctor = (this.storage as any)?.constructor?.name || 'Unknown';
    return {
      provider: ctor,
      env: {
        STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
        MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
        MINIO_BUCKET: process.env.MINIO_BUCKET,
        MINIO_PUBLIC_URL: process.env.MINIO_PUBLIC_URL,
      },
      pid: process.pid,
      now: new Date().toISOString(),
    };
  }
}
