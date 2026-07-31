import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { ExpensesService } from './expenses.service';
import { BalanceService } from './balance.service';
import { GroupsController } from './controllers/groups.controller';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    UsersModule, // Para buscar usuarios por email al agregar miembros
  ],
  controllers: [GroupsController],
  providers: [GroupsService, ExpensesService, BalanceService],
})
export class SplitModule {}
