import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function parseAllowedFromEnv(): string[] {
  // CORS_ALLOWED= https://tu-app.vercel.app, http://localhost:5173
  return (process.env.CORS_ALLOWED ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Siempre habilitamos localhost para desarrollo
  const STATIC_LOCAL = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  const ENV_ALLOWED = new Set([...STATIC_LOCAL, ...parseAllowedFromEnv()]);

  app.enableCors({
    origin(origin, cb) {
      // Permitir herramientas sin Origin (Postman, curl)
      if (!origin) return cb(null, true);

      try {
        const host = new URL(origin).hostname;

        // Permitimos:
        // 1) orígenes listados en CORS_ALLOWED (y localhost)
        // 2) cualquier preview/prod de Vercel (*.vercel.app)
        const ok = ENV_ALLOWED.has(origin) || host.endsWith('.vercel.app');

        return cb(ok ? null : new Error('Not allowed by CORS'), ok);
      } catch {
        return cb(new Error('Not allowed by CORS'), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-enterprise-id'],
    credentials: false, // poné true solo si usás cookies/sesión
    maxAge: 86400,
  });

  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}
bootstrap();
