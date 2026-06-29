import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiKeyOrJwtGuard } from '../../auth/guards/api-key-or-jwt.guard';
import {
  AnalyticsQueryService,
  RequestStats,
  DeploymentSummary,
} from '../services/analytics-query.service';

interface ActorRequest {
  user: { id: string };
}

/**
 * Scoped, read-only observability endpoints consumed by the MCP server's
 * `observability.*` tools. Returns raw data; correlation, anomaly detection, and
 * summarization happen deterministically in the MCP context engine.
 */
@Controller('analytics')
export class AnalyticsMcpController {
  constructor(private readonly analyticsQueryService: AnalyticsQueryService) {}

  /**
   * Windowed request statistics for a model the caller owns.
   *
   * @param id - Model UUID.
   * @param minutes - Look-back window in minutes (default 15).
   * @param req - Authenticated request.
   * @returns The request statistics.
   */
  @Get('models/:id/request-stats')
  @UseGuards(ApiKeyOrJwtGuard)
  async requestStats(
    @Param('id') id: string,
    @Query('minutes') minutes = '15',
    @Req() req: ActorRequest,
  ): Promise<RequestStats> {
    return this.analyticsQueryService.requestStats(
      id,
      req.user.id,
      parseInt(minutes, 10),
    );
  }

  /**
   * Lists the caller's deployments.
   *
   * @param running - When `'true'`, restrict to RUNNING deployments.
   * @param req - Authenticated request.
   * @returns Scoped deployment summaries.
   */
  @Get('deployments')
  @UseGuards(ApiKeyOrJwtGuard)
  async deployments(
    @Query('running') running: string | undefined,
    @Req() req: ActorRequest,
  ): Promise<DeploymentSummary[]> {
    return this.analyticsQueryService.listDeployments(
      req.user.id,
      running === 'true',
    );
  }
}
