// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EnterpriseModule } from './enterprise/enterprise.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const envUri = config.get<string>('MONGO_URI');
        const defaultLocal = 'mongodb://localhost:27017/auth';
        const uri = envUri && envUri.length > 0 ? envUri : defaultLocal;
        console.log('[MONGO] connecting to:', uri);
        return { uri };
      },
    }),
    UsersModule,
    AuthModule,
    EnterpriseModule,
  ],
})
export class AppModule {}
