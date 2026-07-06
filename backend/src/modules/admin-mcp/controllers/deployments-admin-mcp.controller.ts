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
import { ApiKeyOrJwtGuard } from '../../../shared/guards/api-key-or-jwt.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { DeploymentStatus } from '../../deployments';
import { Deployment } from '../../deployments/entities/deployment.entity';

const DEPLOYMENT_RELATIONS = [
  'modelVersion',
  'modelVersion.model',
  'modelVersion.model.user',
];

@Controller('admin-mcp')
@UseGuards(ApiKeyOrJwtGuard, AdminGuard)
export class DeploymentsAdminMcpController {
  constructor(
    @InjectRepository(Deployment)
    private readonly deploymentsRepository: Repository<Deployment>,
  ) {}

  @Get('deployments')
  async listDeployments(@Query('running') running?: string) {
    const deployments = await this.deploymentsRepository.find({
      where: running === 'true' ? { status: DeploymentStatus.RUNNING } : {},
      relations: DEPLOYMENT_RELATIONS,
      order: { createdAt: 'DESC' },
    });

    return deployments.map((d) => this.summarize(d));
  }

  @Get('deployments/:id')
  async getDeployment(@Param('id', ParseUUIDPipe) id: string) {
    const deployment = await this.deploymentsRepository.findOne({
      where: { id },
      relations: DEPLOYMENT_RELATIONS,
    });
    if (!deployment) throw new NotFoundException('Deployment not found');
    return this.summarize(deployment);
  }

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
