import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';

@UseGuards(JwtAuthGuard)
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly service: ProveedoresService) {}

  /** GET /proveedores — solo habilitados (para selects) */
  @Get()
  findEnabled(@Req() req: any) {
    return this.service.findByCompany(req.user.enterprise_id);
  }

  /** GET /proveedores/all — todos, para gestión admin web */
  @Get('all')
  findAll(@Req() req: any) {
    return this.service.findAllByCompany(req.user.enterprise_id);
  }

  /** POST /proveedores — crear */
  @Post()
  create(@Req() req: any, @Body() dto: CreateProveedorDto) {
    return this.service.createForCompany(req.user.enterprise_id, dto);
  }

  /** PATCH /proveedores/:id — actualizar campos */
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProveedorDto,
  ) {
    return this.service.update(id, req.user.enterprise_id, dto);
  }

  /** PATCH /proveedores/:id/toggle — habilitar/deshabilitar */
  @Patch(':id/toggle')
  toggle(@Req() req: any, @Param('id') id: string) {
    return this.service.toggle(id, req.user.enterprise_id);
  }
}
