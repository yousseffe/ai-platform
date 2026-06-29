import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsMcpController } from './controllers/analytics-mcp.controller';
import { AnalyticsQueryService } from './services/analytics-query.service';
import { LogStreamGateway } from './log-stream.gateway';
import { Alert } from './entities/alert.entity';
import { Deployment } from '../deployments/entities/deployment.entity';
import { Model } from '../models/entities/model.entity';
import { ModelLog } from '../models/entities/model-log.entity';

@Module({
  imports: [
    HttpModule,
    AuthModule,
    UsersModule,
    TypeOrmModule.forFeature([Alert, Deployment, Model, ModelLog]),
  ],
  controllers: [AnalyticsController, AnalyticsMcpController],
  providers: [LogStreamGateway, AnalyticsQueryService],
})
export class AnalyticsModule {}
