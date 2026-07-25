import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule es Global para que PrismaService esté disponible
 * en todos los módulos de la aplicación sin necesidad de importarlo
 * explícitamente en cada uno.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
