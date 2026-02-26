import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { FileService } from './files.service';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const FILETYPE_REGEX =
  /^(application\/pdf|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|image\/(png|jpe?g))$/i;

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FileController {
  constructor(private readonly svc: FileService) {}

  // ======================================================
  // UPLOAD
  // ======================================================
  @Post('upload')
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage() }))
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: FILETYPE_REGEX }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: any,
    @Req() req: any,
  ) {
    const vigiladoId = req.user?.vigiladoId;
    return this.svc.saveFile({
      vigiladoId: Number(vigiladoId) || 0,
      file,
      user: req.user,
    });
  }

  // ======================================================
  // GET BASE64
  // ======================================================
  @Get('base64')
  async getBase64(
    @Query('documento') documento: string,
    @Query('ruta') ruta: string,
    @Req() req: any,
  ) {
    return this.svc.getBase64(documento, ruta, req.user);
  }

  // ======================================================
  // PROXY SEGURO DE IMÁGENES — por año/filename
  // GET /maintenance/files/view/2026-02-25/archivo.jpg
  // Requiere JWT — el bucket puede ser privado
  // ======================================================
  @Get('view/:year/:filename')
  async viewFile(
    @Param('year') year: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const key = `${year}/${filename}`;
    const { stream, mimeType } = await this.svc.getFileStream(key);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${filename}"`,
    );

    stream.pipe(res);
  }

  // ======================================================
  // PROXY SEGURO DE IMÁGENES — por URL completa de MinIO
  // GET /maintenance/files/proxy?url=http://minio:9000/bucket/2026-02-25/archivo.jpg
  // Útil cuando la BD guarda la URL completa de MinIO
  // ======================================================
  @Get('proxy')
  async proxyFile(
    @Query('url') url: string,
    @Res() res: Response,
  ) {
    if (!url) throw new BadRequestException('Parámetro url requerido');

    const { stream, mimeType } = await this.svc.getFileStreamByUrl(url);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    stream.pipe(res);
  }
}