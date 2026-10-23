import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

describe('TransactionsService - Operaciones y seguridad financiera', () => {
  let service: TransactionsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      transaction: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      category: {
        findFirst: jest.fn(),
      },
    };
    service = new TransactionsService(mockPrisma);
  });

  describe('create - Validaciones de integridad', () => {
    it('debe arrojar NotFoundException si la categoría no existe o está eliminada', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          amount: '150.00',
          type: 'EXPENSE',
          categoryId: 'cat-non-existent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe arrojar BadRequestException si el tipo de la categoría no coincide con la transacción', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({
        id: 'cat-1',
        name: 'Sueldo',
        type: 'INCOME', // La categoría es INCOME
        isDeleted: false,
      });

      await expect(
        service.create('user-1', {
          amount: '500.00',
          type: 'EXPENSE', // Pero la transacción se declara EXPENSE
          categoryId: 'cat-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe crear la transacción correctamente cuando categoría y tipos son coherentes', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({
        id: 'cat-1',
        name: 'Supermercado',
        type: 'EXPENSE',
        isDeleted: false,
      });
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'tx-1',
        amount: '150.00',
        type: 'EXPENSE',
        categoryId: 'cat-1',
      });

      const res = await service.create('user-1', {
        amount: '150.00',
        type: 'EXPENSE',
        categoryId: 'cat-1',
      });

      expect(res.id).toBe('tx-1');
      expect(mockPrisma.transaction.create).toHaveBeenCalled();
    });
  });

  describe('getSummary - Cálculo de balances y categorías', () => {
    it('debe calcular correctamente ingresos, egresos y balance neto mensual', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([
        {
          categoryId: 'c1',
          amount: '1000.00',
          type: 'INCOME',
          category: { name: 'Sueldo', icon: '💼' },
        },
        {
          categoryId: 'c2',
          amount: '250.50',
          type: 'EXPENSE',
          category: { name: 'Supermercado', icon: '🛒' },
        },
        {
          categoryId: 'c3',
          amount: '100.00',
          type: 'EXPENSE',
          category: { name: 'Servicios', icon: '💡' },
        },
      ]);

      const summary = await service.getSummary('user-1', 7, 2026);

      expect(summary.totalIncome).toBe(1000);
      expect(summary.totalExpense).toBe(350.5);
      expect(summary.balance).toBe(649.5);
      expect(summary.byCategory).toHaveLength(3);
    });
  });

  describe('exportCsv - Mitigación contra Formula Injection (CWE-1236)', () => {
    it('debe anteponer apóstrofe a campos maliciosos con =, +, -, @, tabs', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([
        {
          date: new Date('2026-07-15T12:00:00Z'),
          type: 'EXPENSE',
          amount: '50.00',
          description: '=cmd|/c calc.exe!A1', // Inyección maliciosa
          category: { name: '+FormulaTest' }, // Inyección maliciosa
        },
        {
          date: new Date('2026-07-16T12:00:00Z'),
          type: 'INCOME',
          amount: '100.00',
          description: '@SUM(1,2)', // Inyección con @
          category: { name: 'Normal Category' },
        },
      ]);

      const csv = await service.exportCsv('user-1');
      const lines = csv.split('\n');

      expect(lines[0]).toBe('Fecha,Tipo,Categoría,Descripción,Monto');
      // Línea 1 debe tener apóstrofe en categoría y descripción
      expect(lines[1]).toContain('"\'+FormulaTest"');
      expect(lines[1]).toContain('"\'=cmd|/c calc.exe!A1"');
      // Línea 2 debe tener apóstrofe en @SUM
      expect(lines[2]).toContain('"\'@SUM(1,2)"');
      expect(lines[2]).toContain('"Normal Category"');
    });
  });
});
