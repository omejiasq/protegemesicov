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
import { InspectionTypesService } from './inspection-types.service';
import { CreateInspectionTypeDto } from './dto/create-inspection-type.dto';
import { UpdateInspectionTypeDto } from './dto/update-inspection-type.dto';

@UseGuards(JwtAuthGuard)
@Controller('inspection-types')
export class InspectionTypesController {
  constructor(private readonly service: InspectionTypesService) {}

  /** GET /inspection-types — solo habilitados, incluye empresa base (mobile) */
  @Get()
  findEnabled(@Req() req: any) {
    return this.service.findByCompany(req.user.enterprise_id);
  }

  /** GET /inspection-types/all — todos los propios de la empresa, para admin web */
  @Get('all')
  findAll(@Req() req: any) {
    return this.service.findAllByCompany(req.user.enterprise_id);
  }

  /** POST /inspection-types — crear ítem propio */
  @Post()
  create(@Req() req: any, @Body() dto: CreateInspectionTypeDto) {
    return this.service.createForCompany(req.user.enterprise_id, dto);
  }

  /** PATCH /inspection-types/:id — actualizar campos */
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateInspectionTypeDto,
  ) {
    return this.service.update(id, req.user.enterprise_id, dto);
  }

  /** PATCH /inspection-types/:id/toggle — habilitar/deshabilitar */
  @Patch(':id/toggle')
  toggle(@Req() req: any, @Param('id') id: string) {
    return this.service.toggle(id, req.user.enterprise_id);
  }
}
