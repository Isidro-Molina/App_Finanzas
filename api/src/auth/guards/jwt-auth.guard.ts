import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — decorador para proteger endpoints.
 *
 * Uso:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('me')
 *   getProfile(@Request() req) {
 *     return req.user; // { userId, email }
 *   }
 *
 * Si el token es inválido o falta → 401 Unauthorized automático.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
