import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  BadRequestException,
  UseFilters,
} from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { memoryStorage } from 'multer';
import { MulterExceptionFilter } from './multer-filters';

class UploadDto {
  @Type(() => Number) @IsInt() @IsNotEmpty() vigiladoId!: number;
}

// 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Tipos permitidos: pdf, xlsx, png, jpg/jpeg
// MIME exactos: application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, image/png, image/jpeg
const FILETYPE_REGEX = new RegExp(
  '^(application/pdf|application/vnd\\.openxmlformats-officedocument\\.spreadsheetml\\.sheet|image/(png|jpeg|jpg))$',
  'i',
);

@UseGuards(JwtAuthGuard)
@UseFilters(new MulterExceptionFilter())
@Controller('files')
export class FilesController {
  constructor(private readonly svc: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage() }))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const user = req.user;
    if (!user?.vigiladoId) {
      throw new BadRequestException('El usuario no tiene vigiladoId');
    }
    if (!file) {
      throw new BadRequestException(
        'Se esperaba el campo de archivo "archivo" en form-data',
      );
    }
    console.log('[files/upload] recibido:', {
      size: file.size,
      mime: file.mimetype,
      name: file.originalname,
      vigiladoId: user.vigiladoId,
    });
    return this.svc.saveFile({
      vigiladoId: Number(user.vigiladoId),
      file,
      user,
    });
  }

  
  @Post('upload/echo')
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage() }))
  echo(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return {
      got: !!file,
      name: file?.originalname,
      size: file?.size,
      mime: file?.mimetype,
      user: { sub: req.user?.sub, vigiladoId: req.user?.vigiladoId },
    };
  }

  @Get('base64')
  getBase64(
    @Query('documento') documento: string,
    @Query('ruta') ruta: string,
    @Req() req: any,
  ) {
    return this.svc.getBase64(documento, ruta, req.user);
  }

}
