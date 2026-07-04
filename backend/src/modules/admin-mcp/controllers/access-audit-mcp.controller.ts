import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyOrJwtGuard } from '../../auth/guards/api-key-or-jwt.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { ApiKey } from '../../auth/entities/api-key.entity';
import { OrgApiKey } from '../../organizations/entities/org-api-key.entity';
import { McpToken } from '../../auth/entities/mcp-token.entity';
import { AuditLog } from '../../users/entities/audit-log.entity';

/**
 * Read-only platform access/security audit surface consumed by the
 * `admin_list_api_keys`, `admin_list_mcp_tokens`, and `admin_get_audit_log`
 * MCP tools. None of this data is visible anywhere else today — not even on
 * the dashboard — even though the `AuditLog` table is actively written by
 * `AuthService`, `UsersService`, and `OrganizationsService`. Never exposes
 * raw secret material, only masked prefixes and metadata.
 */
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

  /**
   * Lists every personal and organization API key on the platform (masked
   * prefixes only, never the raw secret).
   *
   * @returns Platform-wide API key inventory.
   */
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

  /**
   * Lists every MCP access token issued on the platform, across all users.
   *
   * @returns Platform-wide MCP token inventory.
   */
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

  /**
   * Filterable platform audit log — the only read surface for the `AuditLog`
   * table, which today has no controller anywhere in the codebase.
   *
   * @param userId - Optional filter to a single actor.
   * @param action - Optional filter to a single action category.
   * @param limit - Max records to return (default 100, max 500).
   * @returns Matching audit log entries, newest first.
   */
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
