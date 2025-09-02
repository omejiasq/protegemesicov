import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { EnlistmentService } from './enlistment.service';
import { CreateEnlistmentDto } from './dto/create-enlistment-dto';
import { ViewEnlistmentDto } from './dto/view-enlistment-dto';

@UseGuards(JwtAuthGuard)
@Controller('enlistment')
export class EnlistmentController {
  constructor(private readonly svc: EnlistmentService) {}

  @Post('create')
  create(@Body() dto: CreateEnlistmentDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.create(dto, { enterprise_id: (user as any).enterprise_id, sub: (user as any).sub });
  }

  @Post('view')
  view(@Body() dto: ViewEnlistmentDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.view(dto, { enterprise_id: (user as any).enterprise_id });
  }

    @Get('activities')
    activities() {
    return this.svc.listActivities();
  }
}