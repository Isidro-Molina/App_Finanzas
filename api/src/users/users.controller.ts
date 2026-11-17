import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

/**
 * UsersController — Gestión del perfil de usuario.
 *
 * Todos los endpoints requieren JWT (usuario autenticado).
 *
 * Rutas:
 *   GET    /api/v1/users/:id   → Ver perfil de un usuario
 *   PATCH  /api/v1/users/me    → Editar el perfil propio
 *   DELETE /api/v1/users/me    → Eliminar cuenta propia
 */
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/deletion-check')
  getDeletionCheck(@Request() req: { user: { userId: string } }) {
    return this.usersService.getDeletionBlockers(req.user.userId);
  }

  @Get(':id')
  findOne(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.usersService.findPublicProfile(req.user.userId, id);
  }

  /**
   * PATCH /api/v1/users/me
   * El usuario solo puede editar su propio perfil.
   * El id se extrae del JWT, no del URL → imposible editar a otro usuario.
   */
  @Patch('me')
  update(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(req.user.userId, dto);
  }

  /**
   * PATCH /api/v1/users/me/password
   * Cambia la contraseña del usuario autenticado.
   * Requiere la contraseña actual para confirmar la identidad.
   */
  @Patch('me/password')
  changePassword(
    @Request() req: { user: { userId: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(req.user.userId, dto);
  }

  /**
   * DELETE /api/v1/users/me
   * El usuario solo puede eliminar su propia cuenta.
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Delete('me')
  remove(
    @Request() req: { user: { userId: string } },
    @Body() dto: DeleteAccountDto,
  ) {
    return this.usersService.remove(req.user.userId, dto);
  }
}
