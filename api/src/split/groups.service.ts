import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { AddExpenseDto } from './dto/add-expense.dto';

// ─── Helpers de inclusión Prisma ─────────────────────────────────────────────

const MEMBER_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
} as const;

const GROUP_INCLUDE = {
  members:  { include: MEMBER_INCLUDE },
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

// ─── Servicio ─────────────────────────────────────────────────────────────────

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  // ── CRUD de grupos ──────────────────────────────────────────────────────────

  /** Lista todos los grupos en los que participa el usuario */
  findAll(userId: string) {
    return this.prisma.group.findMany({
      where: { members: { some: { userId } } },
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

  /** Agrega un miembro por email (solo miembros existentes pueden invitar) */
  async addMember(userId: string, groupId: string, dto: AddMemberDto) {
    await this.findOne(userId, groupId); // Verifica que el invitador sea miembro

    const newUser = await this.usersService.findByEmail(dto.email);
    if (!newUser) throw new NotFoundException('No existe un usuario con ese email');

    const alreadyMember = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: newUser.id, groupId } },
    });
    if (alreadyMember) throw new BadRequestException('El usuario ya es miembro del grupo');

    return this.prisma.groupMember.create({
      data: { userId: newUser.id, groupId, role: 'MEMBER' },
      include: MEMBER_INCLUDE,
    });
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

  private async isMemberWithRole(userId: string, groupId: string, role: 'ADMIN' | 'MEMBER') {
    const member = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    return member?.role === role;
  }
}

export { GroupsService as default };
