import { Body, Controller, Post, Req, UseGuards, Get, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { PreventiveService } from './preventive.service';
import { CreatePreventiveDto } from './dto/create-preventive-dto';
import { ViewPreventiveDto } from './dto/view-preventive-dto';

@UseGuards(JwtAuthGuard)
@Controller('maintenance-preventive')
export class PreventiveController {
  constructor(private readonly svc: PreventiveService) {}

  @Post('create')
  create(@Body() dto: CreatePreventiveDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.create(dto, {
      enterprise_id: user.enterprise_id,
      sub: user.sub,
    });
  }

  @Post('view')
  view(@Body() dto: ViewPreventiveDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.view(dto, { enterprise_id: user.enterprise_id });
  }

    @Get('list')
  list(@Query() q: any, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.list(q, { enterprise_id: user.enterprise_id });
  }
}
