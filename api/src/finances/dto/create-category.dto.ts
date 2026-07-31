import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name: string;

  @IsEnum(TransactionType, { message: 'type debe ser INCOME o EXPENSE' })
  type: TransactionType;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  icon?: string; // Ej: "🛒", "💼", "🍔"
}
