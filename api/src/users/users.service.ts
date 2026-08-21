import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Busca un usuario por su ID.
   * Usado internamente y por el endpoint GET /users/me.
   * Lanza 404 si no existe.
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      // Nunca devolvemos el passwordHash al cliente
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id "${id}" no encontrado`);
    }

    return user;
  }

  /**
   * Busca un usuario por email.
   * Incluye el passwordHash — solo para uso interno del AuthService.
   * NUNCA exponer este método en un endpoint directamente.
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Actualiza el perfil del usuario autenticado.
   * Si el nuevo email ya existe en otro usuario, lanza 409 Conflict.
   */
  async update(id: string, dto: UpdateUserDto) {
    // Verificar que el usuario existe
    await this.findById(id);

    // Si intenta cambiar el email, verificar que no esté ocupado
    if (dto.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException('El email ya está en uso por otro usuario');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Cambia la contraseña del usuario.
   * Verifica la contraseña actual antes de permitir el cambio.
   */
  async changePassword(id: string, dto: ChangePasswordDto) {
    // Buscar con passwordHash (findByEmail retorna el objeto completo)
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('La contraseña actual es incorrecta');

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { passwordHash: newHash } });
    return { message: 'Contraseña actualizada correctamente' };
  }

  /**
   * Elimina la cuenta del usuario autenticado.
   * En el futuro se podría hacer un soft delete (añadir deletedAt).
   */
  async remove(id: string) {
    await this.findById(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Cuenta eliminada correctamente' };
  }
}
