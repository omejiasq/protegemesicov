import { Controller, Get } from '@nestjs/common';
import { DatabaseHealthService } from '../libs/database/database-health.service';

@Controller()
export class HealthController {
  constructor(private readonly dbHealth: DatabaseHealthService) {}

  @Get('health')
  async health() {
    const dbStatus = await this.dbHealth.checkHealth();

    return {
      status: dbStatus.status === 'healthy' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      service: 'api-maintenance',
      version: '1.0.0',
      database: dbStatus
    };
  }

  @Get('health/db')
  async healthDatabase() {
    return this.dbHealth.checkHealth();
  }
}