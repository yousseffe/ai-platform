import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Global shared module exposing the SMTP MailService provider.
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
