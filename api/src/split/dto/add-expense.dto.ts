import {
  IsArray,
  IsDateString,
  IsDecimal,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SplitItemDto {
  @IsUUID()
  userId: string;

  @IsDecimal({ decimal_digits: '0,2' })
  @IsNotEmpty()
  amount: string;
}

export class AddExpenseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @IsDecimal({ decimal_digits: '0,2' })
  @IsNotEmpty()
  amount: string; // Monto total del gasto

  @IsOptional()
  @IsDateString()
  date?: string;

  /**
   * splits: define cuánto le toca a cada miembro.
   * - Si se manda → división personalizada.
   * - Si NO se manda → el servicio divide en partes iguales entre todos los miembros.
   * La suma de splits debe ser igual al amount total (validado en el servicio).
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitItemDto)
  splits?: SplitItemDto[];
}
