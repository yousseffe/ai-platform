import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ModelsModule } from './modules/models/models.module';
import { DeploymentsModule } from './modules/deployments/deployments.module';
import { QueueModule } from './shared/queue/queue.module';
import { User } from './modules/users/entities/user.entity';
import { Model } from './modules/models/entities/model.entity';
import { ModelVersion } from './modules/models/entities/model-version.entity';
import { Deployment } from './modules/deployments/entities/deployment.entity';
import { MulterModule } from '@nestjs/platform-express';
import { MinioModule } from './shared/minio/minio.module';

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
      entities: [User, Model, ModelVersion, Deployment],
      synchronize: true, // For MVP only
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
  ],
})
export class AppModule {}
