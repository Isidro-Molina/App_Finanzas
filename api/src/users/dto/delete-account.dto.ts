import { Equals, IsOptional, IsString } from 'class-validator';

export class DeleteAccountDto {
  @IsString({ message: 'La confirmación debe ser una cadena de texto' })
  @Equals('ELIMINAR', {
    message: 'Debés escribir ELIMINAR para confirmar la baja de tu cuenta',
  })
  confirmation: string;

  @IsOptional()
  @IsString()
  password?: string;
}

