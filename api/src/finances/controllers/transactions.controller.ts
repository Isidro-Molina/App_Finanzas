import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TransactionsService } from '../transactions.service';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { TransactionQueryDto } from '../dto/transaction-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * GET /api/v1/transactions
   * Query params opcionales: month, year, type, categoryId
   * Ej: /transactions?month=7&year=2026&type=EXPENSE
   */
  @Get()
  findAll(
    @Request() req: { user: { userId: string } },
    @Query() query: TransactionQueryDto,
  ) {
    return this.transactionsService.findAll(req.user.userId, query);
  }

  /**
   * GET /api/v1/transactions/summary?month=7&year=2026
   * Devuelve: { totalIncome, totalExpense, balance, byCategory[] }
   * ⚠️ Esta ruta debe ir ANTES de :id para que NestJS no interprete
   *    "summary" como un UUID de transacción.
   */
  @Get('summary')
  getSummary(
    @Request() req: { user: { userId: string } },
    @Query() query: TransactionQueryDto,
  ) {
    const now = new Date();
    return this.transactionsService.getSummary(
      req.user.userId,
      query.month ?? now.getMonth() + 1,
      query.year  ?? now.getFullYear(),
    );
  }

  /** POST /api/v1/transactions */
  @Post()
  create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(req.user.userId, dto);
  }

  /** PATCH /api/v1/transactions/:id */
  @Patch(':id')
  update(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: Partial<CreateTransactionDto>,
  ) {
    return this.transactionsService.update(req.user.userId, id, dto);
  }

  /** DELETE /api/v1/transactions/:id */
  @Delete(':id')
  remove(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.transactionsService.remove(req.user.userId, id);
  }
}
