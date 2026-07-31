import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  // ─── Listar ──────────────────────────────────────────────────────────────

  findAll(userId: string, query: TransactionQueryDto) {
    const where: Prisma.TransactionWhereInput = { userId };

    // Filtro por mes/año: construir rango de fechas
    if (query.month && query.year) {
      const start = new Date(query.year, query.month - 1, 1);
      const end   = new Date(query.year, query.month, 1); // Primer día del mes siguiente
      where.date  = { gte: start, lt: end };
    } else if (query.year) {
      const start = new Date(query.year, 0, 1);
      const end   = new Date(query.year + 1, 0, 1);
      where.date  = { gte: start, lt: end };
    }

    if (query.type)       where.type       = query.type;
    if (query.categoryId) where.categoryId = query.categoryId;

    return this.prisma.transaction.findMany({
      where,
      include: { category: { select: { id: true, name: true, icon: true, type: true } } },
      orderBy: { date: 'desc' },
    });
  }

  // ─── Resumen / Balance ───────────────────────────────────────────────────

  async getSummary(userId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 1);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: start, lt: end } },
      include: { category: { select: { id: true, name: true, icon: true } } },
    });

    let totalIncome  = 0;
    let totalExpense = 0;
    const byCategory: Record<string, { name: string; icon: string | null; total: number; type: string }> = {};

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      if (tx.type === 'INCOME')  totalIncome  += amount;
      else                       totalExpense += amount;

      const key = tx.categoryId;
      if (!byCategory[key]) {
        byCategory[key] = {
          name:  tx.category.name,
          icon:  tx.category.icon,
          total: 0,
          type:  tx.type,
        };
      }
      byCategory[key].total += amount;
    }

    return {
      month,
      year,
      totalIncome:  +totalIncome.toFixed(2),
      totalExpense: +totalExpense.toFixed(2),
      balance:      +(totalIncome - totalExpense).toFixed(2),
      byCategory:   Object.values(byCategory).sort((a, b) => b.total - a.total),
    };
  }

  // ─── Crear ───────────────────────────────────────────────────────────────

  create(userId: string, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        userId,
        amount:      dto.amount,
        type:        dto.type,
        categoryId:  dto.categoryId,
        description: dto.description,
        date:        dto.date ? new Date(dto.date) : new Date(),
      },
      include: { category: { select: { id: true, name: true, icon: true, type: true } } },
    });
  }

  // ─── Actualizar ──────────────────────────────────────────────────────────

  async update(userId: string, id: string, dto: Partial<CreateTransactionDto>) {
    await this.assertOwnership(userId, id);

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.amount      && { amount:      dto.amount }),
        ...(dto.type        && { type:        dto.type }),
        ...(dto.categoryId  && { categoryId:  dto.categoryId }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.date        && { date:        new Date(dto.date) }),
      },
      include: { category: { select: { id: true, name: true, icon: true, type: true } } },
    });
  }

  // ─── Eliminar ────────────────────────────────────────────────────────────

  async remove(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    await this.prisma.transaction.delete({ where: { id } });
    return { message: 'Transacción eliminada' };
  }

  // ─── Helper privado ──────────────────────────────────────────────────────

  private async assertOwnership(userId: string, id: string) {
    const tx = await this.prisma.transaction.findUnique({ where: { id } });
    if (!tx)              throw new NotFoundException('Transacción no encontrada');
    if (tx.userId !== userId) throw new ForbiddenException('No tenés permiso sobre esta transacción');
  }
}
