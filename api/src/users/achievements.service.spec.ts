import { AchievementsService } from './achievements.service';

describe('AchievementsService - Catálogo de 16 logros y evaluación a mes vencido', () => {
  let service: AchievementsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      userAchievement: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      transaction: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      category: {
        count: jest.fn().mockResolvedValue(0),
      },
      budget: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      groupMember: {
        count: jest.fn().mockResolvedValue(0),
      },
      expenseSplit: {
        count: jest.fn().mockResolvedValue(0),
      },
      notification: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    service = new AchievementsService(mockPrisma);
  });

  it('devuelve los 16 logros del catálogo', async () => {
    const list = await service.getAchievements('user-1');
    expect(list).toHaveLength(16);
  });

  it('NO desbloquea MONTHLY_SAVER ni SUPER_SAVER con movimientos del mes en curso', async () => {
    const now = new Date();
    mockPrisma.transaction.findMany.mockResolvedValue([
      {
        amount: '500000.00',
        type: 'INCOME',
        currency: 'ARS',
        categoryId: 'cat-1',
        date: now,
      },
      {
        amount: '10000.00',
        type: 'EXPENSE',
        currency: 'ARS',
        categoryId: 'cat-2',
        date: now,
      },
    ]);

    const list = await service.getAchievements('user-1');
    const saver = list.find((a) => a.code === 'MONTHLY_SAVER');
    const superSaver = list.find((a) => a.code === 'SUPER_SAVER');
    const firstStep = list.find((a) => a.code === 'FIRST_STEP');

    expect(firstStep?.unlocked).toBe(true);
    expect(saver?.unlocked).toBe(false);
    expect(superSaver?.unlocked).toBe(false);
  });

  it('desbloquea MONTHLY_SAVER, SUPER_SAVER y MEGA_SAVER cuando hay un mes pasado finalizado con >=40% de ahorro', async () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    mockPrisma.transaction.findMany.mockResolvedValue([
      {
        amount: '100000.00',
        type: 'INCOME',
        currency: 'ARS',
        categoryId: 'cat-1',
        date: lastMonth,
      },
      {
        amount: '50000.00',
        type: 'EXPENSE',
        currency: 'USD',
        categoryId: 'cat-2',
        date: lastMonth,
      },
    ]);

    const list = await service.getAchievements('user-1');
    expect(list.find((a) => a.code === 'MONTHLY_SAVER')?.unlocked).toBe(true);
    expect(list.find((a) => a.code === 'SUPER_SAVER')?.unlocked).toBe(true);
    expect(list.find((a) => a.code === 'MEGA_SAVER')?.unlocked).toBe(true);
    expect(list.find((a) => a.code === 'MULTI_CURRENCY')?.unlocked).toBe(true);
    expect(mockPrisma.userAchievement.createMany).toHaveBeenCalled();
    expect(mockPrisma.notification.create).toHaveBeenCalled();
  });

  it('calcula correctamente racha de 3 meses consecutivos y se reinicia si un mes tuvo balance negativo', async () => {
    const now = new Date();
    const m4 = new Date(now.getFullYear(), now.getMonth() - 4, 10);
    const m3 = new Date(now.getFullYear(), now.getMonth() - 3, 10);
    const m2 = new Date(now.getFullYear(), now.getMonth() - 2, 10);
    const m1 = new Date(now.getFullYear(), now.getMonth() - 1, 10);

    mockPrisma.transaction.findMany.mockResolvedValue([
      // m4: positivo
      { amount: '1000.00', type: 'INCOME', currency: 'ARS', categoryId: 'c1', date: m4 },
      // m3: negativo (corta racha)
      { amount: '500.00', type: 'INCOME', currency: 'ARS', categoryId: 'c1', date: m3 },
      { amount: '800.00', type: 'EXPENSE', currency: 'ARS', categoryId: 'c2', date: m3 },
      // m2 y m1: positivos (racha de 2, no llega a 3)
      { amount: '1000.00', type: 'INCOME', currency: 'ARS', categoryId: 'c1', date: m2 },
      { amount: '1000.00', type: 'INCOME', currency: 'ARS', categoryId: 'c1', date: m1 },
    ]);

    const list = await service.getAchievements('user-1');
    const streak3 = list.find((a) => a.code === 'SAVINGS_STREAK_3');
    expect(streak3?.unlocked).toBe(false);
    expect(streak3?.progress).toBe(2);
  });

  it('preserva logros previamente persistidos en UserAchievement aunque no haya actividad reciente', async () => {
    const unlockedAt = new Date('2026-05-01T10:00:00Z');
    mockPrisma.userAchievement.findMany.mockResolvedValue([
      { code: 'CONSTANT_MONTH', unlockedAt },
    ]);

    const list = await service.getAchievements('user-1');
    const constant = list.find((a) => a.code === 'CONSTANT_MONTH');
    expect(constant?.unlocked).toBe(true);
    expect(constant?.unlockedAt).toBe(unlockedAt.toISOString());
  });
});
