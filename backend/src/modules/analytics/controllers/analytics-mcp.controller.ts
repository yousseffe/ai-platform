import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyOrJwtGuard } from '../../../shared/guards/api-key-or-jwt.guard';
import {
  AnalyticsQueryService,
  RequestStats,
  DeploymentSummary,
} from '../services/analytics-query.service';

interface ActorRequest {
  user: { id: string; isAdmin?: boolean };
}

@Controller('analytics')
export class AnalyticsMcpController {
  constructor(private readonly analyticsQueryService: AnalyticsQueryService) {}

  @Get('models/:id/request-stats')
  @UseGuards(ApiKeyOrJwtGuard)
  async requestStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('minutes') minutes = '15',
    @Req() req: ActorRequest,
  ): Promise<RequestStats> {
    return this.analyticsQueryService.requestStats(
      id,
      req.user.id,
      parseInt(minutes, 10),
      req.user.isAdmin,
    );
  }

  @Get('deployments')
  @UseGuards(ApiKeyOrJwtGuard)
  async deployments(
    @Query('running') running: string | undefined,
    @Req() req: ActorRequest,
  ): Promise<DeploymentSummary[]> {
    return this.analyticsQueryService.listDeployments(
      req.user.id,
      running === 'true',
      req.user.isAdmin,
    );
  }
}
