import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ExchangeRatesService } from '../exchange-rates.service';

@UseGuards(JwtAuthGuard)
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  /** GET /api/v1/exchange-rates — Cotizaciones actualizadas (Dólar Tarjeta, Blue, MEP, Oficial y Euro) */
  @Get()
  getRates() {
    return this.exchangeRatesService.getRates();
  }
}
