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
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { ItemResponseTypesService } from './item-response-types.service';
import { CreateItemResponseTypeDto } from './dto/create-item-response-type.dto';
import { UpdateItemResponseTypeDto } from './dto/update-item-response-type.dto';

@UseGuards(JwtAuthGuard)
@Controller('item-response-types')
export class ItemResponseTypesController {
  constructor(private readonly svc: ItemResponseTypesService) {}

  /** GET /item-response-types?tipo=enlistment — habilitados, para mobile */
  @Get()
  findEnabled(@Req() req: any, @Query('tipo') tipo?: string) {
    return this.svc.findByCompany(req.user.enterprise_id, tipo);
  }

  /** GET /item-response-types/all?tipo=preventive — todos, para admin web */
  @Get('all')
  findAll(@Req() req: any, @Query('tipo') tipo?: string) {
    return this.svc.findAllByCompany(req.user.enterprise_id, tipo);
  }

  /** POST /item-response-types */
  @Post()
  create(@Req() req: any, @Body() dto: CreateItemResponseTypeDto) {
    return this.svc.createForCompany(req.user.enterprise_id, dto);
  }

  /** PATCH /item-response-types/:id */
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateItemResponseTypeDto,
  ) {
    return this.svc.update(id, req.user.enterprise_id, dto);
  }

  /** PATCH /item-response-types/:id/toggle */
  @Patch(':id/toggle')
  toggle(@Req() req: any, @Param('id') id: string) {
    return this.svc.toggle(id, req.user.enterprise_id);
  }
}
