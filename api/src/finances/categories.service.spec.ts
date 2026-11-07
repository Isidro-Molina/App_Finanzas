import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CategoriesService } from './categories.service';

describe('CategoriesService - Integridad de tipos y permisos', () => {
  let service: CategoriesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      category: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      transaction: {
        count: jest.fn().mockResolvedValue(0),
      },
      budget: {
        count: jest.fn().mockResolvedValue(0),
      },
      groupExpense: {
        count: jest.fn().mockResolvedValue(0),
      },
    };
    service = new CategoriesService(mockPrisma);
  });

  it('debe impedir cambiar el tipo de una categoría si ya tiene transacciones asociadas', async () => {
    mockPrisma.category.findUnique.mockResolvedValue({
      id: 'cat-1',
      name: 'Mascotas',
      type: 'EXPENSE',
      userId: 'user-1',
      isDeleted: false,
    });
    mockPrisma.transaction.count.mockResolvedValue(3);

    await expect(
      service.update('user-1', 'cat-1', { type: 'INCOME' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe impedir editar una categoría global', async () => {
    mockPrisma.category.findUnique.mockResolvedValue({
      id: 'cat-global',
      name: 'Otros',
      type: 'EXPENSE',
      userId: null,
      isDeleted: false,
    });

    await expect(
      service.update('user-1', 'cat-global', { name: 'Nuevo Nombre' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
