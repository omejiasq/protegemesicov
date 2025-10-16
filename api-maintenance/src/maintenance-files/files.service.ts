import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { basename, join } from 'path';
import { FILE_STORAGE, FileStorage } from '../libs/storage/storage.types';
import { FileAsset, FileAssetDocument } from '../schema/file-asset.schema';
import * as storage_types from '../libs/storage/storage.types'

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set<string>([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

type UserCtx = { enterprise_id?: string; sub?: string, vigiladId: string };

@Injectable()
export class FileService {
  constructor(
    @InjectModel(FileAsset.name) private readonly model: Model<FileAssetDocument>,
    @Inject(FILE_STORAGE) private readonly storage: storage_types.FileStorage,
  ) {}

  private uploadDir() {
    return process.env.UPLOAD_DIR || './uploads';
  }

  private sanitize(name: string) {
    const base = basename(name || 'file');
    return base.replace(/[^\w.\-]+/g, '_');
  }

  async saveFile(params: { vigiladoId: number; file: Express.Multer.File; user?: UserCtx }) {
    const { file } = params;
    if (!file?.buffer || typeof file.size !== 'number') throw new BadRequestException('Archivo inválido');
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException('El archivo supera los 5MB');
    if (!ALLOWED_MIME.has(file.mimetype)) throw new BadRequestException('Tipo no permitido. Solo PDF, XLSX, PNG o JPG/JPEG');

    const stored = await this.storage.saveBuffer({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: this.sanitize(file.originalname),
      size: file.size,
    });

    const publicBase = process.env.MINIO_PUBLIC_URL || process.env.PUBLIC_BASE_URL || '';
    const rutaFinal =
      stored.url ??
      (stored.provider === 'local'
        ? join(this.uploadDir(), stored.key)
        : publicBase
        ? `${publicBase.replace(/\/+$/, '')}/${stored.key}`
        : undefined);

    if (!rutaFinal) throw new BadRequestException('Storage sin URL pública: configure MINIO_PUBLIC_URL');
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

    return {
      vigiladoId: doc.vigiladoId,
      nombreOriginalArchivo: doc.nombreOriginalArchivo,
      nombreAlmacenado: doc.nombreAlmacenado,
      ruta: doc.ruta,
    };
  }

  async getBase64(documento: string, ruta: string, user?: UserCtx) {
    if (!documento || !ruta) throw new BadRequestException('Faltan parámetros');
    const found = await this.model.findOne({
      nombreAlmacenado: documento,
      ruta,
      enterprise_id: user?.enterprise_id,
    });
    if (!found) throw new NotFoundException('Archivo no encontrado');
    const { base64, mimeType } = await this.storage.getBase64(found.nombreAlmacenado);
    return {
      base64,
      mimeType: found.mimeType || mimeType || 'application/octet-stream',
      nombreOriginalArchivo: found.nombreOriginalArchivo,
    };
  }
}