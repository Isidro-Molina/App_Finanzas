import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    // UsersModule exporta UsersService → AuthService puede usar findByEmail()
    UsersModule,

    // Passport con JWT como estrategia por defecto
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Configuración del JWT: secret + expiración
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  // Exportamos JwtAuthGuard para poder usarlo en otros módulos sin re-importar
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
