import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { FileStorage, StoredObject } from './storage.types';

function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    (stream as Readable).on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    (stream as Readable).on('end', () => resolve(Buffer.concat(chunks)));
    (stream as Readable).on('error', reject);
  });
}

export class OracleStorage implements FileStorage {
  private client: S3Client;
  private bucket: string;
  private prefix: string;

  constructor() {
    const namespace = process.env.ORACLE_NAMESPACE as string;       // ej: axaxxxxyyzz
    const region    = process.env.ORACLE_REGION as string;          // ej: us-ashburn-1
    const endpoint  = process.env.ORACLE_S3_ENDPOINT
      || `https://${namespace}.compat.objectstorage.${region}.oraclecloud.com`;

    this.bucket = process.env.ORACLE_BUCKET as string;              // ej: protegeme-files
    this.prefix = (process.env.ORACLE_BUCKET_PREFIX || 'uploads/').replace(/^\/+|\/+$/g, '') + '/';

    const accessKeyId     = process.env.ORACLE_ACCESS_KEY_ID as string;
    const secretAccessKey = process.env.ORACLE_SECRET_ACCESS_KEY as string;

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: false,     // Oracle compat usa virtual-host por default
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private buildKey(originalName: string) {
    const safe = (originalName || 'file').replace(/[^\w.\-]+/g, '_');
    return `${this.prefix}${Date.now()}_${safe}`;
  }

  async saveBuffer(opts: { buffer: Buffer; mimeType: string; originalName: string; size?: number }): Promise<StoredObject> {
    const key = this.buildKey(opts.originalName);
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: opts.buffer,
      ContentType: opts.mimeType || 'application/octet-stream',
    }));

    // URL pública si el bucket es público; si no, queda como referencia
    const url = `${process.env.ORACLE_S3_ENDPOINT || ''}/${this.bucket}/${key}`.replace(/\/{2,}/g, '/');
    return {
      key,
      url,
      bucket: this.bucket,
      provider: 'oracle',
      mimeType: opts.mimeType,
      size: opts.size,
    };
  }

  async getBase64(key: string): Promise<{ base64: string; mimeType: string }> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const body = res.Body as Readable;
    const buf = await streamToBuffer(body);
    const mimeType = (res.ContentType as string) || 'application/octet-stream';
    return { base64: buf.toString('base64'), mimeType };
  }
}
