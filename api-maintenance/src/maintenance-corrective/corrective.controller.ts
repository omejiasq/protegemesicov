import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
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
    return this.svc.create(dto, { enterprise_id: user.enterprise_id, sub: user.sub });
  }

  @Post('view')
  view(@Body() dto: ViewCorrectiveDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.view(dto, { enterprise_id: user.enterprise_id });
  }
}