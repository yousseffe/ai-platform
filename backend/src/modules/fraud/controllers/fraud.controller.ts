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
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { FraudService } from '../services/fraud.service';

interface ActorRequest {
  user: { id: string };
}

@Controller('fraud')
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  @Get('models/:id/risk-report')
  @UseGuards(ApiKeyOrJwtGuard)
  async getRiskReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: ActorRequest,
  ): Promise<unknown> {
    return this.fraudService.getRiskReport(id, req.user.id);
  }

  @Get('admin/events')
  @UseGuards(ApiKeyOrJwtGuard, AdminGuard)
  async getAdminRiskEvents(@Query('limit') limit?: string): Promise<unknown[]> {
    return this.fraudService.getAdminRiskEvents(
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('admin/models/:id/risk-report')
  @UseGuards(ApiKeyOrJwtGuard, AdminGuard)
  async getAdminRiskReport(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    return this.fraudService.getAdminRiskReport(id);
  }
}
