import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { BudgetsService } from '../budgets.service';
import { CreateBudgetDto } from '../dto/create-budget.dto';

class BudgetQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;
}

@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  /**
   * GET /api/v1/budgets?month=7&year=2026
   * Devuelve presupuestos con gasto real, restante y % utilizado.
   */
  @Get()
  findAll(
    @Request() req: { user: { userId: string } },
    @Query() query: BudgetQueryDto,
  ) {
    const now = new Date();
    return this.budgetsService.findAll(
      req.user.userId,
      query.month ?? now.getMonth() + 1,
      query.year  ?? now.getFullYear(),
    );
  }

  /**
   * POST /api/v1/budgets
   * Crea o actualiza el presupuesto de esa categoría/mes/año (upsert).
   */
  @Post()
  upsert(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateBudgetDto,
  ) {
    return this.budgetsService.upsert(req.user.userId, dto);
  }

  /** DELETE /api/v1/budgets/:id */
  @Delete(':id')
  remove(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.budgetsService.remove(req.user.userId, id);
  }
}
