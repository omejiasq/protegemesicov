import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { InspectionTypesService } from './inspection-types.service';

@UseGuards(JwtAuthGuard)
@Controller('inspection-types')
export class InspectionTypesController {
  constructor(private readonly service: InspectionTypesService) {}

  @Get()
  findAll(@Req() req: any) {
    const user = (req as any).user;
    return this.service.findByCompany(user.enterprise_id);
  }
}
