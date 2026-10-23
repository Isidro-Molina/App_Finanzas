import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BudgetsService } from './budgets.service';

describe('BudgetsService - Presupuestos y agregaciones', () => {
  let service: BudgetsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      budget: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      category: {
        findFirst: jest.fn(),
      },
      transaction: {
        groupBy: jest.fn(),
      },
    };
    service = new BudgetsService(mockPrisma);
  });

  describe('upsert - Validaciones', () => {
    it('debe arrojar NotFoundException si la categoría no existe o está eliminada', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.upsert('user-1', {
          categoryId: 'non-existent',
          amount: '500.00',
          month: 7,
          year: 2026,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe arrojar BadRequestException si la categoría es de tipo INCOME', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({
        id: 'cat-income',
        type: 'INCOME',
        isDeleted: false,
      });

      await expect(
        service.upsert('user-1', {
          categoryId: 'cat-income',
          amount: '500.00',
          month: 7,
          year: 2026,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll - Optimización agregada groupBy (sin N+1)', () => {
    it('debe consultar groupBy una sola vez y computar spent, remaining y pctUsed', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([
        {
          id: 'b-1',
          categoryId: 'cat-1',
          amount: '1000.00',
          category: { id: 'cat-1', name: 'Super', icon: '🛒', type: 'EXPENSE' },
        },
        {
          id: 'b-2',
          categoryId: 'cat-2',
          amount: '500.00',
          category: {
            id: 'cat-2',
            name: 'Salidas',
            icon: '🍻',
            type: 'EXPENSE',
          },
        },
      ]);

      mockPrisma.transaction.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _sum: { amount: '750.00' } },
        { categoryId: 'cat-2', _sum: { amount: '100.00' } },
      ]);

      const result = await service.findAll('user-1', 7, 2026);

      expect(mockPrisma.transaction.groupBy).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);

      const b1 = result.find((b) => b.categoryId === 'cat-1');
      expect(b1?.spent).toBe(750);
      expect(b1?.remaining).toBe(250);
      expect(b1?.pctUsed).toBe(75);

      const b2 = result.find((b) => b.categoryId === 'cat-2');
      expect(b2?.spent).toBe(100);
      expect(b2?.remaining).toBe(400);
      expect(b2?.pctUsed).toBe(20);
    });

    it('debe retornar lista vacía inmediatamente si no hay presupuestos', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([]);

      const result = await service.findAll('user-1', 7, 2026);

      expect(result).toEqual([]);
      expect(mockPrisma.transaction.groupBy).not.toHaveBeenCalled();
    });
  });
});
