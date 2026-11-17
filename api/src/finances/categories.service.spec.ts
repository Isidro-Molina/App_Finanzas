import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';

describe('CategoriesService - Integridad de tipos, permisos y visibilidad', () => {
  let service: CategoriesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(2),
        update: jest.fn(),
      },
      hiddenCategory: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
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

  it('findAll debe devolver isHidden según HiddenCategory', async () => {
    mockPrisma.category.findMany.mockResolvedValue([
      {
        id: 'cat-1',
        name: 'Comida',
        type: 'EXPENSE',
        userId: null,
        hiddenByUsers: [{ userId: 'user-1' }],
      },
      {
        id: 'cat-2',
        name: 'Propia',
        type: 'EXPENSE',
        userId: 'user-1',
        hiddenByUsers: [],
      },
    ]);

    const res = await service.findAll('user-1');
    expect(res[0].isHidden).toBe(true);
    expect(res[1].isHidden).toBe(false);
    expect((res[0] as any).hiddenByUsers).toBeUndefined();
  });

  it('setVisibility debe permitir ocultar una categoría base si quedan otras visibles', async () => {
    mockPrisma.category.findUnique.mockResolvedValue({
      id: 'cat-global',
      name: 'Comida',
      type: 'EXPENSE',
      userId: null,
      isDeleted: false,
    });
    mockPrisma.category.count.mockResolvedValue(3);

    const res = await service.setVisibility('user-1', 'cat-global', true);
    expect(res).toEqual({ id: 'cat-global', isHidden: true });
    expect(mockPrisma.hiddenCategory.upsert).toHaveBeenCalled();
  });

  it('setVisibility debe impedir ocultar la última categoría visible del tipo', async () => {
    mockPrisma.category.findUnique.mockResolvedValue({
      id: 'cat-global',
      name: 'Comida',
      type: 'EXPENSE',
      userId: null,
      isDeleted: false,
    });
    mockPrisma.category.count.mockResolvedValue(0);

    await expect(
      service.setVisibility('user-1', 'cat-global', true),
    ).rejects.toThrow(BadRequestException);
  });

  it('setVisibility debe rechazar con NotFoundException categorías privadas de otro usuario', async () => {
    mockPrisma.category.findUnique.mockResolvedValue({
      id: 'cat-other',
      name: 'Privada',
      type: 'EXPENSE',
      userId: 'user-2',
      isDeleted: false,
    });

    await expect(
      service.setVisibility('user-1', 'cat-other', true),
    ).rejects.toThrow(NotFoundException);
  });
});
