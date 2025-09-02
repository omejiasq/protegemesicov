import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Body, Get, Query, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class UploadDto {
  @Type(() => Number) @IsInt() @IsNotEmpty() vigiladoId!: number;
}

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly svc: FilesService) {}

  // POST /files/upload  (form-data: archivo=<file>, vigiladoId=<number>)
  @Post('upload')
  @UseInterceptors(FileInterceptor('archivo'))
  upload(@UploadedFile() file: Express.Multer.File, @Body() dto: UploadDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.saveFile({ vigiladoId: dto.vigiladoId, file, user });
  }

  // GET /files/base64?documento=&ruta=
  @Get('base64')
  getBase64(@Query('documento') documento: string, @Query('ruta') ruta: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.getBase64(documento, ruta, user);
  }
}