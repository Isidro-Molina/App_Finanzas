export const CATEGORY_PRESET_COLORS = [
  '#2563EB', // Azul
  '#7C3AED', // Violeta
  '#DB2777', // Rosa
  '#059669', // Verde
  '#EA580C', // Naranja
  '#0891B2', // Cyan
  '#DC2626', // Rojo
  '#64748B', // Gris
];

const PALETTE = [
  '#2563EB', // Azul
  '#7C3AED', // Violeta
  '#DB2777', // Rosa
  '#059669', // Verde
  '#D97706', // Ámbar
  '#0891B2', // Cyan
  '#DC2626', // Rojo
  '#65A30D', // Lima
  '#9333EA', // Púrpura
  '#EA580C', // Naranja
];

const FIXED_CATEGORY_COLORS: Record<string, string> = {
  comida: '#F97316',
  otros: '#7C3AED',
  salidas: '#DB2777',
  servicios: '#059669',
  sueldo: '#059669',
  transporte: '#D97706',
  salud: '#0891B2',
  educacion: '#DC2626',
  educación: '#DC2626',
  hogar: '#65A30D',
  ropa: '#9333EA',
  entretenimiento: '#DB2777',
  supermercado: '#F97316',
};

/**
 * Devuelve siempre el mismo color para una categoría en toda la app
 * (selector de gasto, gráfico de torta, listado de últimos gastos y gestión de categorías),
 * sin depender del índice o del ordenamiento de la lista.
 */
export function getCategoryColor(
  icon?: string | null,
  name?: string | null,
): string {
  if (icon && icon.startsWith('#')) {
    return icon;
  }

  const normalized = (name || '').trim().toLowerCase();
  if (normalized && FIXED_CATEGORY_COLORS[normalized]) {
    return FIXED_CATEGORY_COLORS[normalized];
  }

  if (normalized) {
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
    }
    return PALETTE[hash % PALETTE.length];
  }

  return PALETTE[0];
}

