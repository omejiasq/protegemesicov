import { existsSync } from 'fs';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { basename, join } from 'path';
import { FileStorage, StoredObject } from './storage.types';

function sanitizeFilename(name: string) {
  const base = basename(name || 'file');
  return base.replace(/[^\w.\-]+/g, '_');
}

export class LocalStorage implements FileStorage {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.env.UPLOAD_DIR || './uploads';
  }

  private async ensureDir() {
    if (!existsSync(this.baseDir)) {
      await mkdir(this.baseDir, { recursive: true });
    }
  }

  private buildKey(originalName: string) {
    const safe = sanitizeFilename(originalName);
    return `${Date.now()}_${safe}`;
  }

  async saveBuffer(opts: { buffer: Buffer; mimeType: string; originalName: string; size?: number; }): Promise<StoredObject> {
    await this.ensureDir();
    const key = this.buildKey(opts.originalName);
    const full = join(this.baseDir, key);
    await writeFile(full, opts.buffer);
    return {
      key,
      url: full,                  // en local guardamos la ruta absoluta
      provider: 'local',
      mimeType: opts.mimeType,
      size: opts.size,
    };
  }

  async getBase64(key: string): Promise<{ base64: string; mimeType: string }> {
    const full = join(this.baseDir, key);
    const buf = await readFile(full);
    // mimeType no está en disco; lo infiere el caller (lo guardamos en DB)
    return { base64: buf.toString('base64'), mimeType: 'application/octet-stream' };
  }
}
