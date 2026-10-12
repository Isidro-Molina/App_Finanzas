import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, NotificationType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lista las notificaciones del usuario. Las de tipo GROUP_INVITE incluyen `inviteStatus`:
   * PENDING (puede aceptar/rechazar), ACCEPTED (ya es miembro) o DECLINED (rechazada/cancelada).
   */
  async findAll(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const groupIds = notifications
      .filter((n) => n.type === 'GROUP_INVITE' && n.relatedId)
      .map((n) => n.relatedId as string);
    if (groupIds.length === 0) return notifications;

    const memberships = await this.prisma.groupMember.findMany({
      where: { userId, groupId: { in: groupIds } },
      select: { groupId: true, status: true },
    });
    const statusByGroup = new Map(memberships.map((m) => [m.groupId, m.status]));

    return notifications.map((n) => {
      if (n.type !== 'GROUP_INVITE' || !n.relatedId) return n;
      const status = statusByGroup.get(n.relatedId);
      const inviteStatus =
        status === 'PENDING' ? 'PENDING' : status === 'ACTIVE' ? 'ACCEPTED' : 'DECLINED';
      return { ...n, inviteStatus };
    });
  }

  /** Marca como leídas las notificaciones de invitación de un grupo */
  markInviteRead(userId: string, groupId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, type: 'GROUP_INVITE', relatedId: groupId, isRead: false },
      data: { isRead: true },
    });
  }

  /** Crea una notificación. Acepta un cliente de transacción opcional. */
  create(
    data: {
      userId: string;
      title: string;
      message: string;
      type: NotificationType;
      relatedId?: string;
    },
    db: DbClient = this.prisma,
  ) {
    return db.notification.create({ data });
  }

  /** Crea varias notificaciones a la vez. Acepta un cliente de transacción opcional. */
  async createMany(
    data: Array<{
      userId: string;
      title: string;
      message: string;
      type: NotificationType;
      relatedId?: string;
    }>,
    db: DbClient = this.prisma,
  ) {
    if (data.length === 0) return { count: 0 };
    return db.notification.createMany({ data });
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
