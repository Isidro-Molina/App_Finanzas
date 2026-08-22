import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';

@Global() // Disponible en toda la app sin necesidad de importarlo en cada módulo
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
