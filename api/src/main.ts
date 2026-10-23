import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Cabeceras HTTP seguras
  app.use(helmet());

  // Habilitar CORS con lista blanca segura
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
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

  // Límite ampliado para permitir fotos de grupo en base64
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

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
