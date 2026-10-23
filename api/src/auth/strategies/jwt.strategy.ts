import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';

// El payload que firmamos al generar el JWT
export interface JwtPayload {
  sub: string; // userId
  email: string;
}

/**
 * JwtStrategy — valida el JWT en cada request protegido.
 *
 * Passport extrae el token del header:  Authorization: Bearer <token>
 * Verifica la firma con JWT_SECRET y llama a validate() con el payload.
 * Valida que el usuario aún exista en la base de datos para evitar tokens huérfanos.
 * El valor retornado por validate() se adjunta a request.user.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  // Lo que retornemos acá queda en request.user
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no válido o inexistente');
    }

    return { userId: user.id, email: user.email };
  }
}
