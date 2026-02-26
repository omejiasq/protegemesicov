import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { basename } from 'path';
import { FILE_STORAGE, FileStorage } from '../libs/storage/storage.types';
import { FileAsset, FileAssetDocument } from '../schema/file-asset.schema';
import * as storage_types from '../libs/storage/storage.types';
import { MaintenanceExternalApiService } from 'src/libs/external-api';
import { Readable } from 'stream';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set<string>([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

type UserCtx = { enterprise_id?: string; sub?: string; vigiladId: string };

@Injectable()
export class FileService {
  constructor(
    @InjectModel(FileAsset.name)
    private readonly model: Model<FileAssetDocument>,
    @Inject(FILE_STORAGE) private readonly storage: storage_types.FileStorage,
    private readonly external: MaintenanceExternalApiService,
  ) {}

  private sanitize(name: string) {
    const base = basename(name || 'file');
    return base.replace(/[^\w.\-]+/g, '_');
  }

  // ======================================================
  // SAVE FILE
  // ======================================================
  async saveFile(params: {
    vigiladoId: number;
    file: Express.Multer.File;
    user?: UserCtx;
  }) {
    const { file } = params;
    if (!file?.buffer || typeof file.size !== 'number')
      throw new BadRequestException('Archivo inválido');
    if (file.size > MAX_FILE_SIZE)
      throw new BadRequestException('El archivo supera los 5MB');
    if (!ALLOWED_MIME.has(file.mimetype))
      throw new BadRequestException(
        'Tipo no permitido. Solo PDF, XLSX, PNG o JPG/JPEG',
      );

    const stored = await this.storage.saveBuffer({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: this.sanitize(file.originalname),
      size: file.size,
    });

    const publicBase = (
      process.env.MINIO_PUBLIC_URL ||
      process.env.PUBLIC_BASE_URL ||
      ''
    ).replace(/\/+$/, '');

    if (!publicBase) {
      throw new BadRequestException(
        'Storage sin URL pública: configure MINIO_PUBLIC_URL en .env',
      );
    }

    const rutaFinal = `${publicBase}/${stored.key}`;

    const doc = await this.model.create({
      vigiladoId: params.user?.vigiladId,
      nombreOriginalArchivo: file.originalname,
      nombreAlmacenado: stored.key,
      ruta: rutaFinal,
      mimeType: file.mimetype,
      size: file.size,
      enterprise_id: params.user?.enterprise_id,
      createdBy: params.user?.sub,
    });

    try {
      const vig = String(params.user?.vigiladId || params.vigiladoId || '');
      if (vig) {
        await this.external.guardarArchivo({
          buffer: file.buffer,
          filename: file.originalname,
          mimetype: file.mimetype,
          vigiladoId: vig,
        });
      }
    } catch (e) {
      // no romper flujo local
    }

    return {
      vigiladoId: doc.vigiladoId,
      nombreOriginalArchivo: doc.nombreOriginalArchivo,
      nombreAlmacenado: doc.nombreAlmacenado,
      ruta: doc.ruta,
    };
  }

  // ======================================================
  // GET BASE64
  // ======================================================
  async getBase64(documento: string, ruta: string, user?: UserCtx) {
    if (!documento || !ruta) throw new BadRequestException('Faltan parámetros');
    const found = await this.model.findOne({
      nombreAlmacenado: documento,
      ruta,
      enterprise_id: user?.enterprise_id,
    });
    if (!found) throw new NotFoundException('Archivo no encontrado');
    const { base64, mimeType } = await this.storage.getBase64(
      found.nombreAlmacenado,
    );
    return {
      base64,
      mimeType: found.mimeType || mimeType || 'application/octet-stream',
      nombreOriginalArchivo: found.nombreOriginalArchivo,
    };
  }

  // ======================================================
  // GET FILE STREAM (para proxy seguro de imágenes)
  // ======================================================
  async getFileStream(key: string): Promise<{ stream: Readable; mimeType: string }> {
    try {
      // Opción A: si storage tiene método getStream
      if (typeof (this.storage as any).getStream === 'function') {
        const stream = await (this.storage as any).getStream(key);
        const mimeType = this.guessMimeType(key);
        return { stream, mimeType };
      }

      // Opción B: fallback usando getBase64 y convirtiendo a stream
      const { base64, mimeType } = await this.storage.getBase64(key);
      const buffer = Buffer.from(base64, 'base64');
      const stream = Readable.from(buffer);
      return { stream, mimeType: mimeType || this.guessMimeType(key) };

    } catch (e) {
      throw new NotFoundException('Archivo no encontrado');
    }
  }

  // ======================================================
  // GET FILE STREAM BY FULL URL
  // Extrae la key de MinIO desde la URL completa guardada en BD
  // Ejemplo: "http://23.227.173.137:9000/protegeme-files/2026-02-25/archivo.jpg"
  //          → key: "2026-02-25/archivo.jpg"
  // ======================================================
  async getFileStreamByUrl(url: string): Promise<{ stream: Readable; mimeType: string }> {
    const bucket = process.env.MINIO_BUCKET || 'protegeme-files';

    // Extraer la key quitando todo hasta el nombre del bucket
    const marker = `/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) {
      throw new NotFoundException('URL de archivo no válida');
    }

    const key = url.substring(idx + marker.length);
    return this.getFileStream(key);
  }

  // ======================================================
  // HELPER: adivinar mimetype por extensión
  // ======================================================
  private guessMimeType(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      pdf: 'application/pdf',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return map[ext || ''] || 'application/octet-stream';
  }
}