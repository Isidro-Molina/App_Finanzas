import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO para actualizar el perfil del usuario autenticado.
 * Todos los campos son opcionales (partial update).
 *
 * La creación de usuario (con password) vive en AuthModule/dto/register.dto.ts
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
