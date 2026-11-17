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
      expenseSplit: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      $transaction: jest.fn((cb: (tx: any) => unknown) => cb(mockPrisma)),
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

    it('debe guardar metadatos de moneda extranjera y tipo de cotización (Dólar Tarjeta)', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({
        id: 'cat-1',
        name: 'Suscripciones',
        type: 'EXPENSE',
        isDeleted: false,
      });
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'tx-usd-1',
        amount: '29000.00',
        currency: 'USD',
        originalAmount: '20.00',
        exchangeRate: '1450.00',
        rateType: 'TARJETA',
        type: 'EXPENSE',
        categoryId: 'cat-1',
      });

      const res = await service.create('user-1', {
        amount: '29000.00',
        currency: 'USD',
        originalAmount: '20.00',
        exchangeRate: '1450.00',
        rateType: 'TARJETA',
        type: 'EXPENSE',
        categoryId: 'cat-1',
      });

      expect(res.currency).toBe('USD');
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: '29000.00',
            currency: 'USD',
            originalAmount: '20.00',
            exchangeRate: '1450.00',
            rateType: 'TARJETA',
          }),
        }),
      );
    });

    it('debe permitir limpiar description = null y campos de moneda en update (AUD-11)', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-1',
        categoryId: 'cat-1',
        type: 'EXPENSE',
      });
      mockPrisma.transaction.update.mockResolvedValue({
        id: 'tx-1',
        description: null,
        currency: 'ARS',
        originalAmount: null,
        exchangeRate: null,
        rateType: null,
      });

      await service.update('user-1', 'tx-1', {
        description: null,
        currency: 'ARS',
        originalAmount: null,
        exchangeRate: null,
        rateType: null,
      });

      expect(mockPrisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tx-1' },
          data: expect.objectContaining({
            description: null,
            currency: 'ARS',
            originalAmount: null,
            exchangeRate: null,
            rateType: null,
          }),
        }),
      );
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

  describe('exportCsv - Mitigación contra Formula Injection (CWE-1236) y filtros', () => {
    it('debe anteponer apóstrofe a campos maliciosos, incluir BOM UTF-8 y columnas de moneda', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([
        {
          date: new Date('2026-07-15T12:00:00Z'),
          type: 'EXPENSE',
          amount: '50.00',
          currency: 'USD',
          originalAmount: '10.00',
          exchangeRate: '1450.00',
          rateType: 'TARJETA',
          description: '=cmd|/c calc.exe!A1', // Inyección maliciosa
          category: { name: '+FormulaTest' }, // Inyección maliciosa
        },
        {
          date: new Date('2026-07-16T12:00:00Z'),
          type: 'INCOME',
          amount: '100.00',
          currency: 'ARS',
          originalAmount: null,
          exchangeRate: null,
          rateType: null,
          description: '@SUM(1,2)', // Inyección con @
          category: { name: 'Normal Category' },
        },
      ]);

      const result = await service.exportCsv('user-1');
      expect(result.count).toBe(2);
      expect(result.csv.startsWith('\uFEFF')).toBe(true);

      const lines = result.csv.slice(1).split('\n');
      expect(lines[0]).toBe(
        'Fecha,Tipo,Categoría,Descripción,Monto (ARS),Moneda,Monto original,Cotización,Tipo de cotización',
      );
      expect(lines[1]).toContain('"\'+FormulaTest"');
      expect(lines[1]).toContain('"\'=cmd|/c calc.exe!A1"');
      expect(lines[1]).toContain(',USD,10.00,1450.00,"TARJETA"');
      expect(lines[2]).toContain('"\'@SUM(1,2)"');
      expect(lines[2]).toContain('"Normal Category"');
    });

    it('debe filtrar por rango de fechas (incluyendo último día completo) y tipo', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.exportCsv('user-1', {
        from: '2026-10-01',
        to: '2026-10-31',
        type: 'EXPENSE',
      });

      expect(result.count).toBe(0);
      expect(result.from).toBe('2026-10-01');
      expect(result.to).toBe('2026-10-31');

      const expectedStart = new Date('2026-10-01T00:00:00.000-03:00');
      const expectedEnd = new Date(
        new Date('2026-10-31T00:00:00.000-03:00').getTime() + 86400000,
      );

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            type: 'EXPENSE',
            date: { gte: expectedStart, lt: expectedEnd },
          },
        }),
      );
    });

    it('debe rechazar con BadRequestException si from es posterior a to', async () => {
      await expect(
        service.exportCsv('user-1', {
          from: '2026-10-31',
          to: '2026-10-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove - Sincronización con pagos de gastos grupales', () => {
    it('debe revertir isPaid a false si la transacción eliminada correspondía al pago de deuda grupal', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-2',
      });
      mockPrisma.expenseSplit.findMany.mockResolvedValue([
        {
          id: 'split-2',
          userId: 'user-2',
          transactionId: 'tx-1',
          groupExpense: { paidById: 'user-1' },
        },
      ]);

      await service.remove('user-2', 'tx-1');

      expect(mockPrisma.expenseSplit.update).toHaveBeenCalledWith({
        where: { id: 'split-2' },
        data: { transactionId: null, isPaid: false, paidCurrency: null },
      });
      expect(mockPrisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
      });
    });
  });
});
