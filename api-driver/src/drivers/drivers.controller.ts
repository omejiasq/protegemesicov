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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { DriversService } from './drivers.service';
import {
  IsBooleanString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateDriverDto {
  @IsOptional() @Type(() => Number) @IsInt() idDespacho?: number;

  @IsString() @IsNotEmpty() tipoIdentificacionPrincipal!: string;
  @IsString() @IsNotEmpty() numeroIdentificacion!: string;
  @IsString() @IsNotEmpty() primerNombrePrincipal!: string;
  @IsString() @IsNotEmpty() primerApellidoPrincipal!: string;
  @IsOptional() @IsString() segundoNombrePrincipal?: string;
  @IsOptional() @IsString() segundoApellidoPrincipal?: string;

  @IsOptional() @IsString() tipoIdentificacionSecundario?: string;
  @IsOptional() @IsString() numeroIdentificacionSecundario?: string;
  @IsOptional() @IsString() primerNombreSecundario?: string;
  @IsOptional() @IsString() segundoNombreSecundario?: string;
  @IsOptional() @IsString() primerApellidoSecundario?: string;
  @IsOptional() @IsString() segundoApellidoSecundario?: string;

  @IsOptional() @IsString() idPruebaAlcoholimetria?: string;
  @IsOptional() @IsString() resultadoPruebaAlcoholimetria?: string;
  @IsOptional() @IsString() fechaUltimaPruebaAlcoholimetria?: string;
  @IsOptional() @IsString() idExamenMedico?: string;
  @IsOptional() @IsString() fechaUltimoExamenMedico?: string;

  @IsOptional() @IsString() idPruebaAlcoholimetriaSecundario?: string;
  @IsOptional() @IsString() resultadoPruebaAlcoholimetriaSecundario?: string;
  @IsOptional() @IsString() fechaUltimaPruebaAlcoholimetriaSecundario?: string;
  @IsOptional() @IsString() idExamenMedicoSecundario?: string;
  @IsOptional() @IsString() fechaUltimoExamenMedicoSecundario?: string;

  @IsOptional() @IsString() licenciaConduccion?: string;
  @IsOptional() @IsString() licenciaVencimiento?: string;
  @IsOptional() @IsString() licenciaConduccionSecundario?: string;

  @IsOptional() @IsString() observaciones?: string;
}

class UpdateDriverDto extends CreateDriverDto {}

class ListDriversQueryDto {
  @Type(() => Number) @IsOptional() @IsInt() page?: number;
  @Type(() => Number) @IsOptional() @IsInt() numero_items?: number;
  @Type(() => Number) @IsOptional() @IsInt() idDespacho?: number;

  @IsOptional() @IsString() q?: string;

  @IsOptional() @IsString() numeroIdentificacion?: string;
  @IsOptional() @IsBooleanString() estado?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly svc: DriversService) {}

  @Post('create')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )
  create(@Body() dto: CreateDriverDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.create(dto, {
      enterprise_id: (user as any).enterprise_id,
      sub: (user as any).sub,
    });
  }

  @Get('getAll')
  getAll(@Query() q: ListDriversQueryDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.getAll(q, { enterprise_id: (user as any).enterprise_id });
  }

  @Get('getById/:id')
  getById(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.getById(id, { enterprise_id: (user as any).enterprise_id });
  }

  @Put('updateById/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.svc.updateById(id, dto, {
      enterprise_id: (user as any).enterprise_id,
      sub: (user as any).sub,
    });
  }

  @Patch('toggleState/:id')
  toggle(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.toggleState(id, {
      enterprise_id: (user as any).enterprise_id,
    });
  }
}
