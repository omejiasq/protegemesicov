// src/terminales/terminales.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { CurrentUser } from '../libs/auth/user.decorator';
import { TerminalesService } from './terminales.service';

@UseGuards(JwtAuthGuard)
@Controller('terminales')
export class TerminalesController {
  constructor(private readonly svc: TerminalesService) {}

  // ── Salidas ─────────────────────────────────────────────────────────────

  @Post('salidas')
  @HttpCode(201)
  createSalida(@Body() dto: any, @CurrentUser() user: any) {
    return this.svc.createSalida(dto, user);
  }

  @Get('salidas')
  listSalidas(@Query() q: any, @CurrentUser() user: any) {
    return this.svc.listSalidas(q, user);
  }

  @Get('salidas/:id')
  getSalida(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getSalida(id, user);
  }

  @Patch('salidas/:id/toggle')
  toggleSalida(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.toggleSalida(id, user);
  }

  @Post('salidas/retry')
  retrySalidas(@CurrentUser() user: any) {
    return this.svc.retrySalidas(user);
  }

  // ── Llegadas ─────────────────────────────────────────────────────────────

  @Post('llegadas')
  @HttpCode(201)
  createLlegada(@Body() dto: any, @CurrentUser() user: any) {
    return this.svc.createLlegada(dto, user);
  }

  @Get('llegadas')
  listLlegadas(@Query() q: any, @CurrentUser() user: any) {
    return this.svc.listLlegadas(q, user);
  }

  @Patch('llegadas/:id/toggle')
  toggleLlegada(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.toggleLlegada(id, user);
  }

  @Post('llegadas/retry')
  retryLlegadas(@CurrentUser() user: any) {
    return this.svc.retryLlegadas(user);
  }

  // ── Novedades ─────────────────────────────────────────────────────────────

  @Post('novedades')
  @HttpCode(201)
  createNovedad(@Body() dto: any, @CurrentUser() user: any) {
    return this.svc.createNovedad(dto, user);
  }

  @Get('novedades')
  listNovedades(@Query() q: any, @CurrentUser() user: any) {
    return this.svc.listNovedades(q, user);
  }

  @Patch('novedades/:id/toggle')
  toggleNovedad(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.toggleNovedad(id, user);
  }

  @Post('novedades/retry')
  retryNovedades(@CurrentUser() user: any) {
    return this.svc.retryNovedades(user);
  }

  // ── Configuración ────────────────────────────────────────────────────────

  @Get('config')
  getConfig(@CurrentUser() user: any) {
    return this.svc.getConfig(user);
  }

  @Put('config')
  updateConfig(@Body() dto: any, @CurrentUser() user: any) {
    return this.svc.updateConfig(dto, user);
  }

  // ── Vista Unificada de Despachos ─────────────────────────────────────────

  @Get('despachos')
  getDespachos(@Query() q: any, @CurrentUser() user: any) {
    return this.svc.getDespachos(user, q);
  }

  @Get('despachos/pendientes')
  getDespachosPendientes(@Query() q: any, @CurrentUser() user: any) {
    return this.svc.getDespachosPendientes(user, q);
  }

  @Patch('despachos/:id/cerrar')
  cerrarDespacho(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.cerrarDespacho(id, user);
  }

  // ── Integración con APIs externas ────────────────────────────────────────

  @Get('rutas/supertransporte')
  getRutasSupertransporte(@CurrentUser() user: any) {
    return this.svc.getRutasSupertransporte(user);
  }

  @Get('vehiculos/search')
  searchVehiculos(@Query('placa') placa: string, @CurrentUser() user: any) {
    return this.svc.searchVehiculos(placa, user);
  }

  @Post('consultar-integradora')
  @HttpCode(200)
  consultarIntegradora(@Body() payload: any, @CurrentUser() user: any) {
    return this.svc.consultarIntegradora(user, payload);
  }

  // ── Flujos Mejorados ─────────────────────────────────────────────────────

  @Post('salidas/enhanced')
  @HttpCode(201)
  createSalidaEnhanced(@Body() dto: any, @CurrentUser() user: any) {
    return this.svc.createSalidaEnhanced(user, dto);
  }

  @Post('llegadas/enhanced')
  @HttpCode(201)
  createLlegadaEnhanced(@Body() dto: any, @CurrentUser() user: any) {
    return this.svc.createLlegadaEnhanced(user, dto);
  }
}
