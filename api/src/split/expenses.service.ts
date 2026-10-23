import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { AddExpenseDto } from './dto/add-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

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

    // Obtener información del grupo y del usuario que paga
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: { where: { status: 'ACTIVE' } } }, // pendientes no cuentan para la división
    });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (!group.members.some((m) => m.userId === userId)) {
      throw new ForbiddenException('No sos miembro de este grupo');
    }

    const payer = await this.prisma.user.findUnique({ where: { id: userId } });
    const members = group.members;

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
        userId: s.userId,
        amountOwed: s.amount,
      }));
    } else {
      // ── División igualitaria ────────────────────────────────────────────────
      const perPerson = totalAmount / members.length;
      const rounded = Math.floor(perPerson * 100) / 100; // Piso de 2 decimales
      const remainder = +(totalAmount - rounded * members.length).toFixed(2);

      splitsData = members.map((m, index) => ({
        userId: m.userId,
        // El primer miembro absorbe el redondeo residual (ej: $10 / 3 = $3.33 + $3.33 + $3.34)
        amountOwed: (index === 0 ? rounded + remainder : rounded).toFixed(2),
      }));
    }

    // Resolver categoría (la elegida o 'Otros' global por defecto)
    let categoryId = dto.categoryId;
    if (!categoryId) {
      const otrosCategory = await this.prisma.category.findFirst({
        where: { name: 'Otros', userId: null },
      });
      categoryId = otrosCategory?.id;
    }

    // Crear el gasto y todos los splits en una transacción atómica
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.groupExpense.create({
        data: {
          groupId,
          paidById: userId,
          description: dto.description,
          amount: dto.amount,
          date: dto.date ? new Date(dto.date) : new Date(),
          categoryId: categoryId || null,
          // El split del propio pagador nace saldado (no se debe a sí mismo)
          splits: {
            create: splitsData.map((s) => ({
              ...s,
              isPaid: s.userId === userId,
            })),
          },
        },
        include: {
          paidBy: { select: { id: true, name: true } },
          splits: { include: { user: { select: { id: true, name: true } } } },
        },
      });

      // Crear transacción personal para el pagador por su parte proporcional
      const payerSplit = expense.splits.find((s) => s.userId === userId);
      if (payerSplit && categoryId) {
        const txPersonal = await tx.transaction.create({
          data: {
            userId,
            amount: payerSplit.amountOwed,
            type: 'EXPENSE',
            categoryId,
            description: `${dto.description} (${group.name})`,
            date: dto.date ? new Date(dto.date) : new Date(),
          },
        });

        await tx.expenseSplit.update({
          where: { id: payerSplit.id },
          data: { transactionId: txPersonal.id },
        });
      }

      // Crear notificaciones para el resto del grupo (dentro de la misma transacción)
      const formattedAmount = totalAmount.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const notifications = members
        .filter((m) => m.userId !== userId)
        .map((m) => ({
          userId: m.userId,
          title: 'Nuevo gasto grupal',
          message: `${payer?.name ?? 'Alguien'} cargó un gasto de $${formattedAmount} en "${group.name}".`,
          type: 'GROUP_EXPENSE' as const,
          relatedId: groupId,
        }));

      await this.notificationsService.createMany(notifications, tx);

      return expense;
    });
  }

  // ── Eliminar gasto ──────────────────────────────────────────────────────────

  async remove(userId: string, groupId: string, expenseId: string) {
    await this.assertMember(userId, groupId);

    const expense = await this.prisma.groupExpense.findUnique({
      where: { id: expenseId },
      include: { splits: true },
    });
    if (!expense) throw new NotFoundException('Gasto no encontrado');
    if (expense.groupId !== groupId)
      throw new BadRequestException('El gasto no pertenece a este grupo');

    // Solo quien pagó puede eliminar el gasto
    if (expense.paidById !== userId) {
      throw new ForbiddenException(
        'Solo quien registró el gasto puede eliminarlo',
      );
    }

    const txIds = expense.splits
      .map((s) => s.transactionId)
      .filter((id): id is string => Boolean(id));

    await this.prisma.$transaction(async (tx) => {
      await tx.groupExpense.delete({ where: { id: expenseId } });

      if (txIds.length > 0) {
        await tx.transaction.deleteMany({
          where: { id: { in: txIds } },
        });
      }
    });

    return { message: 'Gasto eliminado' };
  }

  // ── Marcar split como pagado / pendiente ────────────────────────────────────

  async toggleSplitPaid(
    userId: string,
    groupId: string,
    expenseId: string,
    splitId: string,
  ) {
    await this.assertMember(userId, groupId);

    const split = await this.prisma.expenseSplit.findUnique({
      where: { id: splitId },
      include: {
        groupExpense: {
          include: { group: { select: { name: true, strictPayments: true } } },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (
      !split ||
      split.groupExpenseId !== expenseId ||
      split.groupExpense.groupId !== groupId
    ) {
      throw new NotFoundException(
        'Gasto o división no encontrada en este grupo',
      );
    }

    const isPayer = split.groupExpense.paidById === userId;
    const isDebtor = split.userId === userId;

    // La parte del propio pagador está saldada por defecto y no se puede modificar
    if (split.userId === split.groupExpense.paidById) {
      throw new BadRequestException(
        'El pagador no le debe nada a nadie en su propio gasto',
      );
    }

    // Si el grupo tiene activado el modo estricto, solo quien pagó el gasto puede confirmar el cobro
    if (split.groupExpense.group.strictPayments && !isPayer) {
      throw new ForbiddenException(
        'En este grupo está activado el modo estricto: solo quien pagó el gasto puede confirmar los cobros.',
      );
    }

    // Solo el deudor ("ya pagué") o quien pagó el gasto ("me pagaron") pueden cambiarlo.
    // Ni el admin ni terceros pueden tocarlo.
    if (!isPayer && !isDebtor) {
      throw new ForbiddenException(
        'Solo el deudor o quien cargó el gasto pueden cambiar este pago',
      );
    }

    const willBePaid = !split.isPaid;

    return this.prisma.$transaction(async (tx) => {
      let transactionId = split.transactionId;

      if (willBePaid) {
        // Al marcar como pagado, generar la transacción personal para el deudor
        let categoryId = split.groupExpense.categoryId;
        if (!categoryId) {
          const otrosCat = await tx.category.findFirst({
            where: { name: 'Otros', userId: null },
          });
          categoryId = otrosCat?.id ?? null;
        }

        if (categoryId) {
          const personalTx = await tx.transaction.create({
            data: {
              userId: split.userId,
              amount: split.amountOwed,
              type: 'EXPENSE',
              categoryId,
              description: `${split.groupExpense.description} (${split.groupExpense.group.name})`,
              date: new Date(),
            },
          });
          transactionId = personalTx.id;
        }
      } else {
        // Si se desmarca como pagado, eliminar la transacción personal si existía
        if (transactionId) {
          await tx.transaction.delete({ where: { id: transactionId } });
          transactionId = null;
        }
      }

      const updated = await tx.expenseSplit.update({
        where: { id: splitId },
        data: {
          isPaid: willBePaid,
          transactionId,
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      return updated;
    });
  }

  // ── Helper ──────────────────────────────────────────────────────────────────

  private async assertMember(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!member || member.status !== 'ACTIVE') {
      throw new ForbiddenException('No sos miembro de este grupo');
    }
  }
}
