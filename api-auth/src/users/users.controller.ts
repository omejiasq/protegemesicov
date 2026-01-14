import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Crear usuario (protección con JWT)
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
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
}


