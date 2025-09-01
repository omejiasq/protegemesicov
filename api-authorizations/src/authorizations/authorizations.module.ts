import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Authorization, AuthorizationSchema } from '../schema/authorizations.schema';
import { AuthorizationService } from './authorizations.service';
import { AuthorizationController } from './authorizations.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Authorization.name, schema: AuthorizationSchema },
    ]),
  ],
  controllers: [AuthorizationController],
  providers: [AuthorizationService],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}