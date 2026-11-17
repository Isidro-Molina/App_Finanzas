import { buildCsvFileName, formatCsvQueryDate } from '../exportCsv';

describe('exportCsv utilities', () => {
  it('buildCsvFileName usa guiones y el prefijo correcto segun el tipo', () => {
    const from = new Date(2026, 9, 1); // 01-10-2026
    const to = new Date(2026, 9, 31); // 31-10-2026

    const expensesName = buildCsvFileName(from, to, 'EXPENSE');
    expect(expensesName).toBe('Gastos 01-10-2026 - 31-10-2026.csv');
    expect(expensesName).not.toContain('/');

    expect(buildCsvFileName(from, to, 'INCOME')).toBe(
      'Ingresos 01-10-2026 - 31-10-2026.csv',
    );
    expect(buildCsvFileName(from, to, 'ALL')).toBe(
      'Movimientos 01-10-2026 - 31-10-2026.csv',
    );
  });

  it('formatCsvQueryDate formatea en YYYY-MM-DD', () => {
    expect(formatCsvQueryDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
