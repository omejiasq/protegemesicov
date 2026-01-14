import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Enterprise, EnterpriseSchema } from './schemas/enterprise.schema';
import { EnterpriseService } from './enterprise.service';
import { EnterpriseController } from './enterprise.controller';
import { AuthModule } from '../auth/auth.module'; // 🔥 CLAVE

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Enterprise.name, schema: EnterpriseSchema },
    ]),
    AuthModule, // 🔐 NECESARIO PARA JwtAuthGuard
  ],
  controllers: [EnterpriseController],
  providers: [EnterpriseService],
})
export class EnterpriseModule {}
