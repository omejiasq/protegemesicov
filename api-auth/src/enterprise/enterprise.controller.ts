import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Patch,
  UseGuards,
  BadRequestException,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { EnterpriseService } from './enterprise.service';
import { UpsertEnterpriseAdminDto } from './dto/upsert-enterprise-admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperadminGuard } from '../auth/guards/superadmin.guard';
import { UsersService } from '../users/users.service';

@Controller('enterprise')
export class EnterpriseController {
  constructor(
    private readonly enterpriseService: EnterpriseService,
    private readonly usersService: UsersService,
  ) {}

  // ── Superadmin only ──────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Post()
  create(@Body() dto: UpsertEnterpriseAdminDto) {
    return this.enterpriseService.createAdmin(dto);
  }

  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<UpsertEnterpriseAdminDto>,
  ) {
    return this.enterpriseService.updateAdmin(id, dto);
  }

  /** Lista todas las empresas (solo superadmin) */
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Get('all')
  listAll() {
    return this.enterpriseService.findAll();
  }

  /** Enviar comunicado a todas las empresas no-admin (solo superadmin) */
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Post('broadcast')
  sendBroadcast(
    @Body() dto: { message: string },
    @Req() req: any,
  ) {
    const senderName = req.user?.username ?? 'Administrador';
    return this.enterpriseService.sendBroadcast({ message: dto.message, senderName });
  }

  /** Toggle activo/inactivo de una empresa */
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Patch(':id/toggle-active')
  async toggleActive(
    @Param('id') id: string,
    @Body() dto: { active: boolean; reason?: string },
  ) {
    return this.enterpriseService.toggleActive(id, dto);
  }

  /**
   * Crear usuario administrador para una empresa (solo una vez).
   * POST /enterprise/:id/create-user
   */
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Post(':id/create-user')
  async createEnterpriseUser(
    @Param('id') enterpriseId: string,
    @Body() dto: {
      usuario: string;
      nombre?: string;
      apellido?: string;
      telefono?: string;
      correo?: string;
      document_type?: number;
      password: string;
    },
  ) {
    if (!dto.usuario?.trim()) throw new BadRequestException('El campo usuario es requerido');
    if (!dto.password?.trim()) throw new BadRequestException('El campo password es requerido');

    const enterprise = await this.enterpriseService.findById(enterpriseId);
    return this.usersService.createForEnterprise(enterpriseId, dto, enterprise.name);
  }

  // ── Autenticado (cualquier rol) ──────────────────────────────────────

  /** Admin actualiza campos de su propia empresa (logo, centro, mecánico) */
  @UseGuards(JwtAuthGuard)
  @Patch(':id/profile')
  updateProfile(
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    if (req.user.enterprise_id !== id) {
      throw new ForbiddenException('Solo puedes modificar tu propia empresa');
    }
    return this.enterpriseService.updateOwn(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.enterpriseService.findById(id);
  }

  /** GET /enterprise/:id/menu-permissions */
  @UseGuards(JwtAuthGuard)
  @Get(':id/menu-permissions')
  getMenuPermissions(@Param('id') id: string) {
    return this.enterpriseService.getMenuPermissions(id);
  }

  /** PATCH /enterprise/:id/menu-permissions — admin de la empresa o superadmin */
  @UseGuards(JwtAuthGuard)
  @Patch(':id/menu-permissions')
  setMenuPermissions(
    @Param('id') id: string,
    @Body('keys') keys: string[],
    @Req() req: any,
  ) {
    const isOwnEnterprise = req.user.enterprise_id === id;
    const isSuperAdmin = req.user.role === 'superadmin';
    if (!isOwnEnterprise && !isSuperAdmin) {
      throw new ForbiddenException('Sin permiso para modificar esta empresa');
    }
    return this.enterpriseService.setMenuPermissions(id, keys);
  }
}
