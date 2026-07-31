import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// El payload que firmamos al generar el JWT
export interface JwtPayload {
  sub: string;  // userId
  email: string;
}

/**
 * JwtStrategy — valida el JWT en cada request protegido.
 *
 * Passport extrae el token del header:  Authorization: Bearer <token>
 * Verifica la firma con JWT_SECRET y llama a validate() con el payload.
 * El valor retornado por validate() se adjunta a request.user.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  // Lo que retornemos acá queda en request.user
  validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email };
  }
}
