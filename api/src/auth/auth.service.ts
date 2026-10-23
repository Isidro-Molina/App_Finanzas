import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from 'src/mail/mail.service';
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
    private mailService: MailService,
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
    return {
      accessToken: this.generateToken(user.id, user.email),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  async googleAuth(dto: GoogleAuthDto) {
    // 1. Verificar el idToken con Google
    let ticket;
    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch {
      throw new UnauthorizedException('Token de Google inválido o expirado');
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException('No se pudo obtener el email de Google');
    }

    const email: string = payload.email;
    const name: string = payload.name || email.split('@')[0];

    // 2. Buscar o crear el usuario
    let user = await this.usersService.findByEmail(email);

    if (!user) {
      // Usuario nuevo → crear sin passwordHash (acceso solo via Google)
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          passwordHash: '', // Vacío: no puede hacer login con contraseña
        },
      });
    }

    return {
      accessToken: this.generateToken(user.id, user.email),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  // ─── Recuperación de contraseña ───────────────────────────────────────────

  private static readonly RESET_CODE_TTL_MS = 15 * 60 * 1000;
  private static readonly RESET_MAX_ATTEMPTS = 5;

  /**
   * Genera un código de 6 dígitos y lo envía por email.
   * Siempre responde igual (exista o no el email) para no revelar qué cuentas existen.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const genericResponse = {
      message:
        'Si el email está registrado, te enviamos un código para restablecer tu contraseña.',
    };

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) return genericResponse;

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 10);

    // Un solo código vigente por usuario
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          codeHash,
          expiresAt: new Date(Date.now() + AuthService.RESET_CODE_TTL_MS),
        },
      }),
    ]);

    void this.mailService.sendPasswordResetCode({
      toEmail: user.email,
      name: user.name,
      code,
    });

    return genericResponse;
  }

  /** Valida el código y establece la nueva contraseña. */
  async resetPassword(dto: ResetPasswordDto) {
    const invalid = () => new BadRequestException('Código inválido o vencido');

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw invalid();

    const token = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
        attempts: { lt: AuthService.RESET_MAX_ATTEMPTS },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!token) throw invalid();

    const codeValid = await bcrypt.compare(dto.code, token.codeHash);
    if (!codeValid) {
      await this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } },
      });
      throw invalid();
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Contraseña actualizada. Ya podés iniciar sesión.' };
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
