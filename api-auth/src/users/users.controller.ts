import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Query,
  UseInterceptors
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
//import { Get, Req } from '@nestjs/common';
import {  Get, Req , Put, NotFoundException } from '@nestjs/common';
import { AuditInterceptor, Audit } from '../libs/audit/audit.interceptor';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Crear usuario (protección con JWT)
   */
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @Audit('create')
  @Post()
  create(
    @Body() createUserDto: CreateUserDto,
    @Req() req,
  ) {
    return this.usersService.create(createUserDto, req.user);
  }

  /**
   * Actualizar contraseña por ID
   * PATCH /users/:id/password
   */
  @Patch(':id/password')
  async updatePassword(
    @Param('id') id: string,
    @Body('newPassword') newPassword: string,
  ) {
    if (!newPassword) {
      throw new BadRequestException('newPassword es requerido');
    }

    return this.usersService.updatePassword(id, newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Get('drivers')
  findDrivers(
    @Req() req,
    @Query() query: any
  ) {
    return this.usersService.findDriversByEnterprise(
      req.user,
      query
    );
  }
  
@Get('drivers/:id')
@UseGuards(JwtAuthGuard)
async getDriverById(@Param('id') id: string) {
  const driver = await this.usersService.findById(id);
  if (!driver) throw new NotFoundException('Conductor no encontrado');
  return driver;
}

@Put(':id')
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Audit('update')
async updateUser(@Param('id') id: string, @Body() body: any, @Req() req: any) {
  return this.usersService.update(id, body);
}

// POST /users/staff
@Post('staff')
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Audit('create')
createStaff(@Body() dto: CreateUserDto, @Req() req: any) {
  return this.usersService.createStaff(dto, req.user);
}


// GET /users/staff?search=&roleType=&active=&page=&numero_items=
@Get('staff')
@UseGuards(JwtAuthGuard)
findStaff(@Query() query: any, @Req() req: any) {
  return this.usersService.findStaffByEnterprise(req.user, {
    page: query.page,
    numero_items: query.numero_items,
    search: query.search,
    roleType: query.roleType,
    active: query.active !== undefined ? query.active === 'true' : undefined,
    sortField: query.sortField,
    sortOrder: query.sortOrder,
  });
}

// PATCH /users/:id/toggle-active  → activar/desactivar
@Patch(':id/toggle-active')
@UseGuards(JwtAuthGuard)
toggleActive(@Param('id') id: string, @Req() req: any) {
  return this.usersService.toggleActiveUser(id, req.user);
}

// GET /users/by-enterprise/:enterpriseId → usuarios admin de una empresa (superadmin)
@Get('by-enterprise/:enterpriseId')
@UseGuards(JwtAuthGuard)
async getByEnterprise(@Param('enterpriseId') enterpriseId: string) {
  return this.usersService.findAdminsByEnterprise(enterpriseId);
}

// GET /users/:id  → obtener cualquier usuario por ID
@Get(':id')
@UseGuards(JwtAuthGuard)
async getUserById(@Param('id') id: string) {
  const user = await this.usersService.findById(id);
  if (!user) throw new NotFoundException('Usuario no encontrado');
  return user;
}

// GET /users/:id/menu-permissions
@Get(':id/menu-permissions')
@UseGuards(JwtAuthGuard)
async getMenuPermissions(@Param('id') id: string) {
  return this.usersService.getMenuPermissions(id);
}

// PATCH /users/:id/menu-permissions
@Patch(':id/menu-permissions')
@UseGuards(JwtAuthGuard)
async setMenuPermissions(
  @Param('id') id: string,
  @Body('keys') keys: string[],
  @Req() req: any,
) {
  return this.usersService.setMenuPermissions(id, keys, req.user);
}

// ═══════════════════════════════════════════════════════════════
// ADMINISTRACIÓN Y MIGRACIÓN DE USERNAMES
// ═══════════════════════════════════════════════════════════════

// GET /users/admin/username-diagnosis
@Get('admin/username-diagnosis')
@UseGuards(JwtAuthGuard)
async diagnoseUsernameIssues(@Req() req: any) {
  // Solo permitir a superadmins o admins
  if (req.user?.roleType !== 'superadmin' && req.user?.roleType !== 'admin') {
    throw new BadRequestException('Solo administradores pueden ejecutar este diagnóstico');
  }

  return this.usersService.diagnoseUsernameIssues();
}

// POST /users/admin/fix-usernames
@Post('admin/fix-usernames')
@UseGuards(JwtAuthGuard)
async fixUsernameIssues(
  @Body('dryRun') dryRun: boolean = true,
  @Req() req: any
) {
  // Solo permitir a superadmins
  if (req.user?.roleType !== 'superadmin') {
    throw new BadRequestException('Solo superadministradores pueden ejecutar correcciones automáticas');
  }

  return this.usersService.fixUsernameIssues(dryRun);
}

}


