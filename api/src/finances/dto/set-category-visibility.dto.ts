import { IsBoolean } from 'class-validator';

export class SetCategoryVisibilityDto {
  @IsBoolean({ message: 'hidden debe ser booleano' })
  hidden: boolean;
}
