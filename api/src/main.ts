import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 32 ||
    process.env.JWT_SECRET.includes('change_me')
  ) {
    throw new Error(
      'CRITICAL: JWT_SECRET must be defined, have at least 32 characters, and not use default example values.',
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Cabeceras HTTP seguras
  app.use(helmet());

  // Habilitar CORS con lista blanca segura
  const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN;
  const allowedOrigins = rawOrigins
    ? rawOrigins.split(',').map((o) => o.trim())
    : [
        'http://localhost:8081',
        'http://localhost:19006',
        'http://localhost:3000',
        'http://127.0.0.1:8081',
      ];

  app.enableCors({
    origin: (requestOrigin, callback) => {
      // Permitir peticiones sin origen (apps móviles nativas, Postman, curl)
      if (!requestOrigin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(requestOrigin) ||
        (process.env.NODE_ENV !== 'production' &&
          (requestOrigin.startsWith('http://localhost:') ||
            requestOrigin.startsWith('http://127.0.0.1:') ||
            requestOrigin.startsWith('http://10.0.2.2:') ||
            requestOrigin.startsWith('exp://')));

      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error('Bloqueado por política CORS'));
    },
    credentials: true,
  });

  // Límite controlado para permitir fotos de grupo en base64 sin exponer a DoS de memoria
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '1mb', extended: true });

  // Activa la validación automática de todos los DTOs en la app.
  // - whitelist: true → descarta propiedades no declaradas en el DTO
  // - forbidNonWhitelisted: true → lanza error si llegan propiedades extra
  // - transform: true → convierte los tipos automáticamente (string → number, etc.)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Prefijo global para todas las rutas: /api/v1/users, /api/v1/auth, etc.
  app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
