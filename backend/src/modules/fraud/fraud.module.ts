import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ModelLog } from '../models/entities/model-log.entity';
import { Model } from '../models/entities/model.entity';
import { Alert } from '../analytics/entities/alert.entity';
import { MailModule } from '../../shared/mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RiskBaseline } from './entities/risk-baseline.entity';
import { RiskEvent } from './entities/risk-event.entity';
import { FraudService } from './services/fraud.service';
import { FraudProcessor } from './fraud.processor';
import { FraudController } from './controllers/fraud.controller';

/**
 * Deterministic fraud/abuse detection module: enriched-log aggregation, EWMA
 * baselines, rule + statistical anomaly scoring, risk findings, and alerts.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ModelLog, Model, Alert, RiskBaseline, RiskEvent]),
    BullModule.registerQueue({ name: 'fraud-queue' }),
    MailModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [FraudController],
  providers: [FraudService, FraudProcessor],
  exports: [FraudService],
})
export class FraudModule {}
