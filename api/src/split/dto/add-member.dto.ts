import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Para agregar un miembro al grupo se usa el email.
 * Así el usuario no necesita saber el UUID del otro,
 * simplemente ingresa el email con el que se registró.
 */
export class AddMemberDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;
}
