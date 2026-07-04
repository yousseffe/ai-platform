import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirewallPolicy } from './entities/firewall-policy.entity';
import { FirewallService } from './services/firewall.service';
import { FirewallController } from './controllers/firewall.controller';
import { Model } from '../models/entities/model.entity';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';

/**
 * Model/organization-scoped security policy gateway: IP allow/deny lists,
 * prompt-injection blocking, and a fraud-engine-triggered temporary
 * auto-block, enforced on the prediction path.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([FirewallPolicy, Model]),
    AuthModule,
    // OrgRoleGuard (used on the org-scoped policy endpoints) depends on
    // OrganizationsService — Nest resolves a guard's own constructor
    // dependencies in the context of the module consuming it, not the
    // module that originally declares the guard, so this module needs
    // direct access to it even though AuthModule already exports the guard.
    forwardRef(() => OrganizationsModule),
  ],
  controllers: [FirewallController],
  providers: [FirewallService],
  exports: [FirewallService],
})
export class FirewallModule {}
