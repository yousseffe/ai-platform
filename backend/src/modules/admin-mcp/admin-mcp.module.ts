import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { WalletsModule } from '../wallets/wallets.module';
import { Model } from '../models/entities/model.entity';
import { ModelReview } from '../models/entities/model-review.entity';
import { ModelVersion } from '../models/entities/model-version.entity';
import { ModelVersionReviewEvent } from '../models/entities/model-version-review-event.entity';
import { OrgMember } from '../organizations/entities/org-member.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Project } from '../organizations/entities/project.entity';
import { Deployment } from '../deployments/entities/deployment.entity';
import { MinioModule } from '../../shared/minio/minio.module';
import { PlatformStatsMcpController } from './controllers/platform-stats-mcp.controller';
import { PlatformUsersMcpController } from './controllers/platform-users-mcp.controller';
import { PlatformCatalogMcpController } from './controllers/platform-catalog-mcp.controller';
import { OrganizationsAdminMcpController } from './controllers/organizations-admin-mcp.controller';
import { DeploymentsAdminMcpController } from './controllers/deployments-admin-mcp.controller';
import { ModelGovernanceMcpController } from './controllers/model-governance-mcp.controller';
import { AccessAuditMcpController } from './controllers/access-audit-mcp.controller';
import { InfraMcpController } from './controllers/infra-mcp.controller';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    WalletsModule,
    MinioModule,
    BullModule.registerQueue({ name: 'build-queue' }, { name: 'deploy-queue' }),
    TypeOrmModule.forFeature([
      Model,
      ModelVersion,
      ModelVersionReviewEvent,
      ModelReview,
      Organization,
      OrgMember,
      Project,
      Deployment,
    ]),
  ],
  controllers: [
    PlatformStatsMcpController,
    PlatformUsersMcpController,
    PlatformCatalogMcpController,
    OrganizationsAdminMcpController,
    DeploymentsAdminMcpController,
    ModelGovernanceMcpController,
    AccessAuditMcpController,
    InfraMcpController,
  ],
})
export class AdminMcpModule {}
