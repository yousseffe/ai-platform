import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../../auth/entities/api-key.entity';
import { McpToken } from '../../auth/entities/mcp-token.entity';
import { ApiKeyOrJwtGuard } from '../../../shared/guards/api-key-or-jwt.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { OrgApiKey } from '../../organizations/entities/org-api-key.entity';
import { AuditLog } from '../../users/entities/audit-log.entity';

@Controller('admin-mcp')
@UseGuards(ApiKeyOrJwtGuard, AdminGuard)
export class AccessAuditMcpController {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(OrgApiKey)
    private readonly orgApiKeyRepository: Repository<OrgApiKey>,
    @InjectRepository(McpToken)
    private readonly mcpTokenRepository: Repository<McpToken>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  @Get('api-keys')
  async listApiKeys() {
    const [personalKeys, orgKeys] = await Promise.all([
      this.apiKeyRepository.find({ relations: ['user', 'model'] }),
      this.orgApiKeyRepository.find(),
    ]);

    return {
      personal: personalKeys.map((k) => ({
        id: k.id,
        name: k.name,
        type: k.type,
        owner: k.user?.email ?? 'Unknown',
        model: k.model?.name ?? null,
        isActive: k.isActive,
        expiresAt: k.expiresAt,
        createdAt: k.createdAt,
      })),
      organization: orgKeys.map((k) => ({
        id: k.id,
        label: k.label,
        keyPrefix: k.keyPrefix,
        orgId: k.orgId,
        projectId: k.projectId,
        isActive: k.isActive,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      })),
    };
  }

  @Get('mcp-tokens')
  async listMcpTokens() {
    const tokens = await this.mcpTokenRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return tokens.map((t) => ({
      id: t.id,
      name: t.name,
      keyPrefix: t.keyPrefix,
      owner: t.user?.email ?? 'Unknown',
      scopes: t.scopes,
      isActive: t.isActive,
      expiresAt: t.expiresAt,
      lastUsedAt: t.lastUsedAt,
      createdAt: t.createdAt,
    }));
  }

  @Get('audit-log')
  async getAuditLog(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('limit') limit = '100',
  ) {
    const where: Record<string, string> = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const entries = await this.auditLogRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: Math.min(parseInt(limit, 10) || 100, 500),
    });

    return entries.map((e) => ({
      id: e.id,
      userId: e.userId,
      action: e.action,
      metadata: e.metadata,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      createdAt: e.createdAt,
    }));
  }
}
