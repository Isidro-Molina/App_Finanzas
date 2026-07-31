import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lista los presupuestos del usuario para un mes/año dado.
   * Incluye cuánto se gastó vs el límite presupuestado.
   */
  async findAll(userId: string, month: number, year: number) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: { select: { id: true, name: true, icon: true, type: true } } },
    });

    // Para cada presupuesto, calcular el gasto real del mes
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 1);

    return Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: budget.categoryId,
            type: 'EXPENSE',
            date: { gte: start, lt: end },
          },
          _sum: { amount: true },
        });

        const spentAmount = Number(spent._sum.amount ?? 0);
        const budgetAmount = Number(budget.amount);

        return {
          ...budget,
          amount:    budgetAmount,
          spent:     +spentAmount.toFixed(2),
          remaining: +(budgetAmount - spentAmount).toFixed(2),
          pctUsed:   budgetAmount > 0
            ? +((spentAmount / budgetAmount) * 100).toFixed(1)
            : 0,
        };
      }),
    );
  }

  /** Crea o actualiza un presupuesto (upsert por la constraint única) */
  upsert(userId: string, dto: CreateBudgetDto) {
    return this.prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId,
          categoryId: dto.categoryId,
          month:      dto.month,
          year:       dto.year,
        },
      },
      update: { amount: dto.amount },
      create: {
        userId,
        categoryId: dto.categoryId,
        month:      dto.month,
        year:       dto.year,
        amount:     dto.amount,
      },
      include: { category: { select: { id: true, name: true, icon: true } } },
    });
  }

  async remove(userId: string, id: string) {
    const budget = await this.prisma.budget.findUnique({ where: { id } });
    if (!budget)               throw new NotFoundException('Presupuesto no encontrado');
    if (budget.userId !== userId) throw new ForbiddenException('No tenés permiso');

    await this.prisma.budget.delete({ where: { id } });
    return { message: 'Presupuesto eliminado' };
  }
}
