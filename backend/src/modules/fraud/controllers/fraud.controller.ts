import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiKeyOrJwtGuard } from '../../auth/guards/api-key-or-jwt.guard';
import { FraudService } from '../services/fraud.service';

interface ActorRequest {
  user: { id: string };
}

/**
 * Read-only fraud/risk reporting endpoint consumed by the MCP server's
 * `security.*` tools. Returns findings; it does not take enforcement actions.
 */
@Controller('fraud')
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  /**
   * Returns the risk report for a model the caller owns.
   *
   * @param id - Model UUID.
   * @param req - Authenticated request.
   * @returns The risk report (score, threat class, recent events, baseline).
   */
  @Get('models/:id/risk-report')
  @UseGuards(ApiKeyOrJwtGuard)
  async getRiskReport(
    @Param('id') id: string,
    @Req() req: ActorRequest,
  ): Promise<unknown> {
    return this.fraudService.getRiskReport(id, req.user.id);
  }
}
