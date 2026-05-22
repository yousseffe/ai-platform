import { Controller, Post, Param, UseGuards, Get } from '@nestjs/common';
import { DeploymentsService } from '../services/deployments.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * Controller exposing endpoints for deployment actions (starting/stopping model containers).
 */
@UseGuards(JwtAuthGuard)
@Controller('deployments')
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  /**
   * Triggers the deployment of a specific model version.
   * @param versionId The UUID of the version to deploy.
   * @returns The newly created starting deployment instance metadata.
   */
  @Post('version/:versionId')
  async deployVersion(@Param('versionId') versionId: string) {
    return this.deploymentsService.deployVersion(versionId);
  }

  /**
   * Gets details of a deployment.
   * @param id The deployment UUID.
   * @returns The deployment entity.
   */
  @Get(':id')
  async getDeployment(@Param('id') id: string) {
    return this.deploymentsService.getDeployment(id);
  }

  /**
   * Terminating a running container deployment instance.
   * @param id The deployment UUID to stop.
   * @returns An object indicating success status.
   */
  @Post(':id/stop')
  async stopDeployment(@Param('id') id: string) {
    return this.deploymentsService.stopDeployment(id);
  }
}
