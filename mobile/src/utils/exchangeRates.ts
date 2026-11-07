import apiClient from '../api/client';

export type RateOptionCode = 'ARS' | 'TARJETA' | 'BLUE' | 'MEP' | 'OFICIAL' | 'EUR';

export interface ExchangeRateItem {
  rateType: Exclude<RateOptionCode, 'ARS'>;
  label: string;
  currency: 'USD' | 'EUR';
  buy: number;
  sell: number;
  updatedAt: string;
}

export interface RateOptionMeta {
  code: RateOptionCode;
  label: string;
  shortLabel: string;
  badge: string;
  currency: 'ARS' | 'USD' | 'EUR';
  symbol: string;
}

export const RATE_OPTIONS: RateOptionMeta[] = [
  {
    code: 'ARS',
    label: 'Pesos (ARS)',
    shortLabel: 'Pesos',
    badge: '🇦🇷 ARS',
    currency: 'ARS',
    symbol: '$',
  },
  {
    code: 'TARJETA',
    label: 'Tarjeta Internacional (Dólar Tarjeta)',
    shortLabel: '💳 Dólar Tarjeta',
    badge: '💳 Dólar Tarjeta',
    currency: 'USD',
    symbol: 'USD',
  },
  {
    code: 'BLUE',
    label: 'Dólar Blue',
    shortLabel: '💵 Dólar Blue',
    badge: '💵 Dólar Blue',
    currency: 'USD',
    symbol: 'USD',
  },
  {
    code: 'MEP',
    label: 'Dólar MEP',
    shortLabel: '📈 Dólar MEP',
    badge: '📈 Dólar MEP',
    currency: 'USD',
    symbol: 'USD',
  },
  {
    code: 'OFICIAL',
    label: 'Dólar Oficial',
    shortLabel: '🏦 Dólar Oficial',
    badge: '🏦 Dólar Oficial',
    currency: 'USD',
    symbol: 'USD',
  },
  {
    code: 'EUR',
    label: 'Euro',
    shortLabel: '🇪🇺 Euro',
    badge: '🇪🇺 Euro',
    currency: 'EUR',
    symbol: 'EUR',
  },
];

export function getRateMeta(rateType?: string | null, currency?: string | null): RateOptionMeta {
  if (rateType) {
    const found = RATE_OPTIONS.find((r) => r.code === rateType);
    if (found) return found;
  }
  if (currency === 'EUR') {
    return RATE_OPTIONS.find((r) => r.code === 'EUR')!;
  }
  if (currency === 'USD') {
    return RATE_OPTIONS.find((r) => r.code === 'TARJETA')!;
  }
  return RATE_OPTIONS[0];
}

export function formatForeignAmount(
  amount: number | string | null | undefined,
  currency = 'USD',
): string {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

export async function fetchExchangeRates(): Promise<Record<string, ExchangeRateItem>> {
  try {
    const res = await apiClient.get<{ rates: ExchangeRateItem[] }>('/exchange-rates');
    if (res.data?.rates && Array.isArray(res.data.rates)) {
      const map: Record<string, ExchangeRateItem> = {};
      for (const r of res.data.rates) {
        map[r.rateType] = r;
      }
      return map;
    }
  } catch {
    // Fallback directo a DolarApi si el backend local aún no fue reiniciado
  }

  try {
    const [dolaresRes, euroRes] = await Promise.all([
      fetch('https://dolarapi.com/v1/dolares'),
      fetch('https://dolarapi.com/v1/cotizaciones/eur').catch(() => null),
    ]);
    const dolares = dolaresRes.ok ? await dolaresRes.json() : [];
    const euro = euroRes && euroRes.ok ? await euroRes.json() : null;

    const map: Record<string, ExchangeRateItem> = {};
    const findCasa = (casa: string) =>
      Array.isArray(dolares)
        ? dolares.find((d: any) => d.casa?.toLowerCase() === casa.toLowerCase())
        : null;

    const tarjeta = findCasa('tarjeta');
    const blue = findCasa('blue');
    const mep = findCasa('bolsa');
    const oficial = findCasa('oficial');
    const nowIso = new Date().toISOString();

    if (tarjeta?.venta) {
      map.TARJETA = {
        rateType: 'TARJETA',
        label: 'Dólar Tarjeta',
        currency: 'USD',
        buy: Number(tarjeta.compra || tarjeta.venta),
        sell: Number(tarjeta.venta),
        updatedAt: tarjeta.fechaActualizacion || nowIso,
      };
    }
    if (blue?.venta) {
      map.BLUE = {
        rateType: 'BLUE',
        label: 'Dólar Blue',
        currency: 'USD',
        buy: Number(blue.compra || blue.venta),
        sell: Number(blue.venta),
        updatedAt: blue.fechaActualizacion || nowIso,
      };
    }
    if (mep?.venta) {
      map.MEP = {
        rateType: 'MEP',
        label: 'Dólar MEP',
        currency: 'USD',
        buy: Number(mep.compra || mep.venta),
        sell: Number(mep.venta),
        updatedAt: mep.fechaActualizacion || nowIso,
      };
    }
    if (oficial?.venta) {
      map.OFICIAL = {
        rateType: 'OFICIAL',
        label: 'Dólar Oficial',
        currency: 'USD',
        buy: Number(oficial.compra || oficial.venta),
        sell: Number(oficial.venta),
        updatedAt: oficial.fechaActualizacion || nowIso,
      };
    }
    if (euro?.venta) {
      map.EUR = {
        rateType: 'EUR',
        label: 'Euro',
        currency: 'EUR',
        buy: Number(euro.compra || euro.venta),
        sell: Number(euro.venta),
        updatedAt: euro.fechaActualizacion || nowIso,
      };
    }
    return map;
  } catch {
    return {};
  }
}

