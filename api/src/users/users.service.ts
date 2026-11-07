import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
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
        isDeleted: true,
      },
    });

    if (!targetUser || targetUser.isDeleted) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
    };
  }

  /**
   * Busca un usuario por su ID.
   * Usado internamente y por el endpoint GET /users/me.
   * Lanza 404 si no existe o fue eliminado.
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      // Nunca devolvemos el passwordHash al cliente
      select: {
        id: true,
        email: true,
        name: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException(`Usuario con id "${id}" no encontrado`);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Busca un usuario activo por email.
   * Incluye el passwordHash — solo para uso interno del AuthService.
   * NUNCA exponer este método en un endpoint directamente.
   */
  async findByEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user || user.isDeleted) {
      return null;
    }
    return user;
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
    if (!user || user.isDeleted) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        'Tu cuenta fue creada con Google y no tiene contraseña actual. Usá "¿Olvidaste tu contraseña?" para configurar una.',
      );
    }

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
   * Elimina la cuenta del usuario autenticado:
   * - Bloquea la baja si el usuario mantiene saldos pendientes (a favor o en contra) en grupos compartidos.
   * - Elimina todos sus datos personales (transacciones, presupuestos, categorías personales, notificaciones, tokens).
   * - Elimina grupos individuales donde el usuario era el único miembro activo.
   * - En grupos compartidos con otros miembros activos, preserva el historial de gastos grupales (GroupExpense y ExpenseSplit)
   *   anonimizando la cuenta (isDeleted = true, email liberado, passwordHash vacío) pero conservando el nombre para el registro histórico.
   */
  async remove(id: string) {
    await this.findById(id);

    // 1. Verificar que no tenga saldos pendientes en grupos compartidos con otros miembros activos
    const activeMemberships = await this.prisma.groupMember.findMany({
      where: { userId: id, status: 'ACTIVE' },
      include: {
        group: {
          include: {
            members: {
              where: { userId: { not: id }, status: 'ACTIVE' },
            },
            expenses: {
              include: {
                splits: { where: { isPaid: false } },
              },
            },
          },
        },
      },
    });

    for (const membership of activeMemberships) {
      const group = membership.group;
      if (!group || group.members.length === 0) continue;

      let net = 0;
      for (const expense of group.expenses) {
        for (const split of expense.splits) {
          if (split.userId === expense.paidById) continue;
          const owed = Number(split.amountOwed);
          if (expense.paidById === id) {
            net += owed;
          } else if (split.userId === id) {
            net -= owed;
          }
        }
      }

      const roundedNet = +net.toFixed(2);
      if (roundedNet < -0.01) {
        throw new BadRequestException(
          `No podés eliminar tu cuenta porque tenés una deuda pendiente de $${Math.abs(roundedNet).toLocaleString('es-AR')} en el grupo "${group.name}". Saldá tus deudas grupales primero.`,
        );
      }
      if (roundedNet > 0.01) {
        throw new BadRequestException(
          `No podés eliminar tu cuenta porque en el grupo "${group.name}" te deben $${roundedNet.toLocaleString('es-AR')}. Marcá los pagos pendientes antes de darte de baja.`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // 2. Notificaciones y tokens
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: id } });

      // 3. Finanzas personales: desvincular splits de transacciones personales, borrar presupuestos, transacciones y categorías propias
      await tx.expenseSplit.updateMany({
        where: { transaction: { userId: id } },
        data: { transactionId: null },
      });
      await tx.budget.deleteMany({ where: { userId: id } });
      await tx.transaction.deleteMany({ where: { userId: id } });

      // Desvincular gastos grupales que apunten a categorías personalizadas del usuario antes de borrarlas
      await tx.groupExpense.updateMany({
        where: { category: { userId: id } },
        data: { categoryId: null },
      });
      await tx.category.deleteMany({ where: { userId: id } });

      // 4. Gestionar grupos donde el usuario participa o es creador
      const relatedGroups = await tx.group.findMany({
        where: {
          OR: [{ createdById: id }, { members: { some: { userId: id } } }],
        },
        include: {
          members: {
            where: {
              userId: { not: id },
              status: 'ACTIVE',
            },
          },
        },
      });

      for (const group of relatedGroups) {
        if (group.members.length === 0) {
          // Grupo sin otros miembros activos: eliminar gastos, splits, miembros y grupo completo
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
          // Grupo compartido con otros miembros activos:
          // Preservar GroupExpense y ExpenseSplit intactos para mantener el historial del grupo.
          const newOwnerId = group.members[0].userId;

          if (group.createdById === id) {
            await tx.group.update({
              where: { id: group.id },
              data: { createdById: newOwnerId },
            });
          }

          const hasOtherAdmin = group.members.some((m) => m.role === 'ADMIN');
          if (!hasOtherAdmin) {
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

          await tx.groupMember.deleteMany({
            where: { groupId: group.id, userId: id },
          });
        }
      }

      // Limpiar cualquier membresía pendiente remanente
      await tx.groupMember.deleteMany({ where: { userId: id } });

      // 5. Verificar si el usuario quedó referenciado en el historial de gastos de algún grupo compartido
      const [paidExpensesCount, splitsCount, createdGroupsCount] =
        await Promise.all([
          tx.groupExpense.count({ where: { paidById: id } }),
          tx.expenseSplit.count({ where: { userId: id } }),
          tx.group.count({ where: { createdById: id } }),
        ]);

      if (paidExpensesCount > 0 || splitsCount > 0 || createdGroupsCount > 0) {
        // Anonimizar credenciales y liberar email preservando el registro histórico en los grupos
        await tx.user.update({
          where: { id },
          data: {
            email: `deleted_${id}@deleted.finova.local`,
            passwordHash: '',
            isDeleted: true,
          },
        });
      } else {
        // Sin historial en grupos compartidos: eliminación física completa
        await tx.user.delete({ where: { id } });
      }
    });

    return { message: 'Cuenta eliminada correctamente' };
  }
}
