import { Body, Controller, Post, Param, Patch, UseGuards, Get } from '@nestjs/common';
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
   * Triggers the deployment of a specific model version. Pass `trafficWeight`
   * to start it as a canary alongside an already-RUNNING deployment of a
   * different version for the same model, instead of the default 100%.
   * @param versionId The UUID of the version to deploy.
   * @param body Optional traffic weight (0-100) for canary rollouts.
   * @returns The newly created starting deployment instance metadata.
   */
  @Post('version/:versionId')
  async deployVersion(
    @Param('versionId') versionId: string,
    @Body() body: { trafficWeight?: number },
  ) {
    return this.deploymentsService.deployVersion(versionId, body?.trafficWeight);
  }

  /**
   * Updates the traffic-split weight of an existing deployment.
   * @param id The deployment UUID.
   * @param body The new traffic weight (0-100).
   */
  @Patch(':id/traffic-weight')
  async updateTrafficWeight(
    @Param('id') id: string,
    @Body() body: { trafficWeight: number },
  ) {
    return this.deploymentsService.updateTrafficWeight(id, body.trafficWeight);
  }

  /**
   * Promotes a deployment to 100% of its model's unpinned traffic, stopping
   * every other RUNNING deployment for the same model. Use to promote a
   * canary to full rollout, or to roll back by promoting the previous
   * version's still-RUNNING deployment.
   * @param id The deployment UUID to promote.
   */
  @Post(':id/promote')
  async promoteDeployment(@Param('id') id: string) {
    return this.deploymentsService.promoteDeployment(id);
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
