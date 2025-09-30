import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Maintenance, MaintenanceSchema } from '../schema/maintenance.schema';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceExternalApiService } from 'src/libs/external-api';
import { AuditModule } from '../libs/audit/audit.module'; // 👈

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Maintenance.name, schema: MaintenanceSchema }]),
    AuditModule, // 👈 habilita AuditService/AuditModel en este contexto
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenanceExternalApiService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}