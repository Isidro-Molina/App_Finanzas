import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @IsDecimal({ decimal_digits: '0,2' }, { message: 'El monto debe ser un número decimal válido' })
  @IsNotEmpty()
  amount: string; // Llega como string, Prisma lo convierte a Decimal

  @IsEnum(TransactionType, { message: 'type debe ser INCOME o EXPENSE' })
  type: TransactionType;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha debe ser un string ISO 8601 válido' })
  date?: string; // Si no se manda, usa now() por defecto
}
