import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EnterpriseModule } from './enterprise/enterprise.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

console.log(process.env.MONGO_URI)

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
MongooseModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    const uri = config.get<string>('MONGO_URI');
    return { uri };
  },
}),
    UsersModule,
    AuthModule,
    EnterpriseModule,
  ],
})
export class AppModule {}
