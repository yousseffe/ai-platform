import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { McpToken } from '../entities/mcp-token.entity';
import { CreateMcpTokenDto } from '../dto/create-mcp-token.dto';
import { McpScope, ADMIN_ONLY_SCOPES } from '../enums/mcp-scope.enum';
import { User } from '../../users/entities/user.entity';

/**
 * Service managing lifecycle actions for MCP Access Tokens.
 */
@Injectable()
export class McpTokenService {
  constructor(
    @InjectRepository(McpToken)
    private readonly mcpTokenRepository: Repository<McpToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Generates a new MCP Access Token for a user.
   * Enforces admin-only scope protections and generates secure SHA-256 hashed credentials.
   *
   * @param userId - Owner user UUID.
   * @param dto - Specifications for name, scopes, and expiration.
   * @param isAdmin - Whether the caller is an administrator.
   * @returns Newly generated token metadata and the plaintext raw token (returned exactly once).
   * @throws {ForbiddenException} If non-admin attempts to request admin-restricted scopes.
   */
  async create(
    userId: string,
    dto: CreateMcpTokenDto,
    isAdmin: boolean,
  ): Promise<{ token: McpToken; rawToken: string }> {
    // 1. Validate permissions for admin-only scopes
    if (!isAdmin) {
      const hasAdminScope = dto.scopes.some((scope) =>
        ADMIN_ONLY_SCOPES.includes(scope),
      );
      if (hasAdminScope) {
        throw new ForbiddenException(
          'Non-admin users cannot generate tokens with administrative scopes (observability, security, admin)',
        );
      }
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    // 2. Generate raw token (256-bit entropy, mcp_ prefix)
    const entropy = crypto.randomBytes(32).toString('hex');
    const rawToken = `mcp_${entropy}`;

    // 3. Hash raw token using SHA-256 for secure storage lookup
    const keyHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 4. Create masked prefix for UI display (e.g. mcp_ab12cd34...wxyz)
    const keyPrefix = `mcp_${entropy.slice(0, 8)}...${entropy.slice(-4)}`;

    // 5. Calculate expiration date if specified
    let expiresAt: Date | null = null;
    if (dto.expiresInDays) {
      expiresAt = new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000);
    }

    const newMcpToken = this.mcpTokenRepository.create({
      name: dto.name,
      user,
      keyHash,
      keyPrefix,
      scopes: dto.scopes,
      isActive: true,
      expiresAt,
    });

    const savedToken = await this.mcpTokenRepository.save(newMcpToken);

    // Delete relation object fields we don't want returned in raw response
    delete (savedToken as any).user;

    return {
      token: savedToken,
      rawToken,
    };
  }

  /**
   * Retrieves all active and expired MCP Access Tokens belonging to a user.
   *
   * @param userId - Owner user UUID.
   * @returns Scoped array of token credentials metadata (no plaintext secret keys).
   */
  async listByUser(userId: string): Promise<McpToken[]> {
    return this.mcpTokenRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Revokes (soft-disables) a specific MCP Access Token.
   *
   * @param userId - Owner user UUID.
   * @param tokenId - Token UUID.
   */
  async revoke(userId: string, tokenId: string): Promise<void> {
    const token = await this.mcpTokenRepository.findOne({
      where: { id: tokenId, user: { id: userId } },
    });
    if (!token) {
      throw new NotFoundException('MCP Access Token not found');
    }
    token.isActive = false;
    await this.mcpTokenRepository.save(token);
  }

  /**
   * Permanently deletes a specific MCP Access Token.
   *
   * @param userId - Owner user UUID.
   * @param tokenId - Token UUID.
   */
  async delete(userId: string, tokenId: string): Promise<void> {
    const token = await this.mcpTokenRepository.findOne({
      where: { id: tokenId, user: { id: userId } },
    });
    if (!token) {
      throw new NotFoundException('MCP Access Token not found');
    }
    await this.mcpTokenRepository.remove(token);
  }
}
