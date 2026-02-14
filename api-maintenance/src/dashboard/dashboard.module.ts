import { Module } from '@nestjs/common';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

// 👇 IMPORTAS LOS MÓDULOS, NO LOS SCHEMAS
import { EnlistmentModule } from '../maintenance-enlistment/enlistment.module';
import { PreventiveModule } from '../maintenance-preventive/preventive.module';
import { CorrectiveModule } from '../maintenance-corrective/corrective.module';

@Module({
  imports: [
    EnlistmentModule,
    PreventiveModule,
    CorrectiveModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
