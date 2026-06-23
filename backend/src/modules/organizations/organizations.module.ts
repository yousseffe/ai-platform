import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrgMember } from './entities/org-member.entity';
import { AuditLog } from '../users/entities/audit-log.entity';
import { OrganizationsService } from './services/organizations.service';
import { OrganizationsController } from './controllers/organizations.controller';
import { UsersModule } from '../users/users.module';
import { WalletsModule } from '../wallets/wallets.module';

/**
 * Module responsible for workspace organizations and membership tracking.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, OrgMember, AuditLog]),
    UsersModule,
    WalletsModule,
  ],
  providers: [OrganizationsService],
  controllers: [OrganizationsController],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
