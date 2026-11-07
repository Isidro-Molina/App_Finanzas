import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService - Perfiles y eliminación segura de cuenta', () => {
  let service: UsersService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      groupMember: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
        update: jest.fn(),
      },
      group: {
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      groupExpense: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      expenseSplit: {
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      notification: { deleteMany: jest.fn() },
      passwordResetToken: { deleteMany: jest.fn() },
      budget: { deleteMany: jest.fn() },
      transaction: { deleteMany: jest.fn() },
      category: { deleteMany: jest.fn() },
      $transaction: jest.fn((cb: (tx: any) => unknown) => cb(mockPrisma)),
    };
    service = new UsersService(mockPrisma);
  });

  describe('findPublicProfile - Prevención de IDOR', () => {
    it('debe permitir ver el perfil propio sin consultar grupos compartidos', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Isidro',
        email: 'isidro@finova.com',
        isDeleted: false,
      });

      const profile = await service.findPublicProfile('user-1', 'user-1');

      expect(profile.id).toBe('user-1');
      expect(mockPrisma.groupMember.findFirst).not.toHaveBeenCalled();
    });

    it('debe arrojar ForbiddenException si no comparte ningún grupo activo con el usuario solicitado', async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue(null);

      await expect(
        service.findPublicProfile('user-1', 'stranger-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe retornar datos públicos si comparten un grupo activo', async () => {
      mockPrisma.groupMember.findFirst.mockResolvedValue({
        id: 'membership-1',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'member-2',
        name: 'Compañero',
        email: 'compa@finova.com',
        isDeleted: false,
      });

      const profile = await service.findPublicProfile('user-1', 'member-2');

      expect(profile.name).toBe('Compañero');
      expect(profile.email).toBe('compa@finova.com');
    });
  });

  describe('changePassword - Protección para cuentas Google', () => {
    it('debe arrojar BadRequestException si la cuenta no tiene passwordHash configurado', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-google',
        passwordHash: '',
        isDeleted: false,
      });

      await expect(
        service.changePassword('user-google', {
          currentPassword: 'any',
          newPassword: 'newpassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove - Eliminación de cuenta preservando historial grupal', () => {
    it('debe bloquear la baja con BadRequestException si el usuario tiene deuda pendiente en un grupo compartido', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isDeleted: false,
      });

      mockPrisma.groupMember.findMany.mockResolvedValue([
        {
          groupId: 'group-1',
          group: {
            id: 'group-1',
            name: 'Viaje a Bariloche',
            members: [{ userId: 'user-2', status: 'ACTIVE' }],
            expenses: [
              {
                paidById: 'user-2',
                splits: [{ userId: 'user-1', amountOwed: 1500, isPaid: false }],
              },
            ],
          },
        },
      ]);

      await expect(service.remove('user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('debe reasignar el grupo compartido, NO borrar gastos grupales y anonimizar al usuario si tiene historial en grupos', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isDeleted: false,
      });

      mockPrisma.group.findMany.mockResolvedValue([
        {
          id: 'group-1',
          createdById: 'user-1',
          members: [
            { userId: 'active-member-2', status: 'ACTIVE', role: 'MEMBER' },
          ],
        },
      ]);
      // Tiene 1 gasto pagado en el grupo compartido
      mockPrisma.groupExpense.count.mockResolvedValue(1);

      await service.remove('user-1');

      // Verifica que reasigne a active-member-2
      expect(mockPrisma.group.update).toHaveBeenCalledWith({
        where: { id: 'group-1' },
        data: { createdById: 'active-member-2' },
      });

      // Verifica que promueva a ADMIN
      expect(mockPrisma.groupMember.update).toHaveBeenCalledWith({
        where: {
          userId_groupId: {
            userId: 'active-member-2',
            groupId: 'group-1',
          },
        },
        data: { role: 'ADMIN' },
      });

      // NO debe borrar los gastos del grupo compartido
      expect(mockPrisma.groupExpense.deleteMany).not.toHaveBeenCalled();

      // Debe anonimizar al usuario en lugar de borrarlo físicamente para preservar el historial
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          email: 'deleted_user-1@deleted.finova.local',
          passwordHash: '',
          isDeleted: true,
        },
      });
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });

    it('debe eliminar el grupo si no quedan otros miembros activos y eliminar físicamente al usuario si no tiene historial compartido', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isDeleted: false,
      });

      mockPrisma.group.findMany.mockResolvedValue([
        {
          id: 'group-empty',
          createdById: 'user-1',
          members: [], // Sin otros miembros activos
        },
      ]);
      mockPrisma.groupExpense.findMany.mockResolvedValue([]);
      mockPrisma.groupExpense.count.mockResolvedValue(0);
      mockPrisma.expenseSplit.count.mockResolvedValue(0);
      mockPrisma.group.count.mockResolvedValue(0);

      await service.remove('user-1');

      expect(mockPrisma.group.delete).toHaveBeenCalledWith({
        where: { id: 'group-empty' },
      });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });
});
