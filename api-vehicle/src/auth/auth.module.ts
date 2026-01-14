import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => ({
    secret: cfg.get<string>('JWT_SECRET'),
    signOptions: {
      algorithm: 'HS256',
      expiresIn: '1d',
    },
  }),
});
