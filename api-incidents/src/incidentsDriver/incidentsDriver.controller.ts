import {
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
import { IncidentsDriverService } from './incidentsDriver.service';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from 'src/libs/jwt-auth.guard';

// Crear
class CreateIncidentDriverDto {
  @IsString() tipoIdentificacionConductor!: string;
  @IsString() numeroIdentificacion!: string;

  @IsString() primerNombreConductor!: string;
  @IsOptional() @IsString() segundoNombreConductor?: string;
  @IsString() primerApellidoConductor!: string;
  @IsOptional() @IsString() segundoApellidoConductor?: string;

  @IsString() idPruebaAlcoholimetria!: string;
  @IsString() resultadoPruebaAlcoholimetria!: string;
  @IsDateString() fechaUltimaPruebaAlcoholimetria!: string;

  @IsString() licenciaConduccion!: string;

  @IsString() idExamenMedico!: string;
  @IsDateString() fechaUltimoExamenMedico!: string;

  @IsOptional() @MaxLength(1000) @IsString() observaciones?: string;

  @IsOptional() @Type(() => Number) novedadIdExterno?: number;
  @IsOptional() @Type(() => Boolean) estado?: boolean;
}

// Listar
class ListDriverQueryDto {
  @IsOptional() @Type(() => Number) page?: number = 1;
  @IsOptional() @Type(() => Number) numero_items?: number = 10;
  @IsOptional() @IsString() find?: string; // DNI/Nombre/Apellido/Obs
  @IsOptional() @Type(() => Boolean) estado?: boolean; // true/false
  @IsOptional() @IsString() incidentId?: string; // filtro por novedad
}

// Actualizar
class UpdateIncidentDriverDto {
  @IsOptional() @IsString() tipoIdentificacionConductor?: string;
  @IsOptional() @IsString() numeroIdentificacion?: string;

  @IsOptional() @IsString() primerNombreConductor?: string;
  @IsOptional() @IsString() segundoNombreConductor?: string;
  @IsOptional() @IsString() primerApellidoConductor?: string;
  @IsOptional() @IsString() segundoApellidoConductor?: string;

  @IsOptional() @IsString() idPruebaAlcoholimetria?: string;
  @IsOptional() @IsString() resultadoPruebaAlcoholimetria?: string;
  @IsOptional() @IsDateString() fechaUltimaPruebaAlcoholimetria?: string;

  @IsOptional() @IsString() licenciaConduccion?: string;

  @IsOptional() @IsString() idExamenMedico?: string;
  @IsOptional() @IsDateString() fechaUltimoExamenMedico?: string;

  @IsOptional() @MaxLength(1000) @IsString() observaciones?: string;
  @IsOptional() @Type(() => Boolean) estado?: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('incidents/driver')
export class IncidentsDriverController {
  constructor(private readonly svc: IncidentsDriverService) {}

  /** Crear documento de conductor asociado a un Incident (id al final) */
  @Post('create/:id')
  createForIncident(
    @Param('id') incidentId: string,
    @Body() dto: any,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.svc.createForIncident(incidentId, dto, user);
  }

  // GET /incidents/driver/list
  @Get('list')
  list(@Query() q: any, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.list(q, user);
  }

  // GET /incidents/driver/:id
  @Get('/getById/:id')
  getById(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.getById(id, user);
  }

  // PUT /incidents/driver/updateById/:id
  @Put('updateById/:id')
  updateById(@Param('id') id: string, @Body() dto: any, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.updateById(id, dto, user);
  }

  // PATCH /incidents/driver/toggleState/:id
  @Patch('toggleState/:id')
  toggleState(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.toggleState(id, user);
  }
}
