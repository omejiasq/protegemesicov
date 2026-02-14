import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EnterpriseGuard } from '../common/guards/enterprise.guard';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, EnterpriseGuard)
export class VehiclesController {
  constructor(private readonly service: VehiclesService) {}

  /* ===============================
   * CREATE
   * =============================== */
  @Post()
  create(@Body() dto: CreateVehicleDto, @Req() req: any) {
    return this.service.create(dto, req.user);
  }

  /* ===============================
   * GET ALL (por empresa)
   * =============================== */
  @Get()
  findAll(@Query() query: any, @Req() req: any) {
    return this.service.getAll(query, req.user);
  }

  /* ===============================
   * GET BY ID
   * =============================== */
  @Get(':id')
  findById(@Param('id') id: string, @Req() req: any) {
    return this.service.getById(id, req.user);
  }

  /* ===============================
  * GET BY PLATE
  * =============================== */
  @Get('plate/:plate')
  findByPlate(@Param('plate') plate: string, @Req() req: any) {
    return this.service.getByPlate(plate, req.user);
  }

  /* ===============================
   * UPDATE
   * =============================== */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @Req() req: any,
  ) {
    return this.service.updateById(id, dto, req.user);
  }

  /* ===============================
   * ACTIVATE / DEACTIVATE
   * =============================== */
  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Req() req: any) {
    return this.service.toggleState(id, req.user);
  }

  @Patch('by-plate/:placa/modelo')
  updateModeloByPlate(
    @Param('placa') placa: string,
    @Body('modelo') modelo: string,
    @Req() req,
  ) {
    return this.service.updateModeloByPlate(
      placa,
      modelo,
      req.user,
    );
  }

  @Patch(':id/partial')
  updateNonNullFields(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req,
  ) {
    return this.service.updateNonNullFieldsById(
      id,
      body,
      req.user,
    );
  }



}
