import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { JwtStrategy } from './libs/auth/jwt.strategy';
import { ProgramsModule } from './maintenance-programs/program.module';
import { PreventiveModule } from './maintenance-preventive/preventive.module';
import { CorrectiveModule } from './maintenance-corrective/corrective.module';
import { EnlistmentModule } from './maintenance-enlistment/enlistment.module';
import { AuditModule } from './libs/audit/audit.module';
import { FileModule } from './maintenance-files/files.module';
import { StorageDebugModule } from './debug/storage-debug.module';

import { InspectionTypesModule } from './maintenance-catalogs/inspection-types.module';
import { MaintenanceTypesModule } from './maintenance-catalogs/maintenance-types.module';
import { ProveedoresModule } from './maintenance-catalogs/proveedores.module';
import { ItemResponseTypesModule } from './maintenance-catalogs/item-response-types.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SicovSyncModule } from './sicov-sync/sicov-sync.module';
import { ExternalIngestionModule } from './external-ingestion/external-ingestion.module';
import { AuditReportModule } from './audit-report/audit-report.module';
import { MaintenanceAiModule } from './maintenance-ai/maintenance-ai.module';
import { DocumentAlertModule } from './document-alert/document-alert.module';
import { TerminalesModule } from './terminales/terminales.module';
import { ReportsModule } from './reports/reports.module';
import { DatabaseErrorFilter } from './libs/database/database-error.filter';
import { DatabaseHealthService } from './libs/database/database-health.service';
import { HealthController } from './health/health.controller';
import { APP_FILTER } from '@nestjs/core';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        uri: cfg.get<string>('MONGO_URI'),
        connectionFactory: (connection) => {
          connection.on('connected', () => {
            console.log('✅ MongoDB connected successfully');
          });
          connection.on('disconnected', () => {
            console.log('❌ MongoDB disconnected');
          });
          connection.on('error', (error) => {
            console.log('❌ MongoDB connection error:', error.message);
          });
          return connection;
        },
        // Configuraciones mejoradas para MongoDB Atlas
        serverSelectionTimeoutMS: 10000, // Timeout de selección del servidor
        connectTimeoutMS: 10000, // Timeout de conexión
        socketTimeoutMS: 45000, // Timeout para operaciones
        maxPoolSize: 10, // Máximo 10 conexiones en pool
        retryWrites: true,
        retryReads: true,
        // Configuraciones adicionales para estabilidad
        // bufferMaxEntries: 0, // ❌ ELIMINADO - Opción obsoleta en versiones modernas
        bufferCommands: false, // Mantener - útil para no encolar comandos
        // Heartbeat configuration
        heartbeatFrequencyMS: 10000,
      }),
    }),
    // Habilita el scheduler para el cron job de reintentos SICOV
    ScheduleModule.forRoot(),

    AuditModule,
    MaintenanceModule,
    ProgramsModule,
    PreventiveModule,
    CorrectiveModule,
    EnlistmentModule,
    FileModule,
    StorageDebugModule,

    InspectionTypesModule,
    MaintenanceTypesModule,
    ProveedoresModule,
    ItemResponseTypesModule,
    DashboardModule,

    // Cola de sincronización con SICOV + reintentos automáticos
    SicovSyncModule,
    // API para ingesta desde sistemas externos (autenticación por API Key)
    ExternalIngestionModule,
    // Reporte de auditoría por empresa y fechas
    AuditReportModule,
    // IA: análisis de documentos de taller con Claude + formatos por empresa
    MaintenanceAiModule,
    // Alertas de documentos vencidos detectados por la app móvil (OCR offline)
    DocumentAlertModule,
    // Módulo de terminales: salidas, llegadas y novedades (solo empresas CARRETERA)
    TerminalesModule,
    // Constructor de reportes avanzado con detección automática de campos
    ReportsModule,
  ],
  controllers: [HealthController],
  providers: [
    JwtStrategy,
    DatabaseHealthService,
    {
      provide: APP_FILTER,
      useClass: DatabaseErrorFilter,
    },
  ],
})
export class AppModule {}