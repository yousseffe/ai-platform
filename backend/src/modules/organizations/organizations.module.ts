import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrgMember } from './entities/org-member.entity';
import { Project } from './entities/project.entity';
import { OrgApiKey } from './entities/org-api-key.entity';
import { AuditLog } from '../users/entities/audit-log.entity';
import { UsersModule } from '../users/users.module';
import { ModelLog } from '../models/entities/model-log.entity';
import { WalletsModule } from '../wallets/wallets.module';
import { ProviderAccountsModule } from '../provider-accounts/provider-accounts.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsService } from './services/organizations.service';
import { ProjectsService } from './services/projects.service';
import { OrganizationsController } from './controllers/organizations.controller';
import { ProjectsController } from './controllers/projects.controller';
import { StripeModule } from '../../shared/stripe/stripe.module';
import { MinioModule } from '../../shared/minio/minio.module';
import { TenantIsolationController } from './controllers/tenant-isolation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrgMember,
      Project,
      OrgApiKey,
      AuditLog,
      ModelLog,
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => WalletsModule),
    StripeModule,
    MinioModule,
    forwardRef(() => ProviderAccountsModule),
    forwardRef(() => AuthModule),
  ],
  providers: [OrganizationsService, ProjectsService],
  controllers: [
    OrganizationsController,
    ProjectsController,
    TenantIsolationController,
  ],
  exports: [OrganizationsService, ProjectsService],
})
export class OrganizationsModule {}
