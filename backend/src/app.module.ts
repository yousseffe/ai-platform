import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ModelsModule } from './modules/models/models.module';
import { DeploymentsModule } from './modules/deployments/deployments.module';
import { QueueModule } from './shared/queue/queue.module';
import { User } from './modules/users/entities/user.entity';
import { AuditLog } from './modules/users/entities/audit-log.entity';
import { Model } from './modules/models/entities/model.entity';
import { ModelVersion } from './modules/models/entities/model-version.entity';
import { Deployment } from './modules/deployments/entities/deployment.entity';
import { MulterModule } from '@nestjs/platform-express';
import { MinioModule } from './shared/minio/minio.module';
import { RedisModule } from './shared/redis/redis.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { Wallet } from './modules/wallets/entities/wallet.entity';
import { Transaction } from './modules/wallets/entities/transaction.entity';
import { ProcessedWebhook } from './modules/wallets/entities/processed-webhook.entity';
import { Organization } from './modules/organizations/entities/organization.entity';
import { OrgMember } from './modules/organizations/entities/org-member.entity';
import { VerificationCode } from './modules/auth/entities/verification-code.entity';
import { ApiKey } from './modules/auth/entities/api-key.entity';
import { ModelLog } from './modules/models/entities/model-log.entity';
import { SystemConfig } from './modules/wallets/entities/system-config.entity';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OpenSearchModule } from './shared/opensearch/opensearch.module';
import { LoggerMiddleware } from './shared/middleware/logger.middleware';
import { MailModule } from './shared/mail/mail.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { Alert } from './modules/analytics/entities/alert.entity';

/**
 * Root application module configuring TypeORM database connectivity, Redis-backed
 * queues, global Multer options, and domain feature modules.
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'aidb',
      entities: [
        User,
        AuditLog,
        Model,
        ModelVersion,
        Deployment,
        Wallet,
        Transaction,
        ProcessedWebhook,
        Organization,
        OrgMember,
        VerificationCode,
        ApiKey,
        ModelLog,
        SystemConfig,
        Alert,
      ],
      synchronize: true, // For MVP only
      logging: ['query', 'error', 'schema', 'warn'],
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    MulterModule.register({
      dest: './uploads',
    }),
    UsersModule,
    AuthModule,
    ModelsModule,
    DeploymentsModule,
    QueueModule,
    MinioModule,
    RedisModule,
    WalletsModule,
    OrganizationsModule,
    OpenSearchModule,
    MailModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*');
  }
}
