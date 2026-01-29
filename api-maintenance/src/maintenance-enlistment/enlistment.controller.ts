import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Query,
  Param,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { AlistamientoService } from './enlistment.service';
import { CreateEnlistmentDto } from './dto/create-enlistment-dto';
import { ViewEnlistmentDto } from './dto/view-enlistment-dto';

@UseGuards(JwtAuthGuard)
@Controller('enlistment')
export class EnlistmentController {
  constructor(private readonly svc: AlistamientoService) {}

  @Post('create')
  create(@Body() dto: CreateEnlistmentDto, @Req() req: any) {
    const user = req.user;

    return this.svc.create(dto, {
      enterprise_id: user.enterprise_id,
      sub: user.sub,
      vigiladoId: user.vigiladoId,      // ✅ CORRECTO
      vigiladoToken: user.vigiladoToken,
    });
  }

  @Post('view')
  view(@Body() dto: ViewEnlistmentDto, @Req() req: any) {
    const user = req.user;
    return this.svc.view(dto, { enterprise_id: user.enterprise_id });
  }

  @Get('activities')
  activities() {
    return this.svc.listActivities();
  }

  @Get('list')
  list(@Query() q: any, @Req() req: any) {
    const user = req.user;
    return this.svc.list(q, { enterprise_id: user.enterprise_id });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const user = req.user;

    return this.svc.update(id, dto, {
      enterprise_id: user.enterprise_id,
      vigiladoId: user.vigiladoId,      // ✅ CORRECTO
      vigiladoToken: user.vigiladoToken,
    });
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.svc.toggle(id, { enterprise_id: user.enterprise_id });
  }

  // ======================================================
  // LISTAR ALISTAMIENTOS DEL USUARIO EN SESIÓN
  // ======================================================
  @Get('my')
  listMy(@Query() q: any, @Req() req: any) {
    return this.svc.listByUser(q, req.user);
  }

}

