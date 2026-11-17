export type ExportCsvType = 'ALL' | 'EXPENSE' | 'INCOME';

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Formatea una fecha como DD-MM-YYYY para nombres de archivo validos en iOS/Android.
 */
export function formatCsvDisplayDate(date: Date): string {
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
}

/**
 * Formatea una fecha como YYYY-MM-DD en horario local para query params del API.
 */
export function formatCsvQueryDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Genera el nombre del archivo CSV exportado sin usar '/' (prohibido en iOS).
 * Ej: "Gastos 01-10-2026 - 31-10-2026.csv"
 */
export function buildCsvFileName(
  from: Date,
  to: Date,
  type: ExportCsvType = 'ALL',
): string {
  const prefix =
    type === 'EXPENSE'
      ? 'Gastos'
      : type === 'INCOME'
        ? 'Ingresos'
        : 'Movimientos';
  return `${prefix} ${formatCsvDisplayDate(from)} - ${formatCsvDisplayDate(to)}.csv`;
}
