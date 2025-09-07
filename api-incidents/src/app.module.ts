import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';

import { IncidentModule } from './incidents/incident.module';
import { IncidentsVehicleModule } from './incidentsVehicle/incidentVehicle.module';
import { IncidentsDriverModule } from './incidentsDriver/incidentsDriver.module';
import { JwtStrategy } from './libs/jwt.strategy';
import { AuditModule } from './libs/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        uri: cfg.get<string>('MONGO_URI'),
      }),
    }),
    IncidentModule,
    IncidentsVehicleModule,
    IncidentsDriverModule,
    AuditModule
  ],
  providers: [
    JwtStrategy,
  ],
})
export class AppModule {}
