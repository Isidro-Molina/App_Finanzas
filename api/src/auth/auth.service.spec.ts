import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService - Autenticación y recuperación de cuenta', () => {
  let service: AuthService;
  let mockPrisma: any;
  let mockUsersService: any;
  let mockJwtService: any;
  let mockMailService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        create: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      changePassword: jest.fn(),
    };
    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };
    mockMailService = {
      sendPasswordResetCode: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      mockPrisma,
      mockUsersService,
      mockJwtService,
      mockMailService,
    );
  });

  describe('register', () => {
    it('debe arrojar ConflictException si el email ya existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.register({
          name: 'Isidro',
          email: 'test@finova.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe hashear contraseña y retornar token + perfil si el email es nuevo', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'test@finova.com',
        name: 'Isidro',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.register({
        name: 'Isidro',
        email: 'test@finova.com',
        password: 'password123',
      });

      expect(res.accessToken).toBe('mock-jwt-token');
      expect(res.user.id).toBe('new-user-id');
      expect(res.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('login', () => {
    it('debe arrojar UnauthorizedException si el usuario no existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@finova.com', password: '123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe arrojar UnauthorizedException si la contraseña no coincide', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@finova.com',
        passwordHash: 'hashed-pw',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@finova.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe generar token de sesión si las credenciales son válidas', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@finova.com',
        name: 'Isidro',
        passwordHash: 'hashed-pw',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await service.login({
        email: 'test@finova.com',
        password: 'valid',
      });

      expect(res.accessToken).toBe('mock-jwt-token');
      expect(res.user.id).toBe('user-1');
      expect(res.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('resetPassword', () => {
    it('debe rechazar código si no hay token activo o ya expiró', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'user-1' });
      mockPrisma.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          email: 'test@finova.com',
          code: '123456',
          newPassword: 'new-password',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
