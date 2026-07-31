import { IsDecimal, IsInt, IsNotEmpty, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBudgetDto {
  @IsDecimal({ decimal_digits: '0,2' }, { message: 'El monto debe ser un decimal válido' })
  @IsNotEmpty()
  amount: string;

  @IsUUID()
  categoryId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number; // 1–12

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;
}
