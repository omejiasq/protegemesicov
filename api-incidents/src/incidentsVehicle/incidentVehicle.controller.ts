import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { IncidentsVehicleService } from './incidentVehicle.service';
import {
  IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from 'src/libs/jwt-auth.guard';

class CreateIncidentVehicleDto {
  @IsString() placa!: string;

  @IsString() soat!: string;
  @IsDateString() fechaVencimientoSoat!: string;

  @IsString() revisionTecnicoMecanica!: string;
  @IsDateString() fechaRevisionTecnicoMecanica!: string;

  @IsString() idPolizas!: string;
  @IsOptional() @IsString() tipoPoliza?: string;
  @IsOptional() @IsDateString() vigencia?: string;

  @IsString() tarjetaOperacion!: string;
  @IsDateString() fechaTarjetaOperacion!: string;

  @IsString() idMantenimiento!: string;
  @IsDateString() fechaMantenimiento!: string;

  @IsString() idProtocoloAlistamientoDiario!: string;
  @IsDateString() fechaProtocoloAlistamientoDiario!: string;

  @IsOptional() @MaxLength(1000) @IsString() observaciones?: string;

  @Type(() => Number) @IsInt() @Min(0) clase!: number;
  @Type(() => Number) @IsInt() @Min(0) nivelServicio!: number;

  @IsOptional() @Type(() => Number) novedadIdExterno?: number;
  @IsOptional() @Type(() => Boolean) estado?: boolean;
}

class ListVehicleQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) numero_items?: number = 10;
  @IsOptional() @IsString() find?: string;        
  @IsOptional() @Type(() => Boolean) estado?: boolean;
  @IsOptional() @IsString() incidentId?: string;       
}

class UpdateIncidentVehicleDto {
  @IsOptional() @IsString() placa?: string;

  @IsOptional() @IsString() soat?: string;
  @IsOptional() @IsDateString() fechaVencimientoSoat?: string;

  @IsOptional() @IsString() revisionTecnicoMecanica?: string;
  @IsOptional() @IsDateString() fechaRevisionTecnicoMecanica?: string;

  @IsOptional() @IsString() idPolizas?: string;
  @IsOptional() @IsString() tipoPoliza?: string;
  @IsOptional() @IsDateString() vigencia?: string;

  @IsOptional() @IsString() tarjetaOperacion?: string;
  @IsOptional() @IsDateString() fechaTarjetaOperacion?: string;

  @IsOptional() @IsString() idMantenimiento?: string;
  @IsOptional() @IsDateString() fechaMantenimiento?: string;

  @IsOptional() @IsString() idProtocoloAlistamientoDiario?: string;
  @IsOptional() @IsDateString() fechaProtocoloAlistamientoDiario?: string;

  @IsOptional() @MaxLength(1000) @IsString() observaciones?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) clase?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) nivelServicio?: number;

  @IsOptional() @Type(() => Boolean) estado?: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('incidents/vehicle')
export class IncidentsVehicleController {
  constructor(private readonly svc: IncidentsVehicleService) {}

  @Post('create/:id')
  createForIncident(@Param('id') incidentId: string, @Body() dto: any, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.createForIncident(incidentId, dto, user);
  }

  @Get('list')
  list(@Query() q: any, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.list(q, user);
  }

  @Get(':id')
  getById(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.getById(id, user);
  }

  @Put('updateById/:id')
  updateById(@Param('id') id: string, @Body() dto: any, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.updateById(id, dto, user);
  }

  @Patch('toggleState/:id')
  toggleState(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.toggleState(id, user);
  }
}
