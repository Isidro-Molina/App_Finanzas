import {
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(60, { message: 'El nombre no puede superar los 60 caracteres' })
  name?: string;

  @IsOptional()
  @ValidateIf((_, val) => val !== null && val !== undefined)
  @IsString()
  @MaxLength(300, {
    message: 'La descripción no puede superar los 300 caracteres',
  })
  description?: string | null;

  @IsOptional()
  @ValidateIf((_, val) => val !== null && val !== undefined)
  @IsString()
  @MaxLength(500000, {
    message: 'La imagen es demasiado grande (máximo ~350KB)',
  })
  @Matches(/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/, {
    message:
      'El ícono debe ser una imagen válida en formato base64 (JPEG, PNG o WebP)',
  })
  icon?: string | null;

  @IsOptional()
  @IsBoolean()
  strictPayments?: boolean;
}
