import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FuecService } from './fuec.service';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';

@Controller('fuec')
@UseGuards(JwtAuthGuard)
export class FuecController {
  constructor(private readonly fuecService: FuecService) {}

  /** GET /fuec?page=1&limit=20&placa=&estado=&fecha_desde=&fecha_hasta= */
  @Get()
  findAll(@Query() query: any, @Req() req: any) {
    return this.fuecService.findAll(req.user, query);
  }

  /** GET /fuec/:id */
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.fuecService.findOne(id, req.user);
  }

  /** POST /fuec */
  @Post()
  create(@Body() dto: any, @Req() req: any) {
    return this.fuecService.create(dto, req.user);
  }

  /** PATCH /fuec/:id */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.fuecService.update(id, dto, req.user);
  }

  /** PATCH /fuec/:id/emit */
  @Patch(':id/emit')
  emit(@Param('id') id: string, @Req() req: any) {
    return this.fuecService.emit(id, req.user);
  }

  /** PATCH /fuec/:id/anular */
  @Patch(':id/anular')
  anular(
    @Param('id') id: string,
    @Body('motivo') motivo: string,
    @Req() req: any,
  ) {
    return this.fuecService.anular(id, motivo, req.user);
  }
}
