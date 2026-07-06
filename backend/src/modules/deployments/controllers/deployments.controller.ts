import {
  Body,
  Controller,
  Post,
  Param,
  Patch,
  UseGuards,
  Get,
} from '@nestjs/common';
import { DeploymentsService } from '../services/deployments.service';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('deployments')
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  @Post('version/:versionId')
  async deployVersion(
    @Param('versionId') versionId: string,
    @Body() body: { trafficWeight?: number },
  ) {
    return this.deploymentsService.deployVersion(
      versionId,
      body?.trafficWeight,
    );
  }

  @Patch(':id/traffic-weight')
  async updateTrafficWeight(
    @Param('id') id: string,
    @Body() body: { trafficWeight: number },
  ) {
    return this.deploymentsService.updateTrafficWeight(id, body.trafficWeight);
  }

  @Post(':id/promote')
  async promoteDeployment(@Param('id') id: string) {
    return this.deploymentsService.promoteDeployment(id);
  }

  @Get(':id')
  async getDeployment(@Param('id') id: string) {
    return this.deploymentsService.getDeployment(id);
  }

  @Post(':id/stop')
  async stopDeployment(@Param('id') id: string) {
    return this.deploymentsService.stopDeployment(id);
  }
}
