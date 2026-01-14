import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { EnterpriseService } from './enterprise.service';
import { CreateEnterpriseDto } from './dto/create-enterprise.dto';

@Controller('enterprise')
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  @Post()
  create(@Body() dto: CreateEnterpriseDto) {
    return this.enterpriseService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateEnterpriseDto>,
  ) {
    return this.enterpriseService.update(id, dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.enterpriseService.findById(id);
  }

  @Get()
  list() {
    return this.enterpriseService.findAll();
  }
}
