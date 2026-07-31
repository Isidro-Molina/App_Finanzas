import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
bootstrap();
