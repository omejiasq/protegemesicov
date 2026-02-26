import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  Query,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { AlistamientoService } from './enlistment.service';
import { CreateEnlistmentDto } from './dto/create-enlistment-dto';
import { ViewEnlistmentDto } from './dto/view-enlistment-dto';

@Controller('enlistment')
@UseGuards(JwtAuthGuard) // 🔐 NECESARIO
export class EnlistmentController {
  constructor(private readonly svc: AlistamientoService) {}

  // ================= PDF =================
  @Get(':id/pdf')
  async printPdf(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    await this.svc.printPdf(id, req.user, res);
  }

  // ================= LISTADOS =================

  // 🔹 LISTADO POR USUARIO (ANTES: /my)
  @Get('my')
  listMy(@Query() q: any, @Req() req: any) {
    return this.svc.listByUser(q, req.user);
  }

  // 🔹 LISTADO POR EMPRESA (ANTES: /list)
  @Get('list')
  list(@Query() q: any, @Req() req: any) {
    return this.svc.list(q, req.user);
  }

  // ================= CRUD =================
  @Post('create')
  create(@Body() dto: CreateEnlistmentDto, @Req() req: any) {
    return this.svc.create(dto, req.user);
  }

  @Post('view')
  view(@Body() dto: ViewEnlistmentDto, @Req() req: any) {
    return this.svc.view(dto, req.user);
  }

  @Get('activities')
  activities() {
    return this.svc.listActivities();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.svc.update(id, dto, req.user);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Req() req: any) {
    return this.svc.toggle(id, req.user);
  }

  @Get(':id/report')
  async getReport(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.svc.getFullReportByEnlistmentId(id, {
      enterprise_id: req.user?.enterprise_id,
    });
  }
    
}
