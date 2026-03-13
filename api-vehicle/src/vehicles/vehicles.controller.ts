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
import { SuperadminGuard } from '../common/guards/superadmin.guard';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly service: VehiclesService) {}

  // ── Endpoints de empresa (requieren JWT + enterprise_id) ────────────

  /* ===============================
   * CREATE
   * =============================== */
  @UseGuards(JwtAuthGuard, EnterpriseGuard)
  @Post()
  create(@Body() dto: CreateVehicleDto, @Req() req: any) {
    return this.service.create(dto, req.user);
  }

  /* ===============================
   * GET ALL (por empresa)
   * =============================== */
  @UseGuards(JwtAuthGuard, EnterpriseGuard)
  @Get()
  findAll(@Query() query: any, @Req() req: any) {
    return this.service.getAll(query, req.user);
  }

  /* ===============================
   * DEACTIVATE — empresa desactiva vehículo con nota
   * =============================== */
  @UseGuards(JwtAuthGuard, EnterpriseGuard)
  @Patch(':id/deactivate')
  deactivate(
    @Param('id') id: string,
    @Body() body: { nota_desactivacion: string },
    @Req() req: any,
  ) {
    return this.service.deactivateById(id, body, req.user);
  }

  /* ===============================
   * UPDATE
   * =============================== */
  @UseGuards(JwtAuthGuard, EnterpriseGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @Req() req: any,
  ) {
    return this.service.updateById(id, dto, req.user);
  }

  /* ===============================
   * ACTIVATE / DEACTIVATE (toggle legacy)
   * =============================== */
  @UseGuards(JwtAuthGuard, EnterpriseGuard)
  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Req() req: any) {
    return this.service.toggleState(id, req.user);
  }

  @UseGuards(JwtAuthGuard, EnterpriseGuard)
  @Patch('by-plate/:placa/modelo')
  updateModeloByPlate(
    @Param('placa') placa: string,
    @Body('modelo') modelo: string,
    @Req() req,
  ) {
    return this.service.updateModeloByPlate(placa, modelo, req.user);
  }

  @UseGuards(JwtAuthGuard, EnterpriseGuard)
  @Patch(':id/partial')
  updateNonNullFields(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req,
  ) {
    return this.service.updateNonNullFieldsById(id, body, req.user);
  }

  /* ===============================
  * GET BY ID / PLATE (enterprise)
  * =============================== */
  @UseGuards(JwtAuthGuard, EnterpriseGuard)
  @Get('plate/:plate')
  findByPlate(@Param('plate') plate: string, @Req() req: any) {
    return this.service.getByPlate(plate, req.user);
  }

  @UseGuards(JwtAuthGuard, EnterpriseGuard)
  @Get(':id')
  findById(@Param('id') id: string, @Req() req: any) {
    return this.service.getById(id, req.user);
  }

  // ── Endpoints superadmin ─────────────────────────────────────────────

  /** Vehículos de cualquier empresa */
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Get('admin/by-enterprise/:enterpriseId')
  getByEnterprise(@Param('enterpriseId') id: string) {
    return this.service.getVehiclesByEnterprise(id);
  }

  /** Contratos de habilitación de una empresa */
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Get('admin/contracts/:enterpriseId')
  getContracts(@Param('enterpriseId') id: string) {
    return this.service.getContractsByEnterprise(id);
  }

  /** Activar uno o varios vehículos (crea contrato) */
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Post('admin/activate-bulk')
  activateBulk(
    @Body() body: {
      enterprise_id: string;
      vehicle_ids: string[];
      fecha_activacion: string;
      notas?: string;
    },
    @Req() req: any,
  ) {
    return this.service.activateBulk(body, req.user);
  }

  /** Toggle sicov_sync_enabled de un vehículo */
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Patch('admin/:id/toggle-sicov')
  toggleSicov(@Param('id') id: string, @Req() req: any) {
    return this.service.toggleSicovSync(id, req.user);
  }

  /** Vehículos con solicitud de desactivación pendiente (superadmin) */
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Get('admin/pending-deactivations')
  getPendingDeactivations() {
    return this.service.getPendingDeactivations();
  }

  /** Aprobar solicitud de desactivación (superadmin) */
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Patch('admin/:id/approve-deactivation')
  approveDeactivation(@Param('id') id: string, @Req() req: any) {
    return this.service.approveDeactivation(id, req.user);
  }

  /** Rechazar solicitud de desactivación (superadmin) */
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Patch('admin/:id/reject-deactivation')
  rejectDeactivation(@Param('id') id: string, @Req() req: any) {
    return this.service.rejectDeactivation(id, req.user);
  }

  /** Logs de auditoría de vehículos */
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Get('admin/audit')
  getAudit(
    @Query() query: {
      entityId?: string;
      operation?: string;
      page?: string;
      limit?: string;
    },
  ) {
    return this.service.getAuditLogs({
      entityId: query.entityId,
      operation: query.operation,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }
}
