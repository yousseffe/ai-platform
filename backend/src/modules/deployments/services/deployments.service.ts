import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deployment } from '../entities/deployment.entity';
import { DeploymentStatus } from '../enums/deployment-status.enum';
import { ModelVersion } from '../../models/entities/model-version.entity';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import * as Docker from 'dockerode';

/**
 * Service managing deployments of model versions. Handles spawning and stopping
 * container instances, and tracking active deployment endpoints.
 */
@Injectable()
export class DeploymentsService {
  private readonly docker: Docker;

  constructor(
    @InjectRepository(Deployment)
    private deploymentsRepository: Repository<Deployment>,
    @InjectRepository(ModelVersion)
    private modelVersionsRepository: Repository<ModelVersion>,
    @InjectQueue('deploy-queue') private deployQueue: Queue,
  ) {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  /**
   * Retrieves the endpoint URL of the active running deployment for a given model.
   *
   * @param modelId - The UUID of the model.
   * @returns A promise resolving to the deployment endpoint URL.
   * @throws {NotFoundException} If no active running deployment is found.
   */
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

  /**
   * Triggers a new deployment for a specific model version.
   *
   * Creates a deployment record in STARTING state and schedules container creation
   * in the deployment queue.
   *
   * @param versionId - The UUID of the model version.
   * @returns A promise resolving to the created Deployment entity.
   * @throws {NotFoundException} If the model version does not exist.
   */
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

  /**
   * Fetches deployment metadata by ID.
   *
   * @param deploymentId - The UUID of the deployment.
   * @returns A promise resolving to the Deployment entity or null if not found.
   */
  async getDeployment(deploymentId: string): Promise<Deployment | null> {
    return this.deploymentsRepository.findOne({
      where: { id: deploymentId },
      relations: ['modelVersion'],
    });
  }

  /**
   * Updates deployment attributes directly.
   *
   * @param deploymentId - The UUID of the deployment to update.
   * @param updateData - The partial deployment data.
   * @returns A promise that resolves when the update is complete.
   */
  async updateDeployment(
    deploymentId: string,
    updateData: Partial<Deployment>,
  ): Promise<void> {
    await this.deploymentsRepository.update(deploymentId, updateData);
  }

  /**
   * Stops the running container for a deployment and removes it from the host.
   * Marks the deployment status as STOPPED.
   *
   * @param deploymentId - The UUID of the deployment to terminate.
   * @returns A promise indicating success.
   * @throws {NotFoundException} If the deployment record cannot be found.
   */
  async stopDeployment(deploymentId: string): Promise<{ success: boolean }> {
    const deployment = await this.deploymentsRepository.findOne({
      where: { id: deploymentId },
    });
    if (!deployment) throw new NotFoundException('Deployment not found');

    if (deployment.containerId) {
      try {
        const container = this.docker.getContainer(deployment.containerId);
        await container.stop();
        await container.remove();
      } catch (e) {
        console.error('Error stopping/removing container', e);
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
