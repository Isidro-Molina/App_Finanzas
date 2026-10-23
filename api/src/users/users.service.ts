import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Busca el perfil público de un usuario.
   * Solo permite ver perfiles propios o de usuarios con quienes se comparte un grupo activo.
   */
  async findPublicProfile(requesterId: string, targetId: string) {
    if (requesterId === targetId) {
      return this.findById(requesterId);
    }

    const sharedGroup = await this.prisma.groupMember.findFirst({
      where: {
        userId: requesterId,
        status: 'ACTIVE',
        group: {
          members: {
            some: {
              userId: targetId,
              status: 'ACTIVE',
            },
          },
        },
      },
    });

    if (!sharedGroup) {
      throw new ForbiddenException(
        'No tenés permiso para ver el perfil de este usuario',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return targetUser;
  }

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
    if (!valid)
      throw new UnauthorizedException('La contraseña actual es incorrecta');

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: newHash },
    });
    return { message: 'Contraseña actualizada correctamente' };
  }

  /**
   * Elimina la cuenta del usuario autenticado limpiando sus datos asociados.
   */
  async remove(id: string) {
    await this.findById(id);

    await this.prisma.$transaction(async (tx) => {
      // 1. Notificaciones y tokens
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: id } });

      // 2. Finanzas personales: presupuestos, transacciones y categorías propias
      await tx.budget.deleteMany({ where: { userId: id } });
      await tx.transaction.deleteMany({ where: { userId: id } });
      await tx.category.deleteMany({ where: { userId: id } });

      // 3. Splits y membresías
      await tx.expenseSplit.deleteMany({ where: { userId: id } });
      await tx.groupMember.deleteMany({ where: { userId: id } });

      // 4. Si el usuario creó grupos vacíos o es creador, reasignar creador o eliminar grupos sin miembros
      const createdGroups = await tx.group.findMany({
        where: { createdById: id },
        include: {
          members: {
            where: {
              userId: { not: id },
              status: 'ACTIVE',
            },
          },
        },
      });

      for (const group of createdGroups) {
        if (group.members.length === 0) {
          // Si no tiene otros miembros activos, borrar gastos, miembros pendientes y el grupo
          const expenses = await tx.groupExpense.findMany({
            where: { groupId: group.id },
          });
          const expenseIds = expenses.map((e) => e.id);
          if (expenseIds.length > 0) {
            await tx.expenseSplit.deleteMany({
              where: { groupExpenseId: { in: expenseIds } },
            });
            await tx.groupExpense.deleteMany({ where: { groupId: group.id } });
          }
          await tx.groupMember.deleteMany({ where: { groupId: group.id } });
          await tx.group.delete({ where: { id: group.id } });
        } else {
          // Reasignar al primer miembro activo como creador y asegurar rol ADMIN
          const newOwnerId = group.members[0].userId;
          await tx.group.update({
            where: { id: group.id },
            data: { createdById: newOwnerId },
          });
          await tx.groupMember.update({
            where: {
              userId_groupId: {
                userId: newOwnerId,
                groupId: group.id,
              },
            },
            data: { role: 'ADMIN' },
          });
        }
      }

      // 5. Gastos pagados en grupos por el usuario (splits asociados se eliminan en cascada)
      const userExpenses = await tx.groupExpense.findMany({
        where: { paidById: id },
      });
      const userExpenseIds = userExpenses.map((e) => e.id);
      if (userExpenseIds.length > 0) {
        await tx.expenseSplit.deleteMany({
          where: { groupExpenseId: { in: userExpenseIds } },
        });
        await tx.groupExpense.deleteMany({ where: { paidById: id } });
      }

      // 6. Finalmente eliminar el usuario
      await tx.user.delete({ where: { id } });
    });

    return { message: 'Cuenta eliminada correctamente' };
  }
}
