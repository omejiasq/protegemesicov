import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MenuCatalogService } from './menu-catalog.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('menu-catalog')
export class MenuCatalogController {
  constructor(private readonly service: MenuCatalogService) {}

  /** GET /menu-catalog?platform=web  — cualquier usuario autenticado */
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('platform') platform?: string) {
    return this.service.findAll(platform);
  }

  /** GET /menu-catalog/enabled?platform=web — público para resolver permisos */
  @UseGuards(JwtAuthGuard)
  @Get('enabled')
  findEnabled(@Query('platform') platform?: string) {
    return this.service.findEnabled(platform);
  }

  /** POST /menu-catalog — solo superadmin */
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: any, @Req() req: any) {
    return this.service.create(dto, req.user);
  }

  /** PATCH /menu-catalog/:id — solo superadmin */
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.service.update(id, dto, req.user);
  }

  /** DELETE /menu-catalog/:id — solo superadmin */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user);
  }
}
