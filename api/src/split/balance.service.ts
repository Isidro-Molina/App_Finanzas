import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface PersonBalance {
  userId: string;
  name:   string;
  amount: number;
}

export interface DebtTransaction {
  from:   { id: string; name: string };
  to:     { id: string; name: string };
  amount: number;
}

@Injectable()
export class BalanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calcula el balance del grupo y devuelve la lista mínima de
   * transferencias necesarias para saldar todas las deudas.
   *
   * Algoritmo de simplificación de deudas (Greedy):
   * 1. Calcula el saldo neto de cada persona:
   *    saldo = lo_que_pagó - lo_que_debe
   * 2. Separa en acreedores (saldo > 0) y deudores (saldo < 0)
   * 3. Emparejar el mayor deudor con el mayor acreedor hasta saldar todo
   *
   * Esto minimiza el número de transferencias.
   */
  async getBalance(userId: string, groupId: string) {
    // Verificar que el solicitante sea miembro del grupo
    const member = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!member) throw new ForbiddenException('No sos miembro de este grupo');

    // Traer todos los gastos con sus splits y la info de los usuarios
    const expenses = await this.prisma.groupExpense.findMany({
      where: { groupId },
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: {
          where: { isPaid: false }, // Solo splits pendientes de pago
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    // ── Paso 1: Calcular saldo neto por persona ──────────────────────────────
    const balanceMap: Record<string, PersonBalance> = {};

    const ensureEntry = (id: string, name: string) => {
      if (!balanceMap[id]) balanceMap[id] = { userId: id, name, amount: 0 };
    };

    for (const expense of expenses) {
      // Quien pagó: su saldo sube por lo que pagó
      ensureEntry(expense.paidBy.id, expense.paidBy.name);
      balanceMap[expense.paidBy.id].amount += Number(expense.amount);

      // Cada persona con un split: su saldo baja por lo que debe
      for (const split of expense.splits) {
        ensureEntry(split.user.id, split.user.name);
        balanceMap[split.user.id].amount -= Number(split.amountOwed);
      }
    }

    // ── Paso 2: Separar acreedores y deudores ───────────────────────────────
    const EPSILON = 0.01; // Ignorar diferencias menores a 1 centavo

    const creditors: PersonBalance[] = []; // Saldo positivo → les deben
    const debtors:   PersonBalance[] = []; // Saldo negativo → ellos deben

    for (const entry of Object.values(balanceMap)) {
      const rounded = +entry.amount.toFixed(2);
      if (rounded >  EPSILON) creditors.push({ ...entry, amount:  rounded });
      if (rounded < -EPSILON) debtors.push({   ...entry, amount: -rounded }); // negativo → positivo
    }

    // Ordenar de mayor a menor para emparejar los más grandes primero
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort(  (a, b) => b.amount - a.amount);

    // ── Paso 3: Algoritmo Greedy de simplificación ───────────────────────────
    const transactions: DebtTransaction[] = [];
    let i = 0, j = 0;

    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i];
      const debtor   = debtors[j];

      const transferAmount = +Math.min(creditor.amount, debtor.amount).toFixed(2);

      transactions.push({
        from:   { id: debtor.userId,   name: debtor.name },
        to:     { id: creditor.userId, name: creditor.name },
        amount: transferAmount,
      });

      creditor.amount = +(creditor.amount - transferAmount).toFixed(2);
      debtor.amount   = +(debtor.amount   - transferAmount).toFixed(2);

      if (creditor.amount < EPSILON) i++;
      if (debtor.amount   < EPSILON) j++;
    }

    // ── Respuesta final ──────────────────────────────────────────────────────
    return {
      groupId,
      isSettled: transactions.length === 0,
      // Resumen de saldos individuales para mostrar en el UI
      balances: Object.values(balanceMap).map((b) => ({
        userId: b.userId,
        name:   b.name,
        net:    +b.amount.toFixed(2),  // Positivo = te deben | Negativo = debés
      })),
      // Lista mínima de transferencias para saldar todo
      transactions,
    };
  }
}
