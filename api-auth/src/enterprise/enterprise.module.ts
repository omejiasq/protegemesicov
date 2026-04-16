import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Enterprise, EnterpriseSchema } from './schemas/enterprise.schema';
import { EnterpriseService } from './enterprise.service';
import { EnterpriseController } from './enterprise.controller';
import { AuthModule } from '../auth/auth.module';
import { SuperadminGuard } from '../auth/guards/superadmin.guard';
import { UsersModule } from '../users/users.module';
import { EmailService } from '../libs/email/email.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Enterprise.name, schema: EnterpriseSchema },
    ]),
    AuthModule,
    UsersModule,
  ],
  controllers: [EnterpriseController],
  providers: [EnterpriseService, SuperadminGuard, EmailService],
})
export class EnterpriseModule {}
