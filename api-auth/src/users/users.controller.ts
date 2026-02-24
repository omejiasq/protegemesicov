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
import { Get, Req } from '@nestjs/common';

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
  

}


