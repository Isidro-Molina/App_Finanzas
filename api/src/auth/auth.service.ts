import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
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
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

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

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  async googleAuth(dto: GoogleAuthDto) {
    // 1. Verificar el idToken con Google
    let ticket: any;
    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch {
      throw new UnauthorizedException('Token de Google inválido o expirado');
    }

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    if (!email) {
      throw new UnauthorizedException('No se pudo obtener el email de Google');
    }

    // 2. Buscar o crear el usuario
    let user = await this.usersService.findByEmail(email);

    if (!user) {
      // Usuario nuevo → crear sin passwordHash (acceso solo via Google)
      user = await this.prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          passwordHash: '', // Vacío: no puede hacer login con contraseña
        },
      });
    }

    // 3. Proyección segura
    const { passwordHash: _, ...safeUser } = user;

    return {
      accessToken: this.generateToken(safeUser.id, safeUser.email),
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
