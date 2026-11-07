import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class SuggestMemberDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  email: string;
}
