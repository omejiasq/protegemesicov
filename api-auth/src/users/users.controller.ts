import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Query
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
//import { Get, Req } from '@nestjs/common';
import {  Get, Req , Put, NotFoundException } from '@nestjs/common';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Crear usuario (protección con JWT)
   */
  @UseGuards(JwtAuthGuard)
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
async updateUser(@Param('id') id: string, @Body() body: any) {
  return this.usersService.update(id, body);
}

// POST /users/staff
@Post('staff')
@UseGuards(JwtAuthGuard)
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

// GET /users/:id  → obtener cualquier usuario por ID
@Get(':id')
@UseGuards(JwtAuthGuard)
async getUserById(@Param('id') id: string) {
  const user = await this.usersService.findById(id);
  if (!user) throw new NotFoundException('Usuario no encontrado');
  return user;
}

}


