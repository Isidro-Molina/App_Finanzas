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
import { AddMemberDto } from './dto/add-member.dto';
import { AddExpenseDto } from './dto/add-expense.dto';

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
    await this.prisma.group.delete({ where: { id: groupId } });
    return { message: 'Grupo eliminado' };
  }

  // ── Miembros ────────────────────────────────────────────────────────────────

  /**
   * Invita a un usuario al grupo por email.
   * Si tiene cuenta queda como PENDING hasta que acepte (no es parte del grupo todavía).
   * Si no tiene cuenta se le envía un email para que se registre.
   */
  async addMember(userId: string, groupId: string, dto: AddMemberDto) {
    // 1. Verificar que el invitador sea miembro del grupo y obtener datos del grupo
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

    await this.prisma.groupMember.delete({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });
    return { message: 'Miembro eliminado del grupo' };
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
