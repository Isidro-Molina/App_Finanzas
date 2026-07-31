/**
 * Seed de categorías globales.
 * Correr con: npx ts-node prisma/seed.ts
 * O configurar en package.json como "prisma": { "seed": "ts-node prisma/seed.ts" }
 * y usar: npx prisma db seed
 */
import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

const GLOBAL_CATEGORIES = [
  // ─── GASTOS ──────────────────────────────────────────────────────────────
  { name: 'Supermercado',    icon: '🛒', type: TransactionType.EXPENSE },
  { name: 'Restaurantes',    icon: '🍔', type: TransactionType.EXPENSE },
  { name: 'Transporte',      icon: '🚌', type: TransactionType.EXPENSE },
  { name: 'Salud',           icon: '💊', type: TransactionType.EXPENSE },
  { name: 'Entretenimiento', icon: '🎬', type: TransactionType.EXPENSE },
  { name: 'Ropa',            icon: '👕', type: TransactionType.EXPENSE },
  { name: 'Servicios',       icon: '💡', type: TransactionType.EXPENSE },
  { name: 'Alquiler',        icon: '🏠', type: TransactionType.EXPENSE },
  { name: 'Educación',       icon: '📚', type: TransactionType.EXPENSE },
  { name: 'Viajes',          icon: '✈️', type: TransactionType.EXPENSE },
  { name: 'Otros gastos',    icon: '📦', type: TransactionType.EXPENSE },
  // ─── INGRESOS ────────────────────────────────────────────────────────────
  { name: 'Sueldo',          icon: '💼', type: TransactionType.INCOME },
  { name: 'Freelance',       icon: '💻', type: TransactionType.INCOME },
  { name: 'Inversiones',     icon: '📈', type: TransactionType.INCOME },
  { name: 'Otros ingresos',  icon: '💰', type: TransactionType.INCOME },
];

async function main() {
  console.log('🌱 Seeding categorías globales...');

  for (const category of GLOBAL_CATEGORIES) {
    await prisma.category.upsert({
      where: {
        // Upsert por nombre entre las categorías globales (userId = null)
        // Para evitar duplicados al correr el seed múltiples veces.
        // Usamos findFirst + create manualmente porque Prisma no soporta
        // upsert sobre un campo nullable directamente.
        id: (
          await prisma.category.findFirst({
            where: { name: category.name, userId: null },
          })
        )?.id ?? 'non-existent-id',
      },
      update: { icon: category.icon },
      create: { ...category, userId: null },
    });
  }

  console.log(`✅ ${GLOBAL_CATEGORIES.length} categorías globales creadas/actualizadas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
