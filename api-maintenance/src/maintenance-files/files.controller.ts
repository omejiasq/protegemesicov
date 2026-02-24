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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { FileService } from './files.service';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const FILETYPE_REGEX = /^(application\/pdf|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|image\/(png|jpe?g))$/i;

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FileController {
  constructor(private readonly svc: FileService) {}

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
    const vigiladoId = req.user?.vigiladoId
    //return this.svc.saveFile({ vigiladoId: Number(vigiladoId), file, user: req.user });
    return this.svc.saveFile({ 
      vigiladoId: Number(vigiladoId) || 0,  // ← fallback a 0 si es NaN
      file, 
      user: req.user 
    });
  }

  @Get('base64')
  async getBase64(@Query('documento') documento: string, @Query('ruta') ruta: string, @Req() req: any) {
    return this.svc.getBase64(documento, ruta, req.user);
  }
}