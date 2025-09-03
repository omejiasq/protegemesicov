import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const FRONT_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];

  app.enableCors({

    origin: (origin, callback) => {
      if (!origin) return callback(null, true);  
      if (FRONT_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-enterprise-id'],
    credentials: false,  
    maxAge: 86400,          
  });

  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}
bootstrap();