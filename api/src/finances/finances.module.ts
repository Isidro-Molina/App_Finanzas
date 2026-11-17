import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { TransactionsService } from './transactions.service';
import { BudgetsService } from './budgets.service';
import { ExchangeRatesService } from './exchange-rates.service';
import { CategoriesController } from './controllers/categories.controller';
import { TransactionsController } from './controllers/transactions.controller';
import { BudgetsController } from './controllers/budgets.controller';
import { ExchangeRatesController } from './controllers/exchange-rates.controller';

@Module({
  controllers: [
    CategoriesController,
    TransactionsController,
    BudgetsController,
    ExchangeRatesController,
  ],
  providers: [
    CategoriesService,
    TransactionsService,
    BudgetsService,
    ExchangeRatesService,
  ],
})
export class FinancesModule {}
