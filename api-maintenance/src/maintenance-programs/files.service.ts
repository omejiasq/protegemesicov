import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { existsSync, readFileSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join, basename } from 'path';
import { Model } from 'mongoose';
import { FileAsset, FileAssetDocument } from '../schema/file-asset.schema';
import * as storageTypes from '../libs/storage/storage.types';

// 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set<string>([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

type UserCtx = { enterprise_id?: string; sub?: string };

function sanitizeFilename(name: string) {
  const base = basename(name || 'file');
  return base.replace(/[^\w.\-]+/g, '_');
}

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(FileAsset.name)
    private readonly model: Model<FileAssetDocument>,
    @Inject(storageTypes.FILE_STORAGE)
    private readonly storage: storageTypes.FileStorage, // <-- inyectamos adapter
  ) {}

  private uploadDir() {
    return process.env.UPLOAD_DIR || './uploads';
  }

  async saveFile(params: {
    vigiladoId: number;
    file: Express.Multer.File;
    user?: UserCtx;
  }) {
    console.log('%capi-maintenance\src\maintenance-programs\files.service.ts:50 Entro al controller', 'color: #007acc;', );
    const file = params.file;
    console.log(
      '%capi-maintenance\src\maintenance-programs\files.service.ts:51 file',
      'color: #007acc;',
      file,
    );

    if (!file?.buffer || typeof file.size !== 'number') {
      throw new BadRequestException('Archivo inválido');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('El archivo supera los 5MB');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Tipo no permitido. Solo PDF, XLSX, PNG o JPG/JPEG',
      );
    }

    // Guardar a través del adapter (local u oracle)
    const stored = await this.storage.saveBuffer({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
      size: file.size,
    });

    // Nueva lógica de ruta: siempre resolvemos una URL/ruta válida
    const publicBase =
      process.env.MINIO_PUBLIC_URL || process.env.PUBLIC_BASE_URL || '';

    const rutaFinal =
      stored.url ??
      (stored.provider === 'local'
        ? join(this.uploadDir(), stored.key)
        : publicBase
          ? `${publicBase.replace(/\/+$/, '')}/${stored.key}`
          : undefined);

    if (!rutaFinal) {
      // Sin URL pública y no local → falta configurar MINIO_PUBLIC_URL
      throw new BadRequestException(
        'Storage sin URL pública: configure MINIO_PUBLIC_URL',
      );
    }

    const doc = await this.model.create({
      vigiladoId: params.vigiladoId,
      nombreOriginalArchivo: file.originalname,
      nombreAlmacenado: stored.key,
      ruta: rutaFinal, // ← nunca undefined
      mimeType: file.mimetype,
      size: file.size,
      enterprise_id: params.user?.enterprise_id,
      createdBy: params.user?.sub,
    });

    return {
      vigiladoId: doc.vigiladoId,
      nombreOriginalArchivo: doc.nombreOriginalArchivo,
      nombreAlmacenado: doc.nombreAlmacenado,
      ruta: doc.ruta, // en oracle será URL, en local ruta absoluta
    };
  }

  async getBase64(documento: string, ruta: string, user?: UserCtx) {
    const found = await this.model.findOne({
      nombreAlmacenado: documento,
      ruta,
      enterprise_id: user?.enterprise_id,
    });
    if (!found) throw new NotFoundException('Archivo no encontrado');

    // Recuperamos desde el adapter por key (documento)
    const { base64, mimeType } = await this.storage.getBase64(
      found.nombreAlmacenado,
    );
    return {
      base64,
      mimeType: found.mimeType || mimeType || 'application/octet-stream',
      nombreOriginalArchivo: found.nombreOriginalArchivo,
    };
  }
}
