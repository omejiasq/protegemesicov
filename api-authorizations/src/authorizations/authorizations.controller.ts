import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthorizationService } from './authorizations.service';
import { JwtAuthGuard } from 'src/libs/auth/jwt-auth.guard';
import { IsBoolean, IsInt, IsOptional, IsString, IsDateString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

class CreateAuthorizationDto {
  @Type(() => Number) @IsInt() vigiladoId!: number;
  @IsString() placa!: string;
  @IsOptional() @IsDateString() fecha?: string;
  @IsOptional() @IsString() @MaxLength(1000) detalleActividades?: string;
}

class UpdateAuthorizationDto {
  @IsOptional() @IsString() placa?: string;
  @IsOptional() @IsDateString() fecha?: string;
  @IsOptional() @IsString() @MaxLength(1000) detalleActividades?: string;
  @IsOptional() @IsBoolean() estado?: boolean;
}

class ListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) numero_items?: number = 10;
  @IsOptional() @IsString() placa?: string;
  @IsOptional() @Type(() => Number) @IsInt() vigiladoId?: number;
  @IsOptional() @Type(() => Boolean) estado?: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('authorization')
export class AuthorizationController {
  constructor(private readonly svc: AuthorizationService) {}

  @Post('create')
  create(@Body() dto: CreateAuthorizationDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.create({ ...dto, createdBy: user.sub, enterprise_id: user.enterprise_id });
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
  update(@Param('id') id: string, @Body() dto: UpdateAuthorizationDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.update(id, dto, user);
  }

  @Patch('toggleState/:id')
  toggle(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.toggleState(id, user);
  }
}