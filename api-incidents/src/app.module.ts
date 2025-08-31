import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';

import { IncidentsModule } from './incidents/incident.module';
import { IncidentsVehicleModule } from './incidentsVehicle/incidentVehicle.module';
import { IncidentsDriverModule } from './incidentsDriver/incidentsDriver.module';
import { JwtStrategy } from './libs/jwt.strategy';

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
    IncidentsModule,
    IncidentsVehicleModule,
    IncidentsDriverModule,
  ],
  providers: [
    JwtStrategy,
  ],
})
export class AppModule {}
