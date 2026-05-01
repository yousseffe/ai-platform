import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ModelsModule } from './models/models.module';
import { DeploymentsModule } from './deployments/deployments.module';
import { QueueModule } from './queue/queue.module';
import { User } from './users/user.entity';
import { Model } from './models/model.entity';
import { ModelVersion } from './models/model-version.entity';
import { Deployment } from './deployments/deployment.entity';
import { MulterModule } from '@nestjs/platform-express';

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
  ],
})
export class AppModule {}
