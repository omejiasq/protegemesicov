import {
  Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { VehiclesService } from './vehicle.service';
import { IsBooleanString, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class CreateVehicleDto {
  @IsString() @IsNotEmpty() placa!: string;
  @Type(() => Number) @IsInt() clase!: number;         
  @Type(() => Number) @IsInt() nivelServicio!: number; 
  @IsOptional() @IsString() soat?: string;
  @IsOptional() @IsString() fechaVencimientoSoat?: string;
  @IsOptional() @IsString() revisionTecnicoMecanica?: string;
  @IsOptional() @IsString() fechaRevisionTecnicoMecanica?: string;
  @IsOptional() @IsString() idPolizas?: string;
  @IsOptional() @IsString() tipoPoliza?: string;
  @IsOptional() @IsString() vigencia?: string;
  @IsOptional() @IsString() tarjetaOperacion?: string;
  @IsOptional() @IsString() fechaTarjetaOperacion?: string;
}

class UpdateVehicleDto {
  @IsOptional() @IsString() placa?: string;
  @IsOptional() @Type(() => Number) @IsInt() clase?: number;
  @IsOptional() @Type(() => Number) @IsInt() nivelServicio?: number;
  @IsOptional() @IsString() soat?: string;
  @IsOptional() @IsString() fechaVencimientoSoat?: string;
  @IsOptional() @IsString() revisionTecnicoMecanica?: string;
  @IsOptional() @IsString() fechaRevisionTecnicoMecanica?: string;
  @IsOptional() @IsString() idPolizas?: string;
  @IsOptional() @IsString() tipoPoliza?: string;
  @IsOptional() @IsString() vigencia?: string;
  @IsOptional() @IsString() tarjetaOperacion?: string;
  @IsOptional() @IsString() fechaTarjetaOperacion?: string;
}

class ListVehiclesQueryDto {
  @Type(() => Number) @IsOptional() @IsInt() page?: number;
  @Type(() => Number) @IsOptional() @IsInt() numero_items?: number;
  @IsOptional() @IsString() placa?: string;
  @Type(() => Number) @IsOptional() @IsInt() clase?: number;
  @Type(() => Number) @IsOptional() @IsInt() nivelServicio?: number;
  @IsOptional() @IsBooleanString() estado?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly svc: VehiclesService) {}

  @Post('create')
  create(@Body() dto: CreateVehicleDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.create(dto, { enterprise_id: (user as any).enterprise_id, sub: (user as any).sub });
  }

  @Get('getAll')
  getAll(@Query() q: ListVehiclesQueryDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.getAll(q, { enterprise_id: (user as any).enterprise_id });
  }

  @Get('getById/:id')
  getById(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.getById(id, { enterprise_id: (user as any).enterprise_id });
  }

  @Put('updateById/:id')
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.updateById(id, dto, { enterprise_id: (user as any).enterprise_id });
  }

  @Patch('toggle/:id')
  toggle(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.toggleState(id, { enterprise_id: (user as any).enterprise_id });
  }
}