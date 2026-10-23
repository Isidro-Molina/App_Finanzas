/**
 * Seed de categorías globales: Servicios, Salidas, Otros, Sueldo, Comida.
 */
import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

const GLOBAL_CATEGORIES = [
  { name: 'Comida',    icon: '🍔', type: TransactionType.EXPENSE },
  { name: 'Servicios', icon: '💡', type: TransactionType.EXPENSE },
  { name: 'Salidas',   icon: '🍿', type: TransactionType.EXPENSE },
  { name: 'Otros',     icon: '📦', type: TransactionType.EXPENSE },
  { name: 'Sueldo',    icon: '💼', type: TransactionType.INCOME },
];

async function main() {
  console.log('🌱 Seeding 5 categorías globales...');

  // 1. Asegurar que las 5 categorías existen
  const targetCategoryMap = new Map<string, string>();
  for (const category of GLOBAL_CATEGORIES) {
    let existing = await prisma.category.findFirst({
      where: { name: category.name, userId: null },
    });

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { icon: category.icon, type: category.type },
      });
      targetCategoryMap.set(category.name, existing.id);
    } else {
      const created = await prisma.category.create({
        data: { ...category, userId: null },
      });
      targetCategoryMap.set(category.name, created.id);
    }
  }

  const comidaId = targetCategoryMap.get('Comida')!;
  const salidasId = targetCategoryMap.get('Salidas')!;
  const otrosId = targetCategoryMap.get('Otros')!;

  // 2. Buscar categorías globales viejas para reasignar y limpiar
  const allowedNames = GLOBAL_CATEGORIES.map((c) => c.name);
  const oldGlobals = await prisma.category.findMany({
    where: {
      userId: null,
      name: { notIn: allowedNames },
    },
  });

  for (const oldCat of oldGlobals) {
    let newTargetId = otrosId;
    if (oldCat.name === 'Supermercado' || oldCat.name === 'Restaurantes') {
      newTargetId = comidaId;
    } else if (oldCat.name === 'Entretenimiento') {
      newTargetId = salidasId;
    }

    // Reasignar transacciones asociadas
    await prisma.transaction.updateMany({
      where: { categoryId: oldCat.id },
      data: { categoryId: newTargetId },
    });

    // Reasignar o eliminar budgets asociados
    await prisma.budget.deleteMany({
      where: { categoryId: oldCat.id },
    });

    // Eliminar categoría vieja
    await prisma.category.delete({
      where: { id: oldCat.id },
    });
  }

  console.log(`✅ Categorías globales listas: ${GLOBAL_CATEGORIES.map((c) => c.name).join(', ')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
