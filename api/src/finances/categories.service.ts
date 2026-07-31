import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Devuelve las categorías disponibles para el usuario:
   * - Categorías globales (userId = null, seed)
   * - Categorías personales del usuario
   */
  findAll(userId: string) {
    return this.prisma.category.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
      },
      orderBy: [{ userId: 'asc' }, { name: 'asc' }], // Globales primero
    });
  }

  /** Crea una categoría personal para el usuario autenticado */
  create(userId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: { ...dto, userId },
    });
  }

  /** Solo el dueño puede eliminar su categoría personal (no las globales) */
  async remove(userId: string, categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) throw new NotFoundException('Categoría no encontrada');

    if (category.userId === null) {
      throw new ForbiddenException('No se pueden eliminar las categorías globales');
    }

    if (category.userId !== userId) {
      throw new ForbiddenException('No tenés permiso para eliminar esta categoría');
    }

    await this.prisma.category.delete({ where: { id: categoryId } });
    return { message: 'Categoría eliminada' };
  }
}
