import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddExpenseDto } from './dto/add-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  // ── Listar gastos del grupo ─────────────────────────────────────────────────

  async findAll(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);

    return this.prisma.groupExpense.findMany({
      where: { groupId },
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { date: 'desc' },
    });
  }

  // ── Agregar gasto ───────────────────────────────────────────────────────────

  /**
   * Agrega un gasto al grupo con sus splits correspondientes.
   * Si no se especifican splits → divide en partes iguales entre todos los miembros.
   * Si se especifican → valida que la suma sea igual al monto total.
   */
  async addExpense(userId: string, groupId: string, dto: AddExpenseDto) {
    await this.assertMember(userId, groupId);

    const totalAmount = parseFloat(dto.amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      throw new BadRequestException('El monto debe ser un número positivo');
    }

    // Obtener todos los miembros del grupo para calcular splits
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
    });

    let splitsData: Array<{ userId: string; amountOwed: string }>;

    if (dto.splits && dto.splits.length > 0) {
      // ── División personalizada ──────────────────────────────────────────────
      const splitsSum = dto.splits.reduce(
        (acc, s) => acc + parseFloat(s.amount),
        0,
      );

      // Tolerancia de ±0.02 para errores de redondeo en centavos
      if (Math.abs(splitsSum - totalAmount) > 0.02) {
        throw new BadRequestException(
          `La suma de los splits (${splitsSum}) debe ser igual al monto total (${totalAmount})`,
        );
      }

      // Verificar que todos los userId de splits sean miembros del grupo
      const memberIds = new Set(members.map((m) => m.userId));
      for (const split of dto.splits) {
        if (!memberIds.has(split.userId)) {
          throw new BadRequestException(
            `El usuario ${split.userId} no es miembro del grupo`,
          );
        }
      }

      splitsData = dto.splits.map((s) => ({
        userId:    s.userId,
        amountOwed: s.amount,
      }));
    } else {
      // ── División igualitaria ────────────────────────────────────────────────
      const perPerson    = totalAmount / members.length;
      const rounded      = Math.floor(perPerson * 100) / 100; // Piso de 2 decimales
      const remainder    = +(totalAmount - rounded * members.length).toFixed(2);

      splitsData = members.map((m, index) => ({
        userId:    m.userId,
        // El primer miembro absorbe el redondeo residual (ej: $10 / 3 = $3.33 + $3.33 + $3.34)
        amountOwed: (index === 0
          ? rounded + remainder
          : rounded
        ).toFixed(2),
      }));
    }

    // Crear el gasto y todos los splits en una transacción atómica
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.groupExpense.create({
        data: {
          groupId,
          paidById:    userId,
          description: dto.description,
          amount:      dto.amount,
          date:        dto.date ? new Date(dto.date) : new Date(),
          splits: { create: splitsData },
        },
        include: {
          paidBy: { select: { id: true, name: true } },
          splits: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      return expense;
    });
  }

  // ── Eliminar gasto ──────────────────────────────────────────────────────────

  async remove(userId: string, groupId: string, expenseId: string) {
    await this.assertMember(userId, groupId);

    const expense = await this.prisma.groupExpense.findUnique({
      where: { id: expenseId },
    });
    if (!expense) throw new NotFoundException('Gasto no encontrado');
    if (expense.groupId !== groupId) throw new BadRequestException('El gasto no pertenece a este grupo');

    // Solo quien pagó puede eliminar el gasto
    if (expense.paidById !== userId) {
      throw new ForbiddenException('Solo quien registró el gasto puede eliminarlo');
    }

    // onDelete: Cascade en ExpenseSplit elimina los splits automáticamente
    await this.prisma.groupExpense.delete({ where: { id: expenseId } });
    return { message: 'Gasto eliminado' };
  }

  // ── Helper ──────────────────────────────────────────────────────────────────

  private async assertMember(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!member) throw new ForbiddenException('No sos miembro de este grupo');
  }
}
