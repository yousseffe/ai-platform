import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationCode } from './entities/verification-code.entity';
import { ApiKey } from './entities/api-key.entity';
import { AuditLog } from '../users/entities/audit-log.entity';
import { AuthService } from './services/auth.service';
import { ApiIdentityService } from './services/api-identity.service';
import { AuthController } from './controllers/auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OrganizationsModule } from '../organizations/organizations.module';
import { WalletsModule } from '../wallets/wallets.module';
import { OrgApiKey } from '../organizations/entities/org-api-key.entity';
import { OrgRoleGuard } from './guards/org-role.guard';
import { ApiKeyOrJwtGuard } from './guards/api-key-or-jwt.guard';
import { AdminGuard } from './guards/admin.guard';
import { getRsaKeys } from './utils/keys';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationCode, AuditLog, ApiKey, OrgApiKey]),
    UsersModule,
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
    OrganizationsModule,
    WalletsModule,
  ],
  providers: [
    AuthService,
    ApiIdentityService,
    JwtStrategy,
    OrgRoleGuard,
    ApiKeyOrJwtGuard,
    AdminGuard,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    ApiIdentityService,
    OrgRoleGuard,
    ApiKeyOrJwtGuard,
    AdminGuard,
    TypeOrmModule,
    JwtModule,
  ],
})
export class AuthModule {}
