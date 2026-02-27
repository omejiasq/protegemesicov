import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Enterprise, EnterpriseSchema } from '../schemas/enterprise.schema';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    UsersModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default_jwt_secret',
        signOptions: { expiresIn: '12h' },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Enterprise.name, schema: EnterpriseSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard, // ✅ registrado aquí para poder inyectarlo globalmente
  ],
  exports: [
    AuthService,
    JwtAuthGuard,          // ✅ exportado para usarlo en otros módulos
    JwtModule,             // ✅ exportado para que otros módulos puedan usar JwtService
    MongooseModule,        // ✅ exportado para que el guard funcione donde se importe AuthModule
  ],
})
export class AuthModule {}