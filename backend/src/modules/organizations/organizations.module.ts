import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrgMember } from './entities/org-member.entity';
import { Project } from './entities/project.entity';
import { OrgApiKey } from './entities/org-api-key.entity';
import { AuditLog } from '../users/entities/audit-log.entity';
import { ModelLog } from '../models/entities/model-log.entity';
import { OrganizationsService } from './services/organizations.service';
import { ProjectsService } from './services/projects.service';
import { OrganizationsController } from './controllers/organizations.controller';
import { ProjectsController } from './controllers/projects.controller';
import { UsersModule } from '../users/users.module';
import { WalletsModule } from '../wallets/wallets.module';
import { StripeModule } from '../../shared/stripe/stripe.module';
import { MinioModule } from '../../shared/minio/minio.module';
import { ProviderAccountsModule } from '../provider-accounts/provider-accounts.module';

/**
 * Module responsible for workspace organizations, membership tracking,
 * project management, and API key lifecycle.
 */
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
  ],
  providers: [OrganizationsService, ProjectsService],
  controllers: [OrganizationsController, ProjectsController],
  exports: [OrganizationsService, ProjectsService],
})
export class OrganizationsModule {}
