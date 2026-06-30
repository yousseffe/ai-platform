import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiKeyOrJwtGuard } from '../../auth/guards/api-key-or-jwt.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { FraudService } from '../services/fraud.service';

interface ActorRequest {
  user: { id: string };
}

/**
 * Read-only fraud/risk reporting endpoints.
 * Provider-scoped routes enforce ownership; admin-scoped routes bypass it.
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

  /**
   * Admin: returns recent risk events across all models (no ownership filter).
   *
   * @param limit - Max events to return (default 50).
   * @returns Array of recent risk events.
   */
  @Get('admin/events')
  @UseGuards(ApiKeyOrJwtGuard, AdminGuard)
  async getAdminRiskEvents(
    @Query('limit') limit?: string,
  ): Promise<unknown[]> {
    return this.fraudService.getAdminRiskEvents(limit ? parseInt(limit, 10) : 50);
  }

  /**
   * Admin: returns the risk report for any model regardless of ownership.
   *
   * @param id - Model UUID.
   * @returns The risk report including model name and owner email.
   */
  @Get('admin/models/:id/risk-report')
  @UseGuards(ApiKeyOrJwtGuard, AdminGuard)
  async getAdminRiskReport(@Param('id') id: string): Promise<unknown> {
    return this.fraudService.getAdminRiskReport(id);
  }
}
