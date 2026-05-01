import { Controller, Post, Param, UseGuards, Get } from '@nestjs/common';
import { DeploymentsService } from './deployments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('deployments')
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  @Post('version/:versionId')
  async deployVersion(@Param('versionId') versionId: string) {
    return this.deploymentsService.deployVersion(versionId);
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
