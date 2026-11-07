import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TransactionType } from '@prisma/client';
import { IsPositiveDecimal } from 'src/common/validators/is-positive-decimal.decorator';

export class CreateTransactionDto {
  @IsPositiveDecimal()
  @IsNotEmpty({ message: 'El monto es requerido' })
  amount: string; // Monto final en ARS (Prisma lo convierte a Decimal)

  @IsOptional()
  @IsIn(['ARS', 'USD', 'EUR'], {
    message: 'currency debe ser ARS, USD o EUR',
  })
  currency?: string;

  @IsOptional()
  @ValidateIf((_, val) => val !== null && val !== undefined)
  @IsPositiveDecimal()
  originalAmount?: string | null;

  @IsOptional()
  @ValidateIf((_, val) => val !== null && val !== undefined)
  @IsPositiveDecimal()
  exchangeRate?: string | null;

  @IsOptional()
  @ValidateIf((_, val) => val !== null && val !== undefined)
  @IsIn(['TARJETA', 'BLUE', 'MEP', 'OFICIAL', 'EUR', 'CUSTOM'])
  rateType?: string | null;

  @IsEnum(TransactionType, { message: 'type debe ser INCOME o EXPENSE' })
  type: TransactionType;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @ValidateIf((_, val) => val !== null && val !== undefined)
  @IsString()
  @MaxLength(200)
  description?: string | null;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha debe ser un string ISO 8601 válido' })
  date?: string; // Si no se manda, usa now() por defecto
}
