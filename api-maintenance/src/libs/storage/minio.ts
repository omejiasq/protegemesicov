import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { FileStorage, StoredObject } from './storage.types';

function env(name: string, fallback = '') {
  const v = process.env[name];
  return v === undefined || v === null || v === '' ? fallback : v;
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  if (Buffer.isBuffer(stream)) return stream;
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (c: Buffer) =>
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)),
    );
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export class MinioStorageAdapter implements FileStorage {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;
  private readonly publicBase: string;

  constructor() {
    const endpoint = env('MINIO_ENDPOINT', 'http://127.0.0.1:9000');
    const region = env('MINIO_REGION', 'us-east-1');
    const accessKeyId = env('MINIO_ACCESS_KEY', '');
    const secretAccessKey = env('MINIO_SECRET_KEY', '');
    this.bucket = env('MINIO_BUCKET', 'protegeme-files');
    this.prefix = env('MINIO_PREFIX', '').replace(/^\/+|\/+$/g, '');
    this.publicBase = env('MINIO_PUBLIC_URL', '').replace(/\/+$/, '');
    this.s3 = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private keyFor(name: string) {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const base = `${y}-${m}-${day}`;
    const clean = (name || 'file').replace(/[^\w.\-]+/g, '_');
    const key = `${base}/${randomUUID()}-${clean}`;
    return this.prefix ? `${this.prefix}/${key}` : key;
  }

  private async ensureBucket() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async isReady(): Promise<boolean> {
    try {
      await this['ensureBucket'](); // reutiliza tu lógica interna
      return true;
    } catch (e) {
      console.warn('[Storage][MinIO] No disponible:', (e as any)?.message || e);
      return false;
    }
  }

  async saveBuffer(params: {
    buffer: Buffer;
    mimeType: string;
    originalName: string;
    size?: number;
  }): Promise<StoredObject> {
    await this.ensureBucket();
    const Key = this.keyFor(params.originalName);
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key,
        Body: params.buffer,
        ContentType: params.mimeType || 'application/octet-stream',
      }),
    );
    const url = this.publicBase ? `${this.publicBase}/${Key}` : undefined;
    return {
      key: Key,
      url,
      bucket: this.bucket,
      provider: 'minio',
      mimeType: params.mimeType,
      size: params.size,
    };
  }

  async getBase64(key: string): Promise<{ base64: string; mimeType: string }> {
    const res = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const buf = await streamToBuffer(res.Body as any);
    const mimeType = (res.ContentType as string) || 'application/octet-stream';
    return { base64: buf.toString('base64'), mimeType };
  }
}
