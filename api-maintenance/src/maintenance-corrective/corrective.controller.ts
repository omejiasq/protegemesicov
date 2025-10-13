import { Body, Controller, Post, Req, UseGuards, Get, Query, Patch, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { CorrectiveService } from './corrective.service';
import { CreateCorrectiveDto } from './dto/create-corrective-dto';
import { ViewCorrectiveDto } from './dto/view-corrective-dto';

@UseGuards(JwtAuthGuard)
@Controller('maintenance-corrective')
export class CorrectiveController {
  constructor(private readonly svc: CorrectiveService) {}

  @Post('create')
  create(@Body() dto: CreateCorrectiveDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.create(dto, {
      enterprise_id: user.enterprise_id,
      sub: user.sub,
      vigiladoId: user.vigiladId,
      vigiladoToken: user.vigiladoToken
    });
  }

  @Post('view')
  view(@Body() dto: ViewCorrectiveDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.view(dto, { enterprise_id: user.enterprise_id });
  }

  @Get('list')
  list(@Query() q: any, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.list(q, { enterprise_id: user.enterprise_id });
  }

  @Patch(':id')
update(@Param('id') id: string, @Body() dto: any, @Req() req: Request) {
  const user = (req as any).user;
  return this.svc.update(id, dto, { enterprise_id: user.enterprise_id });
}

@Patch(':id/toggle')
toggle(@Param('id') id: string, @Req() req: Request) {
  const user = (req as any).user;
  return this.svc.toggle(id, { enterprise_id: user.enterprise_id });
}
}
