import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { MaintenanceTypesService } from './maintenance-types.service';

@UseGuards(JwtAuthGuard)
@Controller('maintenance-types')
export class MaintenanceTypesController {
  constructor(private readonly service: MaintenanceTypesService) {}

  @Get()
  findAll(@Req() req: any) {
    const user = (req as any).user;
    return this.service.findByCompany(user.enterprise_id);
  }
}

