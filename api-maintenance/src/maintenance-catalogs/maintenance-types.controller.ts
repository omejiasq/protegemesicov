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
import { MaintenanceTypesService } from './maintenance-types.service';
import { CreateMaintenanceTypeDto } from './dto/create-maintenance-type.dto';
import { UpdateMaintenanceTypeDto } from './dto/update-maintenance-type.dto';

@UseGuards(JwtAuthGuard)
@Controller('maintenance-types')
export class MaintenanceTypesController {
  constructor(private readonly service: MaintenanceTypesService) {}

  /** GET /maintenance-types — solo habilitados (mobile) */
  @Get()
  findEnabled(@Req() req: any) {
    return this.service.findByCompany(req.user.enterprise_id);
  }

  /** GET /maintenance-types/all — todos, para admin web */
  @Get('all')
  findAll(@Req() req: any) {
    return this.service.findAllByCompany(req.user.enterprise_id);
  }

  /** POST /maintenance-types — crear */
  @Post()
  create(@Req() req: any, @Body() dto: CreateMaintenanceTypeDto) {
    return this.service.createForCompany(req.user.enterprise_id, dto);
  }

  /** PATCH /maintenance-types/:id — actualizar campos */
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceTypeDto,
  ) {
    return this.service.update(id, req.user.enterprise_id, dto);
  }

  /** PATCH /maintenance-types/:id/toggle — habilitar/deshabilitar */
  @Patch(':id/toggle')
  toggle(@Req() req: any, @Param('id') id: string) {
    return this.service.toggle(id, req.user.enterprise_id);
  }
}
