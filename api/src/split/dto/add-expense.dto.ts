import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsPositiveDecimal } from 'src/common/validators/is-positive-decimal.decorator';

class SplitItemDto {
  @IsUUID()
  userId: string;

  @IsPositiveDecimal()
  @IsNotEmpty()
  amount: string;
}

export class AddExpenseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @IsPositiveDecimal()
  @IsNotEmpty()
  amount: string; // Monto total del gasto

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

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
