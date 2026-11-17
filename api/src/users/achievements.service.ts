import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export type AchievementCategory = 'HABIT' | 'SAVINGS' | 'BUDGET' | 'COMMUNITY';

export interface AchievementStatusDto {
  code: string;
  title: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  color: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  target: number;
  progressLabel: string;
}

interface AchievementDef {
  code: string;
  title: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  color: string;
  target: number;
}

const ACHIEVEMENTS_CATALOG: AchievementDef[] = [
  // Habito y Constancia
  {
    code: 'FIRST_STEP',
    title: 'Primer Paso',
    description: 'Registrá tu primer movimiento personal (ingreso o gasto).',
    category: 'HABIT',
    icon: 'Sparkles',
    color: '#3B82F6',
    target: 1,
  },
  {
    code: 'CONSTANT_MONTH',
    title: 'Constante',
    description: 'Registrá al menos 15 gastos personales en un mismo mes.',
    category: 'HABIT',
    icon: 'BarChart2',
    color: '#2563EB',
    target: 15,
  },
  {
    code: 'HABIT_50',
    title: 'Imparable',
    description: 'Registrá al menos 50 movimientos personales en total.',
    category: 'HABIT',
    icon: 'Zap',
    color: '#0284C7',
    target: 50,
  },
  {
    code: 'MULTI_CURRENCY',
    title: 'Global',
    description: 'Registrá al menos 1 gasto en moneda extranjera (USD o EUR).',
    category: 'HABIT',
    icon: 'Globe',
    color: '#0EA5E9',
    target: 1,
  },
  {
    code: 'CATEGORIZER',
    title: 'Organizado',
    description: 'Creá al menos 3 categorías personalizadas.',
    category: 'HABIT',
    icon: 'Tag',
    color: '#7C3AED',
    target: 3,
  },

  // Salud Financiera y Ahorro (solo meses finalizados)
  {
    code: 'MONTHLY_SAVER',
    title: 'Ahorrador Mensual',
    description: 'Cerrá al menos 1 mes calendario finalizado con balance positivo.',
    category: 'SAVINGS',
    icon: 'Trophy',
    color: '#F59E0B',
    target: 1,
  },
  {
    code: 'SAVINGS_STREAK_3',
    title: 'Racha de Ahorro',
    description: 'Cerrá 3 meses calendario consecutivos con balance positivo.',
    category: 'SAVINGS',
    icon: 'Flame',
    color: '#EA580C',
    target: 3,
  },
  {
    code: 'SAVINGS_STREAK_6',
    title: 'Disciplina de Hierro',
    description: 'Cerrá 6 meses calendario consecutivos con balance positivo.',
    category: 'SAVINGS',
    icon: 'Award',
    color: '#D97706',
    target: 6,
  },
  {
    code: 'SUPER_SAVER',
    title: 'Meta 20%',
    description: 'Cerrá un mes finalizado ahorrando al menos el 20% de tus ingresos.',
    category: 'SAVINGS',
    icon: 'TrendingUp',
    color: '#10B981',
    target: 20,
  },
  {
    code: 'MEGA_SAVER',
    title: 'Ahorro Extremo',
    description: 'Cerrá un mes finalizado ahorrando al menos el 40% de tus ingresos.',
    category: 'SAVINGS',
    icon: 'Crown',
    color: '#059669',
    target: 40,
  },

  // Control de Presupuestos
  {
    code: 'FIRST_BUDGET',
    title: 'Primer Límite',
    description: 'Definí tu primer límite mensual por categoría.',
    category: 'BUDGET',
    icon: 'Sliders',
    color: '#8B5CF6',
    target: 1,
  },
  {
    code: 'PLANNER',
    title: 'Planificador',
    description: 'Creá al menos 3 límites mensuales por categoría.',
    category: 'BUDGET',
    icon: 'Target',
    color: '#7C3AED',
    target: 3,
  },
  {
    code: 'DISCIPLINED',
    title: 'Disciplinado',
    description: 'Finalizá un mes completo con al menos 1 límite activo sin superar ninguno.',
    category: 'BUDGET',
    icon: 'ShieldCheck',
    color: '#6366F1',
    target: 1,
  },

  // Comunidad y Gastos Compartidos
  {
    code: 'COMMUNITY',
    title: 'Comunidad',
    description: 'Participá como miembro activo en al menos 1 grupo.',
    category: 'COMMUNITY',
    icon: 'Users',
    color: '#059669',
    target: 1,
  },
  {
    code: 'SOCIAL_3',
    title: 'Anfitrión',
    description: 'Participá como miembro activo en al menos 3 grupos.',
    category: 'COMMUNITY',
    icon: 'UserPlus',
    color: '#0D9488',
    target: 3,
  },
  {
    code: 'FAIR_PAYER',
    title: 'Cuentas Claras',
    description: 'Saldá al menos 5 divisiones de gastos grupales.',
    category: 'COMMUNITY',
    icon: 'CheckCircle2',
    color: '#14B8A6',
    target: 5,
  },
];

@Injectable()
export class AchievementsService {
  constructor(private prisma: PrismaService) {}

  async getAchievements(userId: string): Promise<AchievementStatusDto[]> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1..12
    const startOfCurrentMonth = new Date(currentYear, currentMonth - 1, 1);

    const [
      existingUnlocked,
      transactions,
      customCategoriesCount,
      budgets,
      activeGroupsCount,
      paidSplitsCount,
    ] = await Promise.all([
      this.prisma.userAchievement.findMany({ where: { userId } }),
      this.prisma.transaction.findMany({
        where: { userId },
        select: {
          amount: true,
          type: true,
          currency: true,
          categoryId: true,
          date: true,
        },
      }),
      this.prisma.category.count({
        where: { userId, isDeleted: false },
      }),
      this.prisma.budget.findMany({
        where: { userId },
        select: { categoryId: true, amount: true, month: true, year: true },
      }),
      this.prisma.groupMember.count({
        where: { userId, status: 'ACTIVE' },
      }),
      this.prisma.expenseSplit.count({
        where: {
          userId,
          isPaid: true,
          groupExpense: { paidById: { not: userId } },
        },
      }),
    ]);

    const unlockedMap = new Map(
      existingUnlocked.map((u) => [u.code, u.unlockedAt]),
    );

    // Metricas de transacciones
    const totalTxCount = transactions.length;
    const foreignTxCount = transactions.filter(
      (t) => t.currency && t.currency !== 'ARS',
    ).length;

    const expensesByMonth = new Map<string, number>();
    const closedMonthlyTotals = new Map<
      string,
      { year: number; month: number; income: number; expense: number }
    >();
    const closedSpentByCatMonth = new Map<string, number>();

    for (const tx of transactions) {
      const d = new Date(tx.date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const monthKey = `${y}-${String(m).padStart(2, '0')}`;
      const amt = Number(tx.amount);

      if (tx.type === 'EXPENSE') {
        expensesByMonth.set(monthKey, (expensesByMonth.get(monthKey) ?? 0) + 1);
      }

      // Solo meses calendario completamente finalizados
      if (d < startOfCurrentMonth) {
        const entry = closedMonthlyTotals.get(monthKey) ?? {
          year: y,
          month: m,
          income: 0,
          expense: 0,
        };
        if (tx.type === 'INCOME') entry.income += amt;
        else {
          entry.expense += amt;
          const catKey = `${monthKey}:${tx.categoryId}`;
          closedSpentByCatMonth.set(
            catKey,
            (closedSpentByCatMonth.get(catKey) ?? 0) + amt,
          );
        }
        closedMonthlyTotals.set(monthKey, entry);
      }
    }

    const maxExpensesInMonth = Math.max(0, ...expensesByMonth.values());

    // Metricas de ahorro sobre meses cerrados
    const sortedClosedMonths = Array.from(closedMonthlyTotals.values()).sort(
      (a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month),
    );

    let positiveClosedMonths = 0;
    let maxSavingsPct = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let prevYm: number | null = null;

    for (const item of sortedClosedMonths) {
      const ym = item.year * 12 + (item.month - 1);
      const hasPositiveSavings = item.income > 0 && item.income > item.expense;

      if (hasPositiveSavings) {
        positiveClosedMonths += 1;
        const pct = Math.round(((item.income - item.expense) / item.income) * 100);
        if (pct > maxSavingsPct) maxSavingsPct = pct;

        if (prevYm !== null && ym === prevYm + 1) {
          currentStreak += 1;
        } else {
          currentStreak = 1;
        }
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
      prevYm = ym;
    }

    // Metricas de presupuestos en meses cerrados
    const budgetsByClosedMonth = new Map<string, typeof budgets>();
    for (const b of budgets) {
      const isClosed =
        b.year < currentYear || (b.year === currentYear && b.month < currentMonth);
      if (!isClosed) continue;
      const key = `${b.year}-${String(b.month).padStart(2, '0')}`;
      const list = budgetsByClosedMonth.get(key) ?? [];
      list.push(b);
      budgetsByClosedMonth.set(key, list);
    }

    let disciplinedMonths = 0;
    for (const [monthKey, monthBudgets] of budgetsByClosedMonth.entries()) {
      if (monthBudgets.length === 0) continue;
      const allRespected = monthBudgets.every((b) => {
        const spent = closedSpentByCatMonth.get(`${monthKey}:${b.categoryId}`) ?? 0;
        return spent <= Number(b.amount);
      });
      if (allRespected) {
        disciplinedMonths += 1;
      }
    }

    const progressByCode: Record<string, number> = {
      FIRST_STEP: totalTxCount,
      CONSTANT_MONTH: maxExpensesInMonth,
      HABIT_50: totalTxCount,
      MULTI_CURRENCY: foreignTxCount,
      CATEGORIZER: customCategoriesCount,
      MONTHLY_SAVER: positiveClosedMonths,
      SAVINGS_STREAK_3: maxStreak,
      SAVINGS_STREAK_6: maxStreak,
      SUPER_SAVER: maxSavingsPct,
      MEGA_SAVER: maxSavingsPct,
      FIRST_BUDGET: budgets.length,
      PLANNER: budgets.length,
      DISCIPLINED: disciplinedMonths,
      COMMUNITY: activeGroupsCount,
      SOCIAL_3: activeGroupsCount,
      FAIR_PAYER: paidSplitsCount,
    };

    // Detectar nuevos desbloqueos
    const newlyUnlocked: AchievementDef[] = [];
    for (const def of ACHIEVEMENTS_CATALOG) {
      const rawProgress = progressByCode[def.code] ?? 0;
      if (!unlockedMap.has(def.code) && rawProgress >= def.target) {
        newlyUnlocked.push(def);
      }
    }

    if (newlyUnlocked.length > 0) {
      await this.prisma.userAchievement.createMany({
        data: newlyUnlocked.map((def) => ({
          userId,
          code: def.code,
        })),
        skipDuplicates: true,
      });

      const unlockedNow = new Date();
      for (const def of newlyUnlocked) {
        unlockedMap.set(def.code, unlockedNow);
        await this.prisma.notification.create({
          data: {
            userId,
            title: 'Nuevo logro desbloqueado',
            message: `Completaste "${def.title}": ${def.description}`,
            type: NotificationType.SYSTEM,
          },
        });
      }
    }

    return ACHIEVEMENTS_CATALOG.map((def) => {
      const unlockedAt = unlockedMap.get(def.code) ?? null;
      const unlocked = unlockedAt !== null;
      const raw = progressByCode[def.code] ?? 0;
      const progress = unlocked ? def.target : Math.min(def.target, raw);

      let progressLabel = 'Completado';
      if (!unlocked) {
        if (def.category === 'SAVINGS' && sortedClosedMonths.length === 0) {
          progressLabel = 'Se evalúa al finalizar el mes';
        } else if (def.code === 'SUPER_SAVER' || def.code === 'MEGA_SAVER') {
          progressLabel = `${progress}% / ${def.target}%`;
        } else {
          progressLabel = `${progress} / ${def.target}`;
        }
      }

      return {
        ...def,
        unlocked,
        unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
        progress,
        progressLabel,
      };
    });
  }
}
