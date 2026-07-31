import { IsEmail } from 'class-validator';

/**
 * Para agregar un miembro al grupo se usa el email.
 * Así el usuario no necesita saber el UUID del otro,
 * simplemente ingresa el email con el que se registró.
 */
export class AddMemberDto {
  @IsEmail()
  email: string;
}
