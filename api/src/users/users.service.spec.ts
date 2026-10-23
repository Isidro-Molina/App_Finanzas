import { ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService - Perfiles y eliminación segura de cuenta', () => {
  let service: UsersService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      groupMember: {
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
      },
      group: {
        findMany: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      groupExpense: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
      expenseSplit: {
        deleteMany: jest.fn(),
      },
      notification: { deleteMany: jest.fn() },
      passwordResetToken: { deleteMany: jest.fn() },
      budget: { deleteMany: jest.fn() },
      transaction: { deleteMany: jest.fn() },
      category: { deleteMany: jest.fn() },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };
    service = new UsersService(mockPrisma);
  });

  describe('findPublicProfile - Prevención de IDOR', () => {
    it('debe permitir ver el perfil propio sin consultar grupos compartidos', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Isidro',
        email: 'isidro@finova.com',
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
      });

      const profile = await service.findPublicProfile('user-1', 'member-2');

      expect(profile.name).toBe('Compañero');
      expect(profile.email).toBe('compa@finova.com');
    });
  });

  describe('remove - Reasignación segura de grupos', () => {
    it('debe reasignar el grupo al primer miembro activo y otorgarle rol ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      mockPrisma.group.findMany.mockResolvedValue([
        {
          id: 'group-1',
          members: [{ userId: 'active-member-2', status: 'ACTIVE' }],
        },
      ]);

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
    });

    it('debe eliminar el grupo si no quedan otros miembros activos', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      mockPrisma.group.findMany.mockResolvedValue([
        {
          id: 'group-empty',
          members: [], // Sin otros miembros activos
        },
      ]);
      mockPrisma.groupExpense.findMany.mockResolvedValue([]);

      await service.remove('user-1');

      expect(mockPrisma.group.delete).toHaveBeenCalledWith({
        where: { id: 'group-empty' },
      });
    });
  });
});
