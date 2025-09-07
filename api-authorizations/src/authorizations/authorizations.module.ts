import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Authorization, AuthorizationSchema } from '../schema/authorizations.schema';
import { AuthorizationService } from './authorizations.service';
import { AuthorizationsController } from './authorizations.controller';
import { ExternalApiService } from 'src/libs/external-api';
import { AuditModule } from 'src/libs/audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Authorization.name, schema: AuthorizationSchema },
    ]),
    AuditModule
  ],
  controllers: [AuthorizationsController],
  providers: [AuthorizationService, ExternalApiService],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}