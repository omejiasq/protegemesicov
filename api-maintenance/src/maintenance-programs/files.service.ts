import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { existsSync, readFileSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { Model } from 'mongoose';
import { FileAsset, FileAssetDocument } from '../schema/file-asset.schema';

type UserCtx = { enterprise_id?: string; sub?: string };

@Injectable()
export class FilesService {
  constructor(@InjectModel(FileAsset.name) private readonly model: Model<FileAssetDocument>) {}

  private uploadDir() { return process.env.UPLOAD_DIR || './uploads'; }

  async saveFile(params: { vigiladoId: number; file: Express.Multer.File; user?: UserCtx }) {
    const baseDir = this.uploadDir();
    if (!existsSync(baseDir)) await mkdir(baseDir, { recursive: true });

    const nombreAlmacenado = `${Date.now()}_${params.file.originalname}`;
    const ruta = join(baseDir, nombreAlmacenado);

    await writeFile(ruta, params.file.buffer);

    const doc = await this.model.create({
      vigiladoId: params.vigiladoId,
      nombreOriginalArchivo: params.file.originalname,
      nombreAlmacenado,
      ruta,
      mimeType: params.file.mimetype,
      size: params.file.size,
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
    const found = await this.model.findOne({ nombreAlmacenado: documento, ruta, enterprise_id: user?.enterprise_id });
    if (!found) throw new NotFoundException('Archivo no encontrado');

    if (!existsSync(ruta)) throw new NotFoundException('Archivo no disponible en almacenamiento');
    const buf = readFileSync(ruta);
    return { base64: buf.toString('base64'), mimeType: found.mimeType, nombreOriginalArchivo: found.nombreOriginalArchivo };
  }
}