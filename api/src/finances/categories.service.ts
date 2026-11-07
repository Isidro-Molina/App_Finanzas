import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Devuelve las categorías disponibles para el usuario:
   * - Categorías globales (userId = null, seed)
   * - Categorías personales activas del usuario (isDeleted = false)
   */
  findAll(userId: string) {
    return this.prisma.category.findMany({
      where: {
        isDeleted: false,
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

  /** Modifica una categoría personal */
  async update(userId: string, categoryId: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || category.isDeleted)
      throw new NotFoundException('Categoría no encontrada');

    if (category.userId === null) {
      throw new ForbiddenException(
        'No se pueden modificar las categorías globales',
      );
    }

    if (category.userId !== userId) {
      throw new ForbiddenException(
        'No tenés permiso para editar esta categoría',
      );
    }

    if (dto.type !== undefined && dto.type !== category.type) {
      const [txCount, budgetCount, groupExpCount] = await Promise.all([
        this.prisma.transaction.count({ where: { categoryId } }),
        this.prisma.budget.count({ where: { categoryId } }),
        this.prisma.groupExpense.count({ where: { categoryId } }),
      ]);

      if (txCount > 0 || budgetCount > 0 || groupExpCount > 0) {
        throw new BadRequestException(
          'No se puede cambiar el tipo (Gasto/Ingreso) de una categoría que ya tiene movimientos o presupuestos asociados',
        );
      }
    }

    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.type !== undefined && { type: dto.type }),
      },
    });
  }

  /**
   * Soft-delete: marca la categoría como eliminada sin borrarla físicamente.
   * Esto preserva la categoría en todos los gastos y transacciones pasadas.
   */
  async remove(userId: string, categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || category.isDeleted)
      throw new NotFoundException('Categoría no encontrada');

    if (category.userId === null) {
      throw new ForbiddenException(
        'No se pueden eliminar las categorías globales',
      );
    }

    if (category.userId !== userId) {
      throw new ForbiddenException(
        'No tenés permiso para eliminar esta categoría',
      );
    }

    await this.prisma.category.update({
      where: { id: categoryId },
      data: { isDeleted: true },
    });
    return { message: 'Categoría eliminada' };
  }
}
