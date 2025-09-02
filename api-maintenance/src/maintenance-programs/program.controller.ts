import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { ProgramsService } from './program.service';
import { IsInt, IsIn, IsNotEmpty, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class SaveProgramDto {
  @Type(() => Number) @IsIn([1,2,3]) tipoId!: 1|2|3; // 1=preventivo, 2=correctivo, 3=alistamiento
  @IsString() @IsNotEmpty() documento!: string;      // nombreAlmacenado (de /files/upload)
  @IsString() @IsNotEmpty() nombreOriginal!: string; // nombreOriginalArchivo
  @IsString() @IsNotEmpty() ruta!: string;
  @Type(() => Number) @IsInt() vigiladoId!: number;
}

class ListProgramsQuery {
  @Type(() => Number) @IsIn([1,2,3]) tipoId?: 1|2|3;
  @Type(() => Number) vigiladoId?: number;
}

@UseGuards(JwtAuthGuard)
@Controller('programs')
export class ProgramsController {
  constructor(private readonly svc: ProgramsService) {}

  @Post()
  save(@Body() dto: SaveProgramDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.save(dto, user);
  }

  @Get()
  list(@Query() q: ListProgramsQuery, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.list(q, user);
  }
}