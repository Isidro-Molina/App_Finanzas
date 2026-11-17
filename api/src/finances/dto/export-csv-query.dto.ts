import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { TransactionType } from '@prisma/client';

export class ExportCsvQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'from debe tener formato YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'to debe tener formato YYYY-MM-DD' })
  to?: string;

  @IsOptional()
  @IsEnum(TransactionType, { message: 'type debe ser INCOME o EXPENSE' })
  type?: TransactionType;
}
