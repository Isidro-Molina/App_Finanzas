import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  // Exportar UsersService para que AuthModule pueda usar findByEmail()
  exports: [UsersService],
})
export class UsersModule {}
