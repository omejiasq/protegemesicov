import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { JwtStrategy } from './libs/auth/jwt.strategy';
import { ProgramsModule } from './maintenance-programs/program.module';
import { PreventiveModule } from './maintenance-preventive/preventive.module';
import { CorrectiveModule } from './maintenance-corrective/corrective.module';
import { EnlistmentModule } from './maintenance-enlistment/enlistment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        uri: cfg.get<string>('MONGO_URI'),
      }),
    }),
    MaintenanceModule,
    ProgramsModule,
    PreventiveModule,
    CorrectiveModule,
    EnlistmentModule
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
