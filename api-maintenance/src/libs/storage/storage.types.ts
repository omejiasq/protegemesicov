export type StorageProvider = 'local' | 'oracle' | 'minio';

export interface StoredObject {
  key: string;          // identificador del objeto (nombreAlmacenado)
  url?: string;         // URL pública o presignada (si aplica)
  bucket?: string;      // bucket contenedor (oracle)
  provider: StorageProvider;
  mimeType?: string;
  size?: number;
}

export interface FileStorage {
  saveBuffer(opts: {
    buffer: Buffer;
    mimeType: string;
    originalName: string;
    size?: number;
  }): Promise<StoredObject>;

  getBase64(key: string): Promise<{ base64: string; mimeType: string }>;
}

// Token de inyección
export const FILE_STORAGE = 'FILE_STORAGE';
