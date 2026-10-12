import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  email: string;
}
