import { ForbiddenException } from '@nestjs/common';
import { BalanceService } from './balance.service';

describe('BalanceService - Cálculo de saldos y simplificación de deudas', () => {
  let service: BalanceService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      groupMember: {
        findMany: jest.fn(),
      },
      groupExpense: {
        findMany: jest.fn(),
      },
    };
    service = new BalanceService(mockPrisma);
  });

  it('debe arrojar ForbiddenException si el usuario no es miembro activo del grupo', async () => {
    mockPrisma.groupMember.findMany.mockResolvedValue([
      {
        userId: 'user-2',
        status: 'ACTIVE',
        user: { id: 'user-2', name: 'Bob' },
      },
    ]);

    await expect(service.getBalance('user-1', 'group-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('debe retornar isSettled=true cuando no hay gastos pendientes', async () => {
    mockPrisma.groupMember.findMany.mockResolvedValue([
      {
        userId: 'user-1',
        status: 'ACTIVE',
        user: { id: 'user-1', name: 'Alice' },
      },
      {
        userId: 'user-2',
        status: 'ACTIVE',
        user: { id: 'user-2', name: 'Bob' },
      },
    ]);
    mockPrisma.groupExpense.findMany.mockResolvedValue([]);

    const result = await service.getBalance('user-1', 'group-1');

    expect(result.isSettled).toBe(true);
    expect(result.transactions).toHaveLength(0);
    expect(result.balances).toEqual([
      { userId: 'user-1', name: 'Alice', net: 0 },
      { userId: 'user-2', name: 'Bob', net: 0 },
    ]);
  });

  it('debe calcular transferencias correctas cuando una persona paga por tres', async () => {
    // Alice pagó $300 para Alice, Bob y Charlie ($100 cada uno)
    mockPrisma.groupMember.findMany.mockResolvedValue([
      { userId: 'u1', status: 'ACTIVE', user: { id: 'u1', name: 'Alice' } },
      { userId: 'u2', status: 'ACTIVE', user: { id: 'u2', name: 'Bob' } },
      { userId: 'u3', status: 'ACTIVE', user: { id: 'u3', name: 'Charlie' } },
    ]);

    mockPrisma.groupExpense.findMany.mockResolvedValue([
      {
        id: 'exp-1',
        paidById: 'u1',
        paidBy: { id: 'u1', name: 'Alice' },
        splits: [
          {
            userId: 'u1',
            amountOwed: '100.00',
            isPaid: false,
            user: { id: 'u1', name: 'Alice' },
          },
          {
            userId: 'u2',
            amountOwed: '100.00',
            isPaid: false,
            user: { id: 'u2', name: 'Bob' },
          },
          {
            userId: 'u3',
            amountOwed: '100.00',
            isPaid: false,
            user: { id: 'u3', name: 'Charlie' },
          },
        ],
      },
    ]);

    const result = await service.getBalance('u1', 'group-1');

    expect(result.isSettled).toBe(false);
    expect(result.balances.find((b) => b.userId === 'u1')?.net).toBe(200);
    expect(result.balances.find((b) => b.userId === 'u2')?.net).toBe(-100);
    expect(result.balances.find((b) => b.userId === 'u3')?.net).toBe(-100);

    // Debe generar 2 transacciones: Bob -> Alice ($100) y Charlie -> Alice ($100)
    expect(result.transactions).toHaveLength(2);
    const totalTransferred = result.transactions.reduce(
      (acc, t) => acc + t.amount,
      0,
    );
    expect(totalTransferred).toBe(200);

    for (const tx of result.transactions) {
      expect(tx.to.id).toBe('u1');
      expect(tx.amount).toBe(100);
    }
  });

  it('debe ignorar splits que ya fueron pagados (isPaid: true)', async () => {
    // Bob ya pagó su split de $100 a Alice
    mockPrisma.groupMember.findMany.mockResolvedValue([
      { userId: 'u1', status: 'ACTIVE', user: { id: 'u1', name: 'Alice' } },
      { userId: 'u2', status: 'ACTIVE', user: { id: 'u2', name: 'Bob' } },
      { userId: 'u3', status: 'ACTIVE', user: { id: 'u3', name: 'Charlie' } },
    ]);

    mockPrisma.groupExpense.findMany.mockResolvedValue([
      {
        id: 'exp-1',
        paidById: 'u1',
        paidBy: { id: 'u1', name: 'Alice' },
        splits: [
          // En Prisma la query filtra where: { isPaid: false }, así que solo viene Charlie
          {
            userId: 'u3',
            amountOwed: '100.00',
            isPaid: false,
            user: { id: 'u3', name: 'Charlie' },
          },
        ],
      },
    ]);

    const result = await service.getBalance('u1', 'group-1');

    expect(result.balances.find((b) => b.userId === 'u1')?.net).toBe(100);
    expect(result.balances.find((b) => b.userId === 'u2')?.net).toBe(0);
    expect(result.balances.find((b) => b.userId === 'u3')?.net).toBe(-100);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toEqual({
      from: { id: 'u3', name: 'Charlie' },
      to: { id: 'u1', name: 'Alice' },
      amount: 100,
    });
  });

  it('debe simplificar deudas circulares a 0 transferencias', async () => {
    // A pagó 100 por B; B pagó 100 por C; C pagó 100 por A.
    // Saldos netos: todos 0. Transferencias necesarias: 0.
    mockPrisma.groupMember.findMany.mockResolvedValue([
      { userId: 'u1', status: 'ACTIVE', user: { id: 'u1', name: 'Alice' } },
      { userId: 'u2', status: 'ACTIVE', user: { id: 'u2', name: 'Bob' } },
      { userId: 'u3', status: 'ACTIVE', user: { id: 'u3', name: 'Charlie' } },
    ]);

    mockPrisma.groupExpense.findMany.mockResolvedValue([
      {
        id: 'exp-1',
        paidById: 'u1',
        paidBy: { id: 'u1', name: 'Alice' },
        splits: [
          {
            userId: 'u2',
            amountOwed: '100.00',
            isPaid: false,
            user: { id: 'u2', name: 'Bob' },
          },
        ],
      },
      {
        id: 'exp-2',
        paidById: 'u2',
        paidBy: { id: 'u2', name: 'Bob' },
        splits: [
          {
            userId: 'u3',
            amountOwed: '100.00',
            isPaid: false,
            user: { id: 'u3', name: 'Charlie' },
          },
        ],
      },
      {
        id: 'exp-3',
        paidById: 'u3',
        paidBy: { id: 'u3', name: 'Charlie' },
        splits: [
          {
            userId: 'u1',
            amountOwed: '100.00',
            isPaid: false,
            user: { id: 'u1', name: 'Alice' },
          },
        ],
      },
    ]);

    const result = await service.getBalance('u1', 'group-1');

    expect(result.isSettled).toBe(true);
    expect(result.transactions).toHaveLength(0);
    expect(result.balances.every((b) => b.net === 0)).toBe(true);
  });
});
