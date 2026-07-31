import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

// Proyección de usuario segura (sin passwordHash)
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // ─── Registro ────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    // 1. Verificar que el email no esté en uso
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    // 2. Hashear la contraseña (salt rounds = 12 es un buen balance seguridad/velocidad)
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // 3. Crear el usuario en la BD
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
      },
      select: SAFE_USER_SELECT,
    });

    // 4. Generar y devolver el JWT junto con el perfil
    return {
      accessToken: this.generateToken(user.id, user.email),
      user,
    };
  }

  // ─── Login ───────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    // 1. Buscar usuario por email (con passwordHash para comparar)
    const user = await this.usersService.findByEmail(dto.email);

    // 2. Verificar credenciales
    // Usamos el mismo mensaje genérico para no revelar si el email existe o no
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3. Devolver token + perfil (sin passwordHash)
    const { passwordHash: _, ...safeUser } = user;

    return {
      accessToken: this.generateToken(user.id, user.email),
      user: safeUser,
    };
  }

  // ─── Perfil del usuario autenticado ──────────────────────────────────────

  async getMe(userId: string) {
    return this.usersService.findById(userId);
  }

  // ─── Helper privado ──────────────────────────────────────────────────────

  private generateToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}
