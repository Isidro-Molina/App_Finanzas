import { IsIn } from 'class-validator';

export class SetMemberRoleDto {
  @IsIn(['ADMIN', 'MEMBER'], { message: 'El rol debe ser ADMIN o MEMBER' })
  role: 'ADMIN' | 'MEMBER';
}
