import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import * as Docker from 'dockerode';
import { getDockerOptions } from '../../../shared/docker/docker.util';
import { Deployment } from '../entities/deployment.entity';
import { DeploymentStatus } from '../enums/deployment-status.enum';
import { DeploymentsRepository } from '../repositories/deployments.repository';
import { ModelVersionsRepository } from '../../models/repositories/model-versions.repository';

@Injectable()
export class DeploymentsService implements OnModuleInit {
  private readonly docker: Docker;
  private readonly logger = new Logger(DeploymentsService.name);

  constructor(
    private readonly deploymentsRepository: DeploymentsRepository,
    private readonly modelVersionsRepository: ModelVersionsRepository,
    @InjectQueue('deploy-queue') private readonly deployQueue: Queue,
  ) {
    this.docker = new Docker(getDockerOptions());
  }

  async onModuleInit() {
    this.logger.log('Scheduling repeatable check-idle-deployments job...');
    try {
      await this.deployQueue.add(
        'check-idle-deployments',
        {},
        {
          repeat: { pattern: '*/1 * * * *' },
          jobId: 'check-idle-deployments',
        },
      );
      this.logger.log('Scheduling repeatable check-resource-caps job...');
      await this.deployQueue.add(
        'check-resource-caps',
        {},
        {
          repeat: { pattern: '*/1 * * * *' },
          jobId: 'check-resource-caps',
        },
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to register repeatable deploy-queue jobs: ${message}`,
      );
    }
  }

  async getActiveDeploymentUrl(modelId: string): Promise<string> {
    const deployment = await this.deploymentsRepository.findOne({
      where: {
        modelVersion: { model: { id: modelId } },
        status: DeploymentStatus.RUNNING,
      },
      order: { createdAt: 'DESC' },
      relations: ['modelVersion', 'modelVersion.model'],
    });

    if (!deployment) {
      throw new NotFoundException('No active deployment found for this model');
    }

    if (deployment.url === null) {
      throw new NotFoundException('Active deployment URL is not set');
    }

    return deployment.url;
  }

  async getActiveDeploymentUrlByVersion(
    modelId: string,
    versionNumber: number,
  ): Promise<string> {
    const deployment = await this.deploymentsRepository.findOne({
      where: {
        modelVersion: {
          model: { id: modelId },
          versionNumber: versionNumber,
        },
        status: DeploymentStatus.RUNNING,
      },
      relations: ['modelVersion', 'modelVersion.model'],
    });

    if (!deployment) {
      throw new NotFoundException(
        `No active deployment found for version v${versionNumber} of this model`,
      );
    }

    if (deployment.url === null) {
      throw new NotFoundException(
        `Active deployment URL is not set for version v${versionNumber}`,
      );
    }

    return deployment.url;
  }

  async deployVersion(
    versionId: string,
    trafficWeight = 100,
  ): Promise<Deployment> {
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['model', 'model.organization'],
    });
    if (!version) {
      throw new NotFoundException('Model version not found');
    }

    const deployment = this.deploymentsRepository.create({
      modelVersion: version,
      status: DeploymentStatus.STARTING,
      trafficWeight: Math.min(100, Math.max(0, trafficWeight)),
      rlsOrgId: version.model?.organization?.id ?? null,
    });

    const savedDeployment = await this.deploymentsRepository.save(deployment);

    await this.deployQueue.add('deploy-model', {
      deploymentId: savedDeployment.id,
    });

    return savedDeployment;
  }

  async updateTrafficWeight(
    deploymentId: string,
    trafficWeight: number,
  ): Promise<Deployment> {
    const deployment = await this.deploymentsRepository.findOne({
      where: { id: deploymentId },
    });
    if (!deployment) {
      throw new NotFoundException('Deployment not found');
    }
    deployment.trafficWeight = Math.min(100, Math.max(0, trafficWeight));
    return this.deploymentsRepository.save(deployment);
  }

  async promoteDeployment(deploymentId: string): Promise<Deployment> {
    const deployment = await this.deploymentsRepository.findOne({
      where: { id: deploymentId },
      relations: ['modelVersion', 'modelVersion.model'],
    });
    if (!deployment) {
      throw new NotFoundException('Deployment not found');
    }

    const siblings = await this.deploymentsRepository.find({
      where: {
        status: DeploymentStatus.RUNNING,
        modelVersion: { model: { id: deployment.modelVersion.model.id } },
      },
    });

    for (const sibling of siblings) {
      if (sibling.id === deploymentId) continue;
      await this.stopDeployment(sibling.id);
    }

    deployment.trafficWeight = 100;
    return this.deploymentsRepository.save(deployment);
  }

  async getDeployment(deploymentId: string): Promise<Deployment | null> {
    return this.deploymentsRepository.findOne({
      where: { id: deploymentId },
      relations: ['modelVersion'],
    });
  }

  async updateDeployment(
    deploymentId: string,
    updateData: Partial<Deployment>,
  ): Promise<void> {
    await this.deploymentsRepository.update(deploymentId, updateData);
  }

  async stopDeployment(deploymentId: string): Promise<{ success: boolean }> {
    const deployment = await this.deploymentsRepository.findOne({
      where: { id: deploymentId },
    });
    if (!deployment) {
      throw new NotFoundException('Deployment not found');
    }

    if (deployment.containerId) {
      try {
        const container = this.docker.getContainer(deployment.containerId);
        try {
          await container.stop();
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Error stopping container (might be stopped already): ${message}`,
          );
        }
        try {
          await container.remove();
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.error(`Error removing container: ${message}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Error interacting with Docker for container ${deployment.containerId}: ${message}`,
        );
      }
    }

    await this.deploymentsRepository.update(deploymentId, {
      status: DeploymentStatus.STOPPED,
      port: null,
      url: null,
    });
    return { success: true };
  }
}
