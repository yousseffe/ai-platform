import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { McpToken } from '../entities/mcp-token.entity';
import { CreateMcpTokenDto } from '../dto/create-mcp-token.dto';
import { McpScope, ADMIN_ONLY_SCOPES } from '../enums/mcp-scope.enum';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class McpTokenService {
  constructor(
    @InjectRepository(McpToken)
    private readonly mcpTokenRepository: Repository<McpToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    userId: string,
    dto: CreateMcpTokenDto,
    isAdmin: boolean,
  ): Promise<{ token: McpToken; rawToken: string }> {
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

    const entropy = crypto.randomBytes(32).toString('hex');
    const rawToken = `mcp_${entropy}`;

    const keyHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const keyPrefix = `mcp_${entropy.slice(0, 8)}...${entropy.slice(-4)}`;

    let expiresAt: Date | null = null;
    if (dto.expiresInDays) {
      expiresAt = new Date(
        Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000,
      );
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

    delete (savedToken as Partial<McpToken>).user;

    return {
      token: savedToken,
      rawToken,
    };
  }

  async listByUser(userId: string): Promise<McpToken[]> {
    return this.mcpTokenRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

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
