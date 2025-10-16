import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import crypto from 'crypto';

export interface SaveBufferInput {
  buffer: Buffer; mimeType: string; originalName: string; size: number;
}
export interface SaveBufferOutput {
  key: string; url?: string; provider: 'minio'; bucket: string;
}

export class MinioStorageAdapter {
  private s3: S3Client;
  private bucket = process.env.MINIO_BUCKET!;
  private publicBase = process.env.MINIO_PUBLIC_URL;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.MINIO_REGION || 'us-east-1',
      endpoint: process.env.MINIO_ENDPOINT!,
      forcePathStyle: true, // MinIO
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY!,
        secretAccessKey: process.env.MINIO_SECRET_KEY!,
      },
    });
  }

  private makeKey(originalName: string) {
    const ext = (originalName.split('.').pop() || '').toLowerCase();
    const id = crypto.randomUUID();
    const date = new Date().toISOString().slice(0, 10);
    return `${date}/${id}.${ext}`;
  }

  async saveBuffer(input: SaveBufferInput): Promise<SaveBufferOutput> {
    const key = this.makeKey(input.originalName);
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket, Key: key, Body: input.buffer, ContentType: input.mimeType,
    }));
    const url = this.publicBase ? `${this.publicBase}/${key}` : undefined;
    return { key, url, provider: 'minio', bucket: this.bucket };
  }

  async getBase64(key: string): Promise<{ base64: string; mimeType?: string }> {
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const buf = await streamToBuffer(res.Body as Readable);
    return { base64: buf.toString('base64'), mimeType: res.ContentType };
  }

  async getPresignedUrl(key: string, ttlSec = 300) {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: ttlSec });
  }
}

function streamToBuffer(stream: Readable) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', c => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
