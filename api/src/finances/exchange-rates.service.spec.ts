import { ExchangeRatesService } from './exchange-rates.service';

describe('ExchangeRatesService - Cotizaciones (Dólar Tarjeta, Blue, MEP, Oficial, Euro)', () => {
  let service: ExchangeRatesService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new ExchangeRatesService();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('debe obtener y mapear correctamente Dólar Tarjeta, Blue, MEP, Oficial y Euro', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              casa: 'tarjeta',
              compra: 1400,
              venta: 1450,
              fechaActualizacion: '2026-11-07T14:00:00Z',
            },
            {
              casa: 'blue',
              compra: 1200,
              venta: 1220,
              fechaActualizacion: '2026-11-07T14:00:00Z',
            },
            {
              casa: 'bolsa',
              compra: 1180,
              venta: 1190,
              fechaActualizacion: '2026-11-07T14:00:00Z',
            },
            {
              casa: 'oficial',
              compra: 1050,
              venta: 1090,
              fechaActualizacion: '2026-11-07T14:00:00Z',
            },
          ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            moneda: 'EUR',
            compra: 1150,
            venta: 1210,
            fechaActualizacion: '2026-11-07T14:00:00Z',
          }),
      });

    const result = await service.getRates();

    expect(result.source).toBe('live');
    expect(result.rates).toHaveLength(5);
    expect(result.rates.find((r) => r.rateType === 'TARJETA')?.sell).toBe(1450);
    expect(result.rates.find((r) => r.rateType === 'BLUE')?.sell).toBe(1220);
    expect(result.rates.find((r) => r.rateType === 'EUR')?.currency).toBe(
      'EUR',
    );
  });

  it('debe retornar cotizaciones de respaldo si la API externa falla', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network down'));

    const result = await service.getRates();

    expect(result.source).toBe('fallback');
    expect(result.rates.some((r) => r.rateType === 'TARJETA')).toBe(true);
  });
});
