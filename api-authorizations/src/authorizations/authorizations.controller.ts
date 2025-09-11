import { Body, Controller, Post, Req, UseGuards, Get, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { AuthorizationService } from './authorizations.service';

@UseGuards(JwtAuthGuard)
@Controller('authorizations')
export class AuthorizationsController {
  constructor(private readonly svc: AuthorizationService) {}

  @Post('create')
  create(@Body() dto: any, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.create(dto, {
      enterprise_id: (user as any)?.enterprise_id,
      sub: (user as any)?.sub,
    });
  }

  @Post('view')
  view(@Body() dto: { id: string }, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.view(
      { id: dto.id },
      { enterprise_id: (user as any)?.enterprise_id },
    );
  }

  // Update espera UN dto con { id, changes } y opcionalmente el user como 2º arg.
  @Post('update')
  update(@Body() dto: any, @Req() req: Request) {
    const user = (req as any).user;

    // si el front envía { id, ...campos }, armamos changes automáticamente
    const { id, changes, ...rest } = dto ?? {};
    const payload = {
      id,
      changes: changes ?? rest ?? {},
    };

    return this.svc.update(payload, {
      enterprise_id: (user as any)?.enterprise_id,
    });
  }

  // Toggle espera UN dto con { id }
  @Post('toggle')
  toggle(@Body() dto: { id: string }, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.toggleState(
      { id: dto.id },
      { enterprise_id: (user as any)?.enterprise_id },
    );
  }

  @Get('list')
  list(@Query() q: any, @Req() req: Request) {
    const user = (req as any).user;
    return this.svc.list(q, { enterprise_id: (user as any)?.enterprise_id });
  }
}
