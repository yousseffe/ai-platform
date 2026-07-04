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

/**
 * Service managing deployments of model versions. Handles spawning and stopping
 * container instances, and tracking active deployment endpoints.
 */
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to register check-idle-deployments: ${message}`,
      );
    }
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
   * Retrieves the endpoint URL of the active running deployment for a given model and version.
   *
   * @param modelId - The UUID of the model.
   * @param versionNumber - The version number to query.
   * @returns A promise resolving to the deployment endpoint URL.
   * @throws {NotFoundException} If no active running deployment is found.
   */
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

  /**
   * Triggers a new deployment for a specific model version.
   *
   * Creates a deployment record in STARTING state and schedules container creation
   * in the deployment queue. Does not stop any other version's already-RUNNING
   * deployment for the same model — deploying a second version alongside an
   * existing one is how canary/traffic-split rollouts are started; pass a low
   * `trafficWeight` to send it only a fraction of unpinned prediction traffic.
   *
   * @param versionId - The UUID of the model version.
   * @param trafficWeight - Share (0-100) of unpinned traffic this deployment
   *   should receive once running, when co-existing with other RUNNING
   *   deployments for the same model. Defaults to 100 (full traffic, or the
   *   only deployment for its model).
   * @returns A promise resolving to the created Deployment entity.
   * @throws {NotFoundException} If the model version does not exist.
   */
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

  /**
   * Updates the traffic-split weight of an existing deployment.
   *
   * @param deploymentId - The UUID of the deployment to update.
   * @param trafficWeight - New weight (0-100).
   * @throws {NotFoundException} If the deployment does not exist.
   */
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

  /**
   * Promotes a deployment to receive 100% of its model's unpinned traffic,
   * stopping every other RUNNING deployment for the same model. Used both to
   * promote a canary to full rollout and to roll back to a previous version
   * (by promoting that version's still-RUNNING deployment).
   *
   * @param deploymentId - The UUID of the deployment to promote.
   * @returns A promise resolving to the promoted Deployment entity.
   * @throws {NotFoundException} If the deployment does not exist.
   */
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
