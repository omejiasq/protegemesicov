import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { EnterpriseService } from './enterprise.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('enterprise')
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  @Post('create')
  async createEnterprise(@Body() body: { name: string; description: string }) {
    return this.enterpriseService.create(body);
  }

  @Get('getAll')
  async getEnterprises() {
    return this.enterpriseService.findAll();
  }
}