import { IsInt, IsNotEmpty, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsPositiveDecimal } from 'src/common/validators/is-positive-decimal.decorator';

export class CreateBudgetDto {
  @IsPositiveDecimal()
  @IsNotEmpty({ message: 'El monto es requerido' })
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
