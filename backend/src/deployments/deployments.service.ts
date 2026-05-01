import { Injectable, NotFoundException } from '@nestjs/common';
import { Deployment, DeploymentStatus } from './deployment.entity';
import { ModelVersion } from '../models/model-version.entity';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { DeploymentsRepository } from './deployments.repository';
import { ModelVersionsRepository } from '../models/model-versions.repository';

@Injectable()
export class DeploymentsService {
  constructor(
    private deploymentsRepository: DeploymentsRepository,
    private modelVersionsRepository: ModelVersionsRepository,
    @InjectQueue('deploy-queue') private deployQueue: Queue,
  ) {}

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

    return deployment.url;
  }

  async deployVersion(versionId: string): Promise<Deployment> {
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
    });
    if (!version) throw new NotFoundException('Model version not found');

    const deployment = this.deploymentsRepository.create({
      modelVersion: version,
      status: DeploymentStatus.STARTING,
    });

    const savedDeployment = await this.deploymentsRepository.save(deployment);

    await this.deployQueue.add('deploy-model', {
      deploymentId: savedDeployment.id,
    });

    return savedDeployment;
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
  ) {
    await this.deploymentsRepository.update(deploymentId, updateData);
  }

  async stopDeployment(deploymentId: string) {
    const deployment = await this.deploymentsRepository.findOne({
      where: { id: deploymentId },
    });
    if (!deployment) throw new NotFoundException('Deployment not found');

    if (deployment.containerId) {
      try {
        const Docker = require('dockerode');
        const docker = new Docker({ socketPath: '/var/run/docker.sock' });
        const container = docker.getContainer(deployment.containerId);
        await container.stop();
        await container.remove();
      } catch (e) {
        console.error('Error stopping/removing container', e);
      }
    }

    await this.deploymentsRepository.update(deploymentId, {
      status: DeploymentStatus.STOPPED,
      port: null as any,
      url: null as any,
    });
    return { success: true };
  }
}
