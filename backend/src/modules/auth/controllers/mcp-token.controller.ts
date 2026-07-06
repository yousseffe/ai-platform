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
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { User } from '../../users/entities/user.entity';

@Controller('auth/mcp-tokens')
@UseGuards(JwtAuthGuard)
export class McpTokenController {
  constructor(
    private readonly mcpTokenService: McpTokenService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async checkAdmin(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOneBy({ id: userId });
    return (
      !!user && (user.isAdmin || user.email.toLowerCase().includes('admin'))
    );
  }

  @Post()
  async create(
    @Req() req: Record<string, any> & { user: { id: string } },
    @Body() dto: CreateMcpTokenDto,
  ) {
    const isAdmin = await this.checkAdmin(req.user.id);
    return this.mcpTokenService.create(req.user.id, dto, isAdmin);
  }

  @Get()
  async list(@Req() req: Record<string, any> & { user: { id: string } }) {
    return this.mcpTokenService.listByUser(req.user.id);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(
    @Req() req: Record<string, any> & { user: { id: string } },
    @Param('id') id: string,
  ) {
    await this.mcpTokenService.revoke(req.user.id, id);
    return { success: true };
  }

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
