import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { TransactionsService } from './transactions.service';
import { BudgetsService } from './budgets.service';
import { CategoriesController } from './controllers/categories.controller';
import { TransactionsController } from './controllers/transactions.controller';
import { BudgetsController } from './controllers/budgets.controller';

@Module({
  controllers: [
    CategoriesController,
    TransactionsController,
    BudgetsController,
  ],
  providers: [
    CategoriesService,
    TransactionsService,
    BudgetsService,
  ],
})
export class FinancesModule {}
