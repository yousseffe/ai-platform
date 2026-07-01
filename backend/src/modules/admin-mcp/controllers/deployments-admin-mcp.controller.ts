import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyOrJwtGuard } from '../../auth/guards/api-key-or-jwt.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { Deployment } from '../../deployments/entities/deployment.entity';
import { DeploymentStatus } from '../../deployments/enums/deployment-status.enum';

const DEPLOYMENT_RELATIONS = [
  'modelVersion',
  'modelVersion.model',
  'modelVersion.model.user',
];

/**
 * Read-only, platform-wide deployment inventory consumed by the
 * `admin_list_deployments` and `admin_get_deployment` MCP tools. Unlike
 * `observability_list_deployments` (which is scoped to the caller's own
 * models), this always returns every deployment on the platform.
 */
@Controller('admin-mcp')
@UseGuards(ApiKeyOrJwtGuard, AdminGuard)
export class DeploymentsAdminMcpController {
  constructor(
    @InjectRepository(Deployment)
    private readonly deploymentsRepository: Repository<Deployment>,
  ) {}

  /**
   * Lists every deployment on the platform, optionally restricted to running ones.
   *
   * @param running - When `'true'`, restrict to RUNNING deployments.
   * @returns Platform-wide deployment summaries.
   */
  @Get('deployments')
  async listDeployments(@Query('running') running?: string) {
    const deployments = await this.deploymentsRepository.find({
      where: running === 'true' ? { status: DeploymentStatus.RUNNING } : {},
      relations: DEPLOYMENT_RELATIONS,
      order: { createdAt: 'DESC' },
    });

    return deployments.map((d) => this.summarize(d));
  }

  /**
   * Retrieves a single deployment's detail.
   *
   * @param id - Deployment UUID.
   * @returns The deployment summary.
   * @throws {NotFoundException} If no deployment matches the given id.
   */
  @Get('deployments/:id')
  async getDeployment(@Param('id', ParseUUIDPipe) id: string) {
    const deployment = await this.deploymentsRepository.findOne({
      where: { id },
      relations: DEPLOYMENT_RELATIONS,
    });
    if (!deployment) throw new NotFoundException('Deployment not found');
    return this.summarize(deployment);
  }

  /**
   * Projects a deployment entity into a compact, model/owner-aware summary.
   *
   * @param deployment - The deployment entity to summarize.
   * @returns The deployment summary.
   */
  private summarize(deployment: Deployment) {
    const model = deployment.modelVersion?.model;
    return {
      deploymentId: deployment.id,
      modelId: model?.id ?? null,
      modelName: model?.name ?? 'Unknown',
      owner: model?.user?.email ?? 'Unknown',
      status: deployment.status,
      containerId: deployment.containerId,
      url: deployment.url,
      port: deployment.port,
      errorMessage: deployment.errorMessage,
      createdAt: deployment.createdAt,
      updatedAt: deployment.updatedAt,
    };
  }
}
