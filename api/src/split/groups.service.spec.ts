import { BadRequestException } from '@nestjs/common';
import { GroupsService } from './groups.service';

describe('GroupsService - Reglas de administración y sugerencias', () => {
  let service: GroupsService;
  let mockPrisma: any;
  let mockUsersService: any;
  let mockMailService: any;
  let mockNotifications: any;
  let mockBalanceService: any;

  beforeEach(() => {
    mockPrisma = {
      group: {
        findUnique: jest.fn(),
      },
      groupMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
    };
    mockUsersService = {
      findById: jest.fn().mockResolvedValue({ id: 'user-2', name: 'Mateo' }),
    };
    mockMailService = {
      sendGroupInvitation: jest.fn(),
    };
    mockNotifications = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    mockBalanceService = {
      getBalance: jest.fn().mockResolvedValue({
        isSettled: true,
        balances: [{ userId: 'admin-1', net: 0 }],
      }),
    };

    service = new GroupsService(
      mockPrisma,
      mockUsersService,
      mockMailService,
      mockNotifications,
      mockBalanceService,
    );
  });

  it('debe delegar removeMember a leaveGroup cuando el usuario intenta eliminarse a sí mismo (evitando grupo sin ADMIN)', async () => {
    mockPrisma.groupMember.findUnique.mockResolvedValue({
      userId: 'admin-1',
      groupId: 'group-1',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    // 0 otros admins, pero 1 otro miembro activo
    mockPrisma.groupMember.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    await expect(
      service.removeMember('admin-1', 'group-1', 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe crear notificación de tipo MEMBER_SUGGESTION al sugerir un miembro', async () => {
    mockPrisma.group.findUnique.mockResolvedValue({
      id: 'group-1',
      name: 'Viaje',
      members: [
        { userId: 'admin-1', role: 'ADMIN', status: 'ACTIVE' },
        { userId: 'user-2', role: 'MEMBER', status: 'ACTIVE' },
      ],
    });
    mockPrisma.groupMember.findMany.mockResolvedValue([
      { userId: 'admin-1', role: 'ADMIN', status: 'ACTIVE' },
    ]);

    await service.suggestMember('user-2', 'group-1', {
      email: 'nuevo@finova.com',
    });

    expect(mockNotifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-1',
        type: 'MEMBER_SUGGESTION',
        relatedId: 'group-1',
      }),
    );
  });
});
