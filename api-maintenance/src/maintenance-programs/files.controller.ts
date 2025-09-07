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
} from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { memoryStorage } from 'multer';

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
@Controller('files')
export class FilesController {
  constructor(private readonly svc: FilesService) {}

  // POST /files/upload  (form-data: archivo=<file>, vigiladoId=<number>)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: memoryStorage(), // necesitamos buffer en memoria
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: FILETYPE_REGEX }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.svc.saveFile({ vigiladoId: dto.vigiladoId, file, user });
  }

  // GET /files/base64?documento=&ruta=
  @Get('base64')
  getBase64(
    @Query('documento') documento: string,
    @Query('ruta') ruta: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.svc.getBase64(documento, ruta, user);
  }
}
