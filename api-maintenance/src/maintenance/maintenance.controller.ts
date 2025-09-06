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
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateMaintenanceDto {
  @Type(() => Number) @IsIn([1, 2, 3, 4]) tipoId!: 1 | 2 | 3 | 4;
  @IsString() placa!: string;
  @Type(() => Number) @IsInt() vigiladoId!: number;
}
class UpdateMaintenanceDto {
  @IsOptional() @Type(() => Number) @IsIn([1, 2, 3, 4]) tipoId?: 1 | 2 | 3 | 4;
  @IsOptional() @IsString() placa?: string;
  @IsOptional() @Type(() => Number) @IsInt() vigiladoId?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() estado?: boolean;
}
class ListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) numero_items?: number = 10;
  @IsOptional() @Type(() => Number) @IsIn([1, 2, 3, 4]) tipoId?: 1 | 2 | 3 | 4;
  @IsOptional() @IsString() placa?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() estado?: boolean;
}

class ListPlatesQueryDto {
  @Type(() => Number) @IsIn([1,2,3,4]) tipoId!: 1|2|3|4;
  @Type(() => Number) @IsInt() vigiladoId!: number;
  @IsOptional() @IsString() search?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly svc: MaintenanceService) {}

  @Post('create')
  create(@Body() dto: CreateMaintenanceDto, @Req() req: Request) {
    const user = (req as any).user;
    const json = {
      
    }
    return this.svc.create({
      ...dto,
      enterprise_id: user.enterprise_id,
      createdBy: user.sub,
    });
  }

  @Get('getAll')
  list(@Query() q: ListQueryDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.list(q, user);
  }

  @Get('getById/:id')
  get(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.getById(id, user);
  }

  @Put('updateById/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.svc.updateById(id, dto, user);
  }

  @Patch('toggleState/:id')
  toggle(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.toggleState(id, user);
  }

@Get('list-plates')
listPlates(@Query() q: ListPlatesQueryDto, @Req() req: Request) {
  const user = (req as any).user;
  const tipo = Number(q.tipoId);
  if (![1,2,3,4].includes(tipo)) {
    throw new BadRequestException('tipoId inválido');
  }
  const vigiladoId = Number(q.vigiladoId);
  return this.svc.listPlates(
    { ...q, tipoId: tipo as 1|2|3|4, vigiladoId },
    user
  );
}
}
