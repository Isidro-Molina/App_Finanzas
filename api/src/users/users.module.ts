import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AchievementsService } from './achievements.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AchievementsService],
  // Exportar UsersService para que AuthModule pueda usar findByEmail()
  exports: [UsersService],
})
export class UsersModule {}
