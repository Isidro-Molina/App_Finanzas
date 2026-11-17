/**
 * Formatea un string ingresado por el usuario con separador de miles ('.')
 * y coma decimal (','), con un maximo de 2 decimales.
 *
 * Nota sobre el punto ('.'):
 * - Al borrar digitos de "1.234" -> "1.23", el punto restante era de miles,
 *   no decimal, por eso se eliminan los puntos internos al re-formatear.
 * - Si el usuario presiona '.' al final (ej: "77.000."), se interpreta como
 *   intencion de escribir decimales y se convierte en ','.
 */
export function formatAmountInput(raw: string): string {
  if (!raw) return '';

  // Permitir solo digitos, comas y puntos
  let cleaned = raw.replace(/[^0-9.,]/g, '');
  if (!cleaned) return '';

  // Si no hay coma aun y termina en punto, tratar ese punto final como coma decimal
  if (!cleaned.includes(',') && cleaned.endsWith('.')) {
    cleaned = `${cleaned.slice(0, -1)},`;
  }

  const commaIndex = cleaned.indexOf(',');
  const hasComma = commaIndex !== -1;

  const rawInt = hasComma ? cleaned.slice(0, commaIndex) : cleaned;
  const rawDec = hasComma ? cleaned.slice(commaIndex + 1) : '';

  // Quitar puntos y comas de la parte entera y normalizar ceros a la izquierda
  let intDigits = rawInt.replace(/[.,]/g, '');
  intDigits = intDigits.replace(/^0+(?=\d)/, '');

  if (hasComma && !intDigits) {
    intDigits = '0';
  }

  if (!intDigits && !hasComma) {
    return '';
  }

  // Agregar puntos cada 3 digitos desde la derecha
  const formattedInt = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (!hasComma) {
    return formattedInt;
  }

  const decDigits = rawDec.replace(/[.,]/g, '').slice(0, 2);
  return `${formattedInt},${decDigits}`;
}

/**
 * Parsea un monto formateado (ej: "77.000", "1.234,56") a number (77000, 1234.56).
 * Devuelve 0 si la cadena esta vacia o no es un numero valido.
 */
export function parseAmountInput(formatted: string): number {
  if (!formatted) return 0;

  const cleaned = formatted.replace(/[^0-9.,]/g, '');
  if (!cleaned) return 0;

  const commaIndex = cleaned.indexOf(',');
  if (commaIndex !== -1) {
    const intPart = cleaned.slice(0, commaIndex).replace(/\./g, '') || '0';
    const decPart = cleaned.slice(commaIndex + 1).replace(/[.,]/g, '').slice(0, 2);
    const num = Number(decPart ? `${intPart}.${decPart}` : intPart);
    return Number.isFinite(num) ? num : 0;
  }

  // Sin coma: los puntos son separadores de miles
  const intOnly = cleaned.replace(/\./g, '');
  if (!intOnly) return 0;
  const num = Number(intOnly);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Convierte un monto numerico o string del backend (ej: "77000.00" o 1234.5)
 * al formato de input con separador de miles (ej: "77.000" o "1.234,5").
 */
export function formatNumberToAmountInput(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  if (!Number.isFinite(num) || num <= 0) return '';

  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const trimmedDec = decPart.replace(/0+$/, '');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return trimmedDec ? `${formattedInt},${trimmedDec}` : formattedInt;
}
