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
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
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
   * DELETE /api/v1/users/me
   * El usuario solo puede eliminar su propia cuenta.
   */
  @Delete('me')
  remove(@Request() req: { user: { userId: string } }) {
    return this.usersService.remove(req.user.userId);
  }
}
