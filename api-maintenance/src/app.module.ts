import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        uri: cfg.get<string>('MONGO_URI'),
      }),
    }),
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
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
