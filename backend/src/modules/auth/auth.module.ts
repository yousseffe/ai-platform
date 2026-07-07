import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationCode } from './entities/verification-code.entity';
import { ApiKey } from './entities/api-key.entity';
import { AuditLog } from '../users/entities/audit-log.entity';
import { UsersModule } from '../users/users.module';
import { OrgApiKey } from '../organizations/entities/org-api-key.entity';
import { OrgMember } from '../organizations/entities/org-member.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { WalletsModule } from '../wallets/wallets.module';
import { McpToken } from './entities/mcp-token.entity';
import { AuthService } from './services/auth.service';
import { ApiIdentityService } from './services/api-identity.service';
import { McpTokenService } from './services/mcp-token.service';
import { KeyQuotaService } from './services/key-quota.service';
import { AuthController } from './controllers/auth.controller';
import { McpTokenController } from './controllers/mcp-token.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OrgRoleGuard } from '../../shared/guards/org-role.guard';
import { ApiKeyOrJwtGuard } from '../../shared/guards/api-key-or-jwt.guard';
import { AdminGuard } from '../../shared/guards/admin.guard';
import { getRsaKeys } from './utils/keys';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VerificationCode,
      AuditLog,
      ApiKey,
      OrgApiKey,
      OrgMember,
      McpToken,
    ]),
    forwardRef(() => UsersModule),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const keys = getRsaKeys();
        return {
          privateKey: keys.privateKey,
          publicKey: keys.publicKey,
          signOptions: { algorithm: 'RS256' },
        };
      },
    }),
    forwardRef(() => OrganizationsModule),
    forwardRef(() => WalletsModule),
  ],
  providers: [
    AuthService,
    ApiIdentityService,
    McpTokenService,
    KeyQuotaService,
    JwtStrategy,
    OrgRoleGuard,
    ApiKeyOrJwtGuard,
    AdminGuard,
  ],
  controllers: [AuthController, McpTokenController],
  exports: [
    AuthService,
    ApiIdentityService,
    McpTokenService,
    KeyQuotaService,
    OrgRoleGuard,
    ApiKeyOrJwtGuard,
    AdminGuard,
    TypeOrmModule,
    JwtModule,
  ],
})
export class AuthModule {}
