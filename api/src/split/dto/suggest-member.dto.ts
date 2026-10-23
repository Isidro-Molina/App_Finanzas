import { IsEmail } from 'class-validator';

export class SuggestMemberDto {
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  email: string;
}
