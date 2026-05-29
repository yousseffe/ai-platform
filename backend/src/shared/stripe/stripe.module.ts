import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';

/**
 * Shared infrastructure module providing Stripe integrations across bounded context domains.
 */
@Module({
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
