import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { AdminInsightsService } from '../services/admin-insights.service';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminInsightsController {
  constructor(private readonly insightsService: AdminInsightsService) {}

  @Get('insights')
  async getInsights() {
    return this.insightsService.getInsights();
  }

  @Patch('caps')
  async updateCaps(
    @Body() body: Record<string, { cpuPercent: number; ramMb: number }>,
  ) {
    return this.insightsService.updateCaps(body);
  }

  @Post('insights/upgrade-model/:id')
  async upgradeModel(
    @Param('id') id: string,
    @Body() body: { suggestedPrice?: number; suggestedTier?: string },
  ) {
    return this.insightsService.upgradeModel(
      id,
      body.suggestedPrice,
      body.suggestedTier,
    );
  }
}
