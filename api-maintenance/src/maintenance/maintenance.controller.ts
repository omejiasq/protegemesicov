import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceExternalApiService } from 'src/libs/external-api';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

class CreateMaintenanceDto {
  @Type(() => Number) @IsIn([1, 2, 3, 4]) tipoId!: 1 | 2 | 3 | 4;
  @IsString() placa!: string;
  @IsOptional() @Type(() => Number) @IsInt() vigiladoId?: number;
}

class UpdateMaintenanceDto {
  @IsOptional() @Type(() => Number) @IsIn([1, 2, 3, 4]) tipoId?: 1 | 2 | 3 | 4;
  @IsOptional() @IsString() placa?: string;
}

class ListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) numero_items?: number = 10;
  @IsOptional() @Type(() => Number) @IsIn([1, 2, 3, 4]) tipoId?: 1 | 2 | 3 | 4;
  @IsOptional() @IsString() placa?: string;
  @IsOptional() estado?: boolean;
}

class ListPlatesQueryDto {
  @Type(() => Number) @IsIn([1, 2, 3, 4]) tipoId!: 1 | 2 | 3 | 4;
  @Type(() => Number) @IsInt() vigiladoId!: number;
}

@UseGuards(JwtAuthGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(
    private readonly svc: MaintenanceService,
    private readonly external: MaintenanceExternalApiService,
  ) {}

  // CREATE -> EXTERNAL (audita via requestWithAudit)
  @Post('create')
  async create(@Body() dto: CreateMaintenanceDto, @Req() req: any) {
    const user = (req as any).user;
    console.log('%capi-maintenance\src\maintenance\maintenance.controller.ts:56 user en controller', 'color: #007acc;', user);
    return this.external.guardarMantenimiento({
      placa: dto.placa,
      tipoId: dto.tipoId,
      vigiladoId: user.vigiladoId,
      vigiladoToken: user.vigiladoToken
    });
  }

  // Listado local (como lo tenías)
  @Get('getAll')
  list(@Query() q: ListQueryDto, @Req() req: any) {
    return this.svc.list(q, req.user);
  }

  @Get('getById/:id')
  get(@Param('id') id: string, @Req() req: any) {
    return this.svc.getById(id, req.user);
  }

  @Put('updateById/:id')
  update(@Param('id') id: string, @Body() dto: UpdateMaintenanceDto, @Req() req: any) {
    return this.svc.updateById(id, dto, req.user);
  }

  @Patch('toggleState/:id')
  toggle(@Param('id') id: string, @Req() req: any) {
    return this.svc.toggleState(id, req.user);
  }

  // LIST PLATES -> EXTERNAL (audita)
  @Get('list-plates')
  async listPlates(@Query() q: ListPlatesQueryDto) {
    return this.external.listarPlacas({
      tipoId: q.tipoId,
      vigiladoId: String(q.vigiladoId),
    });
  }

  // Ping externo para verificar auditoría rápido
  @Get('__ping_sicov')
  async pingSicov() {
    const tipoId = 1 as 1;
    const vigiladoId = String(process.env.SICOV_VIGILADO_ID ?? '');
    return this.external.listarPlacas({ tipoId, vigiladoId });
  }
}