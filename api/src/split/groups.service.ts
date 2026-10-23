import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { MailService } from 'src/mail/mail.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { SuggestMemberDto } from './dto/suggest-member.dto';
import { AddExpenseDto } from './dto/add-expense.dto';
import { BalanceService } from './balance.service';


// ─── Helpers de inclusión Prisma ─────────────────────────────────────────────

const MEMBER_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
} as const;

// Solo miembros ACTIVOS cuentan como parte del grupo (los PENDING aún no aceptaron)
const GROUP_INCLUDE = {
  members:  { where: { status: 'ACTIVE' as const }, include: MEMBER_INCLUDE },
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

// ─── Servicio ─────────────────────────────────────────────────────────────────

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private mailService: MailService,
    private notificationsService: NotificationsService,
    private balanceService: BalanceService,
  ) {}

  // ── CRUD de grupos ──────────────────────────────────────────────────────────

  /** Lista todos los grupos en los que participa el usuario */
  findAll(userId: string) {
    return this.prisma.group.findMany({
      where: { members: { some: { userId, status: 'ACTIVE' } } },
      include: GROUP_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: GROUP_INCLUDE,
    });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    this.assertMember(userId, group.members);
    return group;
  }

  /**
   * Crea el grupo y agrega al creador como ADMIN automáticamente.
   * Usa una transacción para garantizar atomicidad (o se crean ambos o ninguno).
   */
  async create(userId: string, dto: CreateGroupDto) {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          name: dto.name,
          createdById: userId,
          members: {
            create: { userId, role: 'ADMIN' },
          },
        },
        include: GROUP_INCLUDE,
      });
      return group;
    });
  }

  /** Actualiza nombre, descripción e ícono del grupo (solo ADMIN) */
  async update(userId: string, groupId: string, dto: UpdateGroupDto) {
    await this.assertAdmin(userId, groupId);
    return this.prisma.group.update({
      where: { id: groupId },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.icon !== undefined && { icon: dto.icon?.trim() || null }),
      },
      include: GROUP_INCLUDE,
    });
  }

  /** Marca el grupo como saldado (solo ADMIN) */
  async settle(userId: string, groupId: string) {
    await this.assertAdmin(userId, groupId);
    return this.prisma.group.update({
      where: { id: groupId },
      data: { isSettled: true },
      include: GROUP_INCLUDE,
    });
  }

  /** Elimina el grupo completo (solo ADMIN) */
  async remove(userId: string, groupId: string) {
    await this.assertAdmin(userId, groupId);

    const balance = await this.balanceService.getBalance(userId, groupId);
    if (!balance.isSettled) {
      throw new BadRequestException(
        'No podés eliminar el grupo mientras haya deudas pendientes. Saldá las cuentas primero.',
      );
    }

    await this.deleteGroupCascade(groupId);
    return { message: 'Grupo eliminado' };
  }

  // ── Miembros ────────────────────────────────────────────────────────────────

  /**
   * Invita a un usuario al grupo por email.
   * Si tiene cuenta queda como PENDING hasta que acepte (no es parte del grupo todavía).
   * Si no tiene cuenta se le envía un email para que se registre.
   */
  async addMember(userId: string, groupId: string, dto: AddMemberDto) {
    // 0. Solo el ADMIN puede invitar directamente
    await this.assertAdmin(userId, groupId);

    // 1. Verificar datos del grupo
    const group = await this.findOne(userId, groupId);
    const inviter = await this.usersService.findById(userId);

    // 2. Buscar si el usuario invitado ya tiene cuenta en la app
    const newUser = await this.usersService.findByEmail(dto.email);

    if (!newUser) {
      // Usuario sin cuenta: enviar email de invitación para que se registre
      void this.mailService.sendGroupInvitation({
        toEmail: dto.email,
        inviterName: inviter?.name ?? 'Un usuario',
        groupName: group.name,
        userExists: false,
      });
      return { message: `Se envió un email de invitación a ${dto.email}. Cuando se registre, podrás invitarlo al grupo.` };
    }

    // 3. Verificar que no sea ya miembro ni tenga una invitación pendiente
    const existing = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: newUser.id, groupId } },
    });
    if (existing?.status === 'ACTIVE') {
      throw new BadRequestException('El usuario ya es miembro del grupo');
    }
    if (existing?.status === 'PENDING') {
      throw new BadRequestException('El usuario ya tiene una invitación pendiente');
    }

    // 4. Crear la invitación (PENDING)
    const member = await this.prisma.groupMember.create({
      data: {
        userId: newUser.id,
        groupId,
        role: 'MEMBER',
        status: 'PENDING',
        invitedById: userId,
      },
      include: MEMBER_INCLUDE,
    });

    // 5. Avisar al invitado por email (sin bloquear la respuesta)
    void this.mailService.sendGroupInvitation({
      toEmail: dto.email,
      inviterName: inviter?.name ?? 'Un usuario',
      groupName: group.name,
      userExists: true,
    });

    // Notificación in-app: si falla no debe romper la acción principal
    try {
      await this.notificationsService.create({
        userId: newUser.id,
        title: 'Te invitaron a un grupo',
        message: `${inviter?.name ?? 'Un usuario'} te invitó al grupo "${group.name}".`,
        type: 'GROUP_INVITE',
        relatedId: groupId,
      });
    } catch (error) {
      console.error('Error creando notificación de invitación:', error);
    }

    return member;
  }

  /** El invitado acepta la invitación: pasa a ser miembro ACTIVO */
  async acceptInvitation(userId: string, groupId: string) {
    const invite = await this.findPendingInvite(userId, groupId);

    const member = await this.prisma.groupMember.update({
      where: { userId_groupId: { userId: invite.userId, groupId } },
      data: { status: 'ACTIVE', joinedAt: new Date() },
      include: MEMBER_INCLUDE,
    });
    await this.notificationsService.markInviteRead(userId, groupId);
    return member;
  }

  /** El invitado rechaza la invitación: se elimina la fila pendiente */
  async rejectInvitation(userId: string, groupId: string) {
    await this.findPendingInvite(userId, groupId);

    await this.prisma.groupMember.delete({
      where: { userId_groupId: { userId, groupId } },
    });
    await this.notificationsService.markInviteRead(userId, groupId);
    return { message: 'Invitación rechazada' };
  }

  /** Elimina un miembro (solo ADMIN puede hacerlo, o el propio usuario saliendo) */
  async removeMember(requesterId: string, groupId: string, targetUserId: string) {
    const isSelf  = requesterId === targetUserId;
    const isAdmin = await this.isMemberWithRole(requesterId, groupId, 'ADMIN');

    if (!isSelf && !isAdmin) {
      throw new ForbiddenException('Solo un ADMIN puede eliminar a otros miembros');
    }

    const member = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });
    if (!member) throw new NotFoundException('Miembro no encontrado en el grupo');

    // Validar deuda del miembro a eliminar
    const balance = await this.balanceService.getBalance(requesterId, groupId);
    const targetBal = balance.balances.find((b) => b.userId === targetUserId);
    if (targetBal && targetBal.net < -0.01) {
      throw new BadRequestException(
        `No se puede eliminar a este miembro porque tiene una deuda pendiente de $${Math.abs(targetBal.net).toLocaleString('es-AR')}. Debe saldarla primero.`,
      );
    }
    if (targetBal && targetBal.net > 0.01) {
      throw new BadRequestException(
        `No se puede eliminar a este miembro porque el grupo le debe $${targetBal.net.toLocaleString('es-AR')}. Debe saldarse el saldo primero.`,
      );
    }

    await this.prisma.groupMember.delete({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });
    return { message: 'Miembro eliminado del grupo' };
  }

  /**
   * Un miembro común sugiere al admin invitar a una persona.
   * Envía una notificación in-app a todos los admins activos del grupo.
   */
  async suggestMember(userId: string, groupId: string, dto: SuggestMemberDto) {
    const group = await this.findOne(userId, groupId);
    const sender = await this.usersService.findById(userId);

    // Obtener los admins del grupo
    const admins = await this.prisma.groupMember.findMany({
      where: { groupId, role: 'ADMIN', status: 'ACTIVE' },
    });

    for (const admin of admins) {
      if (admin.userId !== userId) {
        await this.notificationsService.create({
          userId: admin.userId,
          title: 'Sugerencia de miembro',
          message: `${sender?.name ?? 'Un miembro'} sugirió sumar a "${dto.email}" al grupo "${group.name}".`,
          type: 'GROUP_INVITE',
          relatedId: groupId,
        });
      }
    }

    return { message: 'Sugerencia enviada a los administradores del grupo' };
  }

  /**
   * Un miembro abandona el grupo.
   * Regla de negocio estricta: No puede abandonar si tiene deuda pendiente (net < 0).
   * Si es el único admin y quedan otros miembros, debe designar admin antes.
   */
  async leaveGroup(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!member || member.status !== 'ACTIVE') {
      throw new BadRequestException('No sos miembro activo de este grupo');
    }

    // 1. Validar saldo / deuda pendiente usando BalanceService
    const balance = await this.balanceService.getBalance(userId, groupId);
    const userBal = balance.balances.find((b) => b.userId === userId);
    if (userBal && userBal.net < -0.01) {
      throw new BadRequestException(
        `No podés abandonar el grupo porque tenés una deuda pendiente de $${Math.abs(userBal.net).toLocaleString('es-AR')}. Salda tu deuda primero.`,
      );
    }

    // 2. Si es ADMIN, verificar que no quede acéfalo si hay más miembros activos
    if (member.role === 'ADMIN') {
      const otherAdmins = await this.prisma.groupMember.count({
        where: { groupId, role: 'ADMIN', status: 'ACTIVE', userId: { not: userId } },
      });
      const otherMembers = await this.prisma.groupMember.count({
        where: { groupId, status: 'ACTIVE', userId: { not: userId } },
      });
      if (otherAdmins === 0 && otherMembers > 0) {
        throw new BadRequestException(
          'Sos el único administrador del grupo. Debés designar a otro miembro como admin antes de salir.',
        );
      }
    }

    await this.prisma.groupMember.delete({
      where: { userId_groupId: { userId, groupId } },
    });

    // Si no quedan miembros activos, el grupo se elimina por completo
    const remaining = await this.prisma.groupMember.count({
      where: { groupId, status: 'ACTIVE' },
    });
    if (remaining === 0) {
      await this.deleteGroupCascade(groupId);
    }

    return { message: 'Has abandonado el grupo exitosamente' };
  }

  /** Promueve a ADMIN o degrada a MEMBER (solo ADMIN). Nunca deja el grupo sin admin. */
  async setMemberRole(
    requesterId: string,
    groupId: string,
    targetUserId: string,
    role: 'ADMIN' | 'MEMBER',
  ) {
    await this.assertAdmin(requesterId, groupId);

    const target = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });
    if (!target || target.status !== 'ACTIVE') {
      throw new NotFoundException('Miembro no encontrado en el grupo');
    }

    if (role === 'MEMBER' && target.role === 'ADMIN') {
      const admins = await this.prisma.groupMember.count({
        where: { groupId, role: 'ADMIN', status: 'ACTIVE' },
      });
      if (admins <= 1) {
        throw new BadRequestException('El grupo debe tener al menos un administrador.');
      }
    }

    return this.prisma.groupMember.update({
      where: { userId_groupId: { userId: targetUserId, groupId } },
      data: { role },
      include: MEMBER_INCLUDE,
    });
  }

  /** Invitaciones pendientes del grupo (solo ADMIN) */
  async listPendingInvitations(userId: string, groupId: string) {
    await this.assertAdmin(userId, groupId);
    return this.prisma.groupMember.findMany({
      where: { groupId, status: 'PENDING' },
      include: MEMBER_INCLUDE,
    });
  }

  /** Cancela una invitación pendiente (solo ADMIN) */
  async cancelInvitation(userId: string, groupId: string, targetUserId: string) {
    await this.assertAdmin(userId, groupId);
    const invite = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });
    if (!invite || invite.status !== 'PENDING') {
      throw new NotFoundException('No hay una invitación pendiente para ese usuario');
    }
    await this.prisma.groupMember.delete({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });
    await this.notificationsService.markInviteRead(targetUserId, groupId);
    return { message: 'Invitación cancelada' };
  }

  /** Elimina un grupo con todos sus datos asociados */
  private async deleteGroupCascade(groupId: string) {
    await this.prisma.$transaction([
      this.prisma.expenseSplit.deleteMany({ where: { groupExpense: { groupId } } }),
      this.prisma.groupExpense.deleteMany({ where: { groupId } }),
      this.prisma.groupMember.deleteMany({ where: { groupId } }),
      this.prisma.group.delete({ where: { id: groupId } }),
    ]);
  }

  // ── Helpers privados ────────────────────────────────────────────────────────

  /** Verifica que el usuario sea miembro del grupo (sin ir a la BD) */
  private assertMember(
    userId: string,
    members: Array<{ userId: string }>,
  ) {
    if (!members.some((m) => m.userId === userId)) {
      throw new ForbiddenException('No sos miembro de este grupo');
    }
  }

  private async assertAdmin(userId: string, groupId: string) {
    const isAdmin = await this.isMemberWithRole(userId, groupId, 'ADMIN');
    if (!isAdmin) throw new ForbiddenException('Solo el ADMIN puede realizar esta acción');
  }

  private async findPendingInvite(userId: string, groupId: string) {
    const invite = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!invite || invite.status !== 'PENDING') {
      throw new NotFoundException('No tenés una invitación pendiente para este grupo');
    }
    return invite;
  }

  private async isMemberWithRole(userId: string, groupId: string, role: 'ADMIN' | 'MEMBER') {
    const member = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    return member?.status === 'ACTIVE' && member.role === role;
  }
}

export { GroupsService as default };
