import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { FinancesModule } from './finances/finances.module';
import { SplitModule } from './split/split.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    FinancesModule,
    SplitModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
