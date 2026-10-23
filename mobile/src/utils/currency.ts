/**
 * Formateador de moneda oficial para la app.
 * Siempre muestra los centavos con 2 decimales (ej: $1.500,00 o $1.500,50).
 */
export const formatCurrency = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined) return '$0,00';
  const num = typeof amount === 'string' ? parseFloat(amount.replace(',', '.')) : amount;
  if (isNaN(num)) return '$0,00';
  return `$${num.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatAmount = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined) return '0,00';
  const num = typeof amount === 'string' ? parseFloat(amount.replace(',', '.')) : amount;
  if (isNaN(num)) return '0,00';
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
