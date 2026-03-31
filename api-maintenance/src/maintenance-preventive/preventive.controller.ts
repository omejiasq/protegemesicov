import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  Get,
  Query,
  Param,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { PreventiveService } from './preventive.service';
import { CreatePreventiveDto } from './dto/create-preventive-dto';
import { ViewPreventiveDto } from './dto/view-preventive-dto';

interface JwtUser {
  enterprise_id?: string;
  sub?: string;
  vigiladoId?: number;
  vigiladoToken?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('maintenance-preventive')
export class PreventiveController {
  constructor(private readonly svc: PreventiveService) {}

  // ======================================================
  // CREATE
  // ======================================================
  @Post('create')
  create(@Body() dto: CreatePreventiveDto, @Req() req: any) {
    const user = req.user as JwtUser;
  
    // 🔥 Extraer JWT real del header Authorization
    const authHeader = req.headers.authorization;
    const jwt = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : undefined;
  
    return this.svc.create(dto, {
      enterprise_id: user.enterprise_id,
      sub: user.sub,
      vigiladoId: user.vigiladoId,
      vigiladoToken: user.vigiladoToken,
      jwt, // 🔥 ESTA LÍNEA ES CLAVE
    });
  }
  

  // ======================================================
  // VIEW
  // ======================================================
  @Post('view')
  view(@Body() dto: ViewPreventiveDto, @Req() req: any) {
    const user = req.user as JwtUser;
    return this.svc.view(dto, { enterprise_id: user.enterprise_id });
  }

  // ======================================================
  // LIST
  // ======================================================
  @Get('list')
  list(@Query() q: any, @Req() req: any) {
    const user = req.user as JwtUser;
    return this.svc.list(q, { enterprise_id: user.enterprise_id });
  }

  // ======================================================
  // UPDATE
  // ======================================================
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const user = req.user as JwtUser;

    return this.svc.update(id, dto, {
      enterprise_id: user.enterprise_id,
      vigiladoId: user.vigiladoId,
      vigiladoToken: user.vigiladoToken,
    });
  }

  // ======================================================
  // TOGGLE
  // ======================================================
  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Req() req: any) {
    const user = req.user as JwtUser;
    return this.svc.toggle(id, { enterprise_id: user.enterprise_id });
  }

    // ======================================================
  // LIST CORRECTIVOS DEL USUARIO EN SESIÓN
  // ======================================================
  @Get('my')
  listMy(@Query() q: any, @Req() req: any) {
    return this.svc.listByUser(q, req.user);
  }
  
  @Get(':id/report')
  async getReport(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const user = req.user as JwtUser;
    return this.svc.getFullReportByPreventiveId(id, {
      enterprise_id: user.enterprise_id,
    });
  }

  // ======================================================
  // MARCAR COMO EJECUTADO (dispara SICOV)
  // ======================================================
  @Patch(':id/execute')
  async execute(
    @Param('id') id: string,
    @Body() body: { executedAt?: string },
    @Req() req: any,
  ) {
    const user = req.user as JwtUser;
    const authHeader = req.headers.authorization;
    const jwt = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : undefined;

    const executedAt = body.executedAt ? new Date(body.executedAt) : new Date();

    return this.svc.markAsExecuted(id, executedAt, {
      enterprise_id: user.enterprise_id,
      sub: user.sub,
      vigiladoId: user.vigiladoId,
      vigiladoToken: user.vigiladoToken,
      jwt,
    });
  }

}
