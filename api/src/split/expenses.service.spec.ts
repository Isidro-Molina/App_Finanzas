import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';

describe('ExpensesService - Reglas de negocio y categorías grupales', () => {
  let service: ExpensesService;
  let mockPrisma: any;
  let mockNotifications: any;

  beforeEach(() => {
    mockPrisma = {
      groupMember: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ userId: 'user-1', status: 'ACTIVE' }),
      },
      group: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'user-1', name: 'Isidro' }),
      },
      category: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      groupExpense: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      expenseSplit: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((cb: (tx: any) => unknown) => cb(mockPrisma)),
    };
    mockNotifications = {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    };

    service = new ExpensesService(mockPrisma, mockNotifications);
  });

  describe('addExpense', () => {
    it('debe rechazar participantes duplicados en splits personalizados', async () => {
      mockPrisma.group.findUnique.mockResolvedValue({
        id: 'group-1',
        name: 'Cena',
        members: [
          { userId: 'user-1', status: 'ACTIVE' },
          { userId: 'user-2', status: 'ACTIVE' },
        ],
      });

      await expect(
        service.addExpense('user-1', 'group-1', {
          description: 'Pizza',
          amount: '100',
          splits: [
            { userId: 'user-1', amount: '50' },
            { userId: 'user-1', amount: '50' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar el uso de una categoría privada perteneciente a otro usuario', async () => {
      mockPrisma.group.findUnique.mockResolvedValue({
        id: 'group-1',
        name: 'Cena',
        members: [
          { userId: 'user-1', status: 'ACTIVE' },
          { userId: 'user-2', status: 'ACTIVE' },
        ],
      });
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-other',
        userId: 'user-999',
        type: 'EXPENSE',
        isDeleted: false,
      });

      await expect(
        service.addExpense('user-1', 'group-1', {
          description: 'Pizza',
          amount: '100',
          categoryId: 'cat-other',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('debe bloquear la eliminación si otro miembro ya tiene su pago confirmado', async () => {
      mockPrisma.groupExpense.findUnique.mockResolvedValue({
        id: 'exp-1',
        groupId: 'group-1',
        paidById: 'user-1',
        splits: [
          { id: 's-1', userId: 'user-1', isPaid: true },
          { id: 's-2', userId: 'user-2', isPaid: true },
        ],
      });

      await expect(
        service.remove('user-1', 'group-1', 'exp-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('toggleSplitPaid - Resolución inteligente de categorías del deudor', () => {
    it('debe asignar la categoría homónima del deudor si ambos tienen la misma categoría custom', async () => {
      mockPrisma.expenseSplit.findUnique.mockResolvedValue({
        id: 'split-2',
        userId: 'user-2',
        groupExpenseId: 'exp-1',
        amountOwed: '500',
        isPaid: false,
        transactionId: null,
        groupExpense: {
          id: 'exp-1',
          groupId: 'group-1',
          paidById: 'user-1',
          description: 'Supermercado',
          group: { name: 'Depto', strictPayments: false },
          category: {
            id: 'cat-user1-custom',
            name: 'Mascotas',
            userId: 'user-1',
            type: 'EXPENSE',
            isDeleted: false,
          },
        },
        user: { id: 'user-2', name: 'Mateo', email: 'mateo@finova.com' },
      });

      // El deudor (user-2) también tiene una categoría llamada "Mascotas"
      mockPrisma.category.findFirst.mockResolvedValueOnce({
        id: 'cat-user2-mascotas',
        name: 'Mascotas',
        userId: 'user-2',
        type: 'EXPENSE',
        isDeleted: false,
      });

      mockPrisma.transaction.create.mockResolvedValue({ id: 'tx-user2' });
      mockPrisma.expenseSplit.update.mockResolvedValue({
        id: 'split-2',
        isPaid: true,
        transactionId: 'tx-user2',
      });

      await service.toggleSplitPaid('user-2', 'group-1', 'exp-1', 'split-2');

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-2',
            categoryId: 'cat-user2-mascotas',
          }),
        }),
      );
    });

    it('debe caer en la categoría global "Otros" si la categoría custom del pagador no existe en el deudor', async () => {
      mockPrisma.expenseSplit.findUnique.mockResolvedValue({
        id: 'split-2',
        userId: 'user-2',
        groupExpenseId: 'exp-1',
        amountOwed: '500',
        isPaid: false,
        transactionId: null,
        groupExpense: {
          id: 'exp-1',
          groupId: 'group-1',
          paidById: 'user-1',
          description: 'Gasto específico',
          group: { name: 'Depto', strictPayments: false },
          category: {
            id: 'cat-user1-only',
            name: 'Hobby raro',
            userId: 'user-1',
            type: 'EXPENSE',
            isDeleted: false,
          },
        },
        user: { id: 'user-2', name: 'Mateo', email: 'mateo@finova.com' },
      });

      // 1ra búsqueda (homónima del deudor): null
      // 2da búsqueda ("Otros" global): cat-global-otros
      mockPrisma.category.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'cat-global-otros',
          name: 'Otros',
          userId: null,
          type: 'EXPENSE',
          isDeleted: false,
        });

      mockPrisma.transaction.create.mockResolvedValue({ id: 'tx-user2' });
      mockPrisma.expenseSplit.update.mockResolvedValue({
        id: 'split-2',
        isPaid: true,
        transactionId: 'tx-user2',
      });

      await service.toggleSplitPaid('user-2', 'group-1', 'exp-1', 'split-2');

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-2',
            categoryId: 'cat-global-otros',
          }),
        }),
      );
    });
  });
});
