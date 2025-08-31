import {
  Body, Controller, Get, Param, Patch, Post, Put, Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { IncidentsService } from './incident.service';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {JwtStrategy} from '../libs/jwt.strategy'
import { JwtAuthGuard } from 'src/libs/jwt-auth.guard';

class CreateIncidentDto {
  @Type(() => Number) @IsInt() idDespacho!: number;
  @Type(() => Number) @IsIn([1, 2]) tipoNovedadId!: 1 | 2;
  @IsString() @MaxLength(500) descripcion!: string;
  @IsOptional() @IsString() @MaxLength(500) otros?: string;
}

class UpdateIncidentDto {
  @IsOptional() @IsString() @MaxLength(500) descripcion?: string;
  @IsOptional() @IsString() @MaxLength(500) otros?: string;
  @IsOptional() @Type(() => Number) @IsIn([1, 2]) tipoNovedadId?: 1 | 2;
  @IsOptional() @IsBoolean() estado?: boolean;
}

class ListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) numero_items?: number = 10;
  @IsOptional() @IsString() find?: string;
  @IsOptional() @Type(() => Number) @IsInt() idDespacho?: number;
  @IsOptional() @Type(() => Boolean) estado?: boolean;
}

@UseGuards(JwtAuthGuard)  
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly svc: IncidentsService) {}

  @Post('create')
  create(@Body() dto: CreateIncidentDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.create({
      ...dto,
      createdBy: user.sub,
      enterprise_id: user.enterprise_id,
    });
  }

  @Get('getAll')
  list(@Query() q: ListQueryDto, @Req() req: Request) {
    const user = (req as any).user;
    console.log(user)
    return this.svc.list(q, user);
  }

  @Get('getById/:id')
  get(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @Put('updateById/:id')
  update(@Param('id') id: string, @Body() dto: UpdateIncidentDto) {
    return this.svc.update(id, dto);
  }

  @Patch('toggleState/:id')
  toggle(@Param('id') id: string) {
    return this.svc.toggleState(id);
  }
}