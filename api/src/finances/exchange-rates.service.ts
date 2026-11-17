import { Injectable, Logger } from '@nestjs/common';

export interface ExchangeRateItem {
  rateType: 'TARJETA' | 'BLUE' | 'MEP' | 'OFICIAL' | 'EUR';
  label: string;
  currency: 'USD' | 'EUR';
  buy: number;
  sell: number;
  updatedAt: string;
}

interface DolarApiQuote {
  casa?: string;
  moneda?: string;
  nombre?: string;
  compra?: number;
  venta?: number;
  fechaActualizacion?: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);
  private cachedRates: ExchangeRateItem[] | null = null;
  private cacheTimestamp = 0;

  async getRates(): Promise<{
    rates: ExchangeRateItem[];
    source: 'live' | 'cache' | 'fallback';
  }> {
    const now = Date.now();
    if (this.cachedRates && now - this.cacheTimestamp < CACHE_TTL_MS) {
      return { rates: this.cachedRates, source: 'cache' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const [dolaresRes, euroRes] = await Promise.all([
        fetch('https://dolarapi.com/v1/dolares', {
          signal: controller.signal,
        }),
        fetch('https://dolarapi.com/v1/cotizaciones/eur', {
          signal: controller.signal,
        }).catch(() => null),
      ]);

      if (!dolaresRes.ok) {
        throw new Error(`DolarApi respondió con status ${dolaresRes.status}`);
      }

      const dolares = (await dolaresRes.json()) as DolarApiQuote[];
      const euro =
        euroRes && euroRes.ok
          ? ((await euroRes.json()) as DolarApiQuote)
          : null;

      const findCasa = (casa: string) =>
        dolares.find((d) => d.casa?.toLowerCase() === casa.toLowerCase());

      const tarjeta = findCasa('tarjeta');
      const blue = findCasa('blue');
      const mep = findCasa('bolsa');
      const oficial = findCasa('oficial');
      const nowIso = new Date().toISOString();

      const rates: ExchangeRateItem[] = [];

      if (tarjeta?.venta) {
        rates.push({
          rateType: 'TARJETA',
          label: 'Dólar Tarjeta',
          currency: 'USD',
          buy: Number(tarjeta.compra || tarjeta.venta),
          sell: Number(tarjeta.venta),
          updatedAt: tarjeta.fechaActualizacion || nowIso,
        });
      }

      if (blue?.venta) {
        rates.push({
          rateType: 'BLUE',
          label: 'Dólar Blue',
          currency: 'USD',
          buy: Number(blue.compra || blue.venta),
          sell: Number(blue.venta),
          updatedAt: blue.fechaActualizacion || nowIso,
        });
      }

      if (mep?.venta) {
        rates.push({
          rateType: 'MEP',
          label: 'Dólar MEP',
          currency: 'USD',
          buy: Number(mep.compra || mep.venta),
          sell: Number(mep.venta),
          updatedAt: mep.fechaActualizacion || nowIso,
        });
      }

      if (oficial?.venta) {
        rates.push({
          rateType: 'OFICIAL',
          label: 'Dólar Oficial',
          currency: 'USD',
          buy: Number(oficial.compra || oficial.venta),
          sell: Number(oficial.venta),
          updatedAt: oficial.fechaActualizacion || nowIso,
        });
      }

      if (euro?.venta) {
        rates.push({
          rateType: 'EUR',
          label: 'Euro',
          currency: 'EUR',
          buy: Number(euro.compra || euro.venta),
          sell: Number(euro.venta),
          updatedAt: euro.fechaActualizacion || nowIso,
        });
      }

      if (rates.length > 0) {
        this.cachedRates = rates;
        this.cacheTimestamp = now;
        return { rates, source: 'live' };
      }
    } catch (error) {
      this.logger.warn(
        `No se pudieron obtener cotizaciones en vivo: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (this.cachedRates) {
      return { rates: this.cachedRates, source: 'cache' };
    }

    return {
      rates: this.getFallbackRates(),
      source: 'fallback',
    };
  }

  private getFallbackRates(): ExchangeRateItem[] {
    const nowIso = new Date().toISOString();
    return [
      {
        rateType: 'TARJETA',
        label: 'Dólar Tarjeta',
        currency: 'USD',
        buy: 1450,
        sell: 1450,
        updatedAt: nowIso,
      },
      {
        rateType: 'BLUE',
        label: 'Dólar Blue',
        currency: 'USD',
        buy: 1200,
        sell: 1220,
        updatedAt: nowIso,
      },
      {
        rateType: 'MEP',
        label: 'Dólar MEP',
        currency: 'USD',
        buy: 1180,
        sell: 1190,
        updatedAt: nowIso,
      },
      {
        rateType: 'OFICIAL',
        label: 'Dólar Oficial',
        currency: 'USD',
        buy: 1050,
        sell: 1090,
        updatedAt: nowIso,
      },
      {
        rateType: 'EUR',
        label: 'Euro',
        currency: 'EUR',
        buy: 1150,
        sell: 1210,
        updatedAt: nowIso,
      },
    ];
  }
}
