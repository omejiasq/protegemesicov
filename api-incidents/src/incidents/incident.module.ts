import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Incident, IncidentSchema } from '../schema/incidents.schema';
import { IncidentsService } from './incident.service';
import { IncidentsController } from './incident.controller';
import { IncidentsExternalApiService } from '../libs/external-api';
import { AuditModule } from '../libs/audit/audit.module'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Incident.name, schema: IncidentSchema }]),
    AuditModule, // 👈 hace visible AuditModel/AuditService en este contexto
  ],
  providers: [IncidentsService, IncidentsExternalApiService],
  controllers: [IncidentsController],
})
export class IncidentModule {}