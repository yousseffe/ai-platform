import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { McpTokenService } from '../services/mcp-token.service';
import { CreateMcpTokenDto } from '../dto/create-mcp-token.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { User } from '../../users/entities/user.entity';

/**
 * Controller exposing endpoints for users to manage their MCP Access Tokens.
 */
@Controller('auth/mcp-tokens')
@UseGuards(JwtAuthGuard)
export class McpTokenController {
  constructor(
    private readonly mcpTokenService: McpTokenService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Helper to check if the current user has administrative permissions.
   */
  private async checkAdmin(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOneBy({ id: userId });
    return !!user && (user.isAdmin || user.email.toLowerCase().includes('admin'));
  }

  /**
   * Generates a new MCP Access Token for the authenticated user.
   */
  @Post()
  async create(
    @Req() req: Record<string, any> & { user: { id: string } },
    @Body() dto: CreateMcpTokenDto,
  ) {
    const isAdmin = await this.checkAdmin(req.user.id);
    return this.mcpTokenService.create(req.user.id, dto, isAdmin);
  }

  /**
   * Lists all existing MCP Access Tokens belonging to the authenticated user.
   */
  @Get()
  async list(@Req() req: Record<string, any> & { user: { id: string } }) {
    return this.mcpTokenService.listByUser(req.user.id);
  }

  /**
   * Revokes (soft-disables) a specific MCP Access Token.
   */
  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(
    @Req() req: Record<string, any> & { user: { id: string } },
    @Param('id') id: string,
  ) {
    await this.mcpTokenService.revoke(req.user.id, id);
    return { success: true };
  }

  /**
   * Permanently deletes a specific MCP Access Token.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Req() req: Record<string, any> & { user: { id: string } },
    @Param('id') id: string,
  ) {
    await this.mcpTokenService.delete(req.user.id, id);
    return { success: true };
  }
}
