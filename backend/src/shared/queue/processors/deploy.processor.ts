import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Deployment } from '../../../modules/deployments/entities/deployment.entity';
import { DeploymentStatus } from '../../../modules/deployments/enums/deployment-status.enum';
import { ModelType } from '../../../modules/models/enums/model-type.enum';
import { ApiKey } from '../../../modules/auth/entities/api-key.entity';
import * as Docker from 'dockerode';
import * as fs from 'fs';
import { Logger } from '@nestjs/common';
import { DeployJobPayload } from '../interfaces/queue.interface';
import { getDockerOptions } from '../../docker/docker.util';

/**
 * BullMQ processor responsible for scheduling and launching containerized
 * model versions as running server instances inside isolated Docker containers.
 */
@Processor('deploy-queue')
export class DeployProcessor extends WorkerHost {
  private readonly docker: Docker;
  private readonly logger = new Logger(DeployProcessor.name);

  constructor(
    @InjectRepository(Deployment)
    private readonly deploymentsRepository: Repository<Deployment>,
    private readonly dataSource: DataSource,
  ) {
    super();
    this.docker = new Docker(getDockerOptions());
  }

  /**
   * Processes a background deployment job. Spins up a new Docker container
   * using the target version image, maps a dynamic host port, and records endpoints.
   *
   * @param job - The background job payload carrying the target deployment ID.
   * @returns A promise that resolves when the container starts running.
   */
  async process(job: Job<DeployJobPayload, void, string>): Promise<void> {
    const { deploymentId } = job.data;
    const deployment = await this.deploymentsRepository.findOne({
      where: { id: deploymentId },
      relations: [
        'modelVersion',
        'modelVersion.model',
        'modelVersion.model.user',
      ],
    });

    if (!deployment) {
      this.logger.error(
        `Deployment record ${deploymentId} not found in database.`,
      );
      return;
    }

    this.logger.log(
      `Starting deployment process for deployment: ${deploymentId} (Model Version: ${deployment.modelVersion.id})`,
    );

    try {
      const imageName = `model-version-${deployment.modelVersion.id}`;

      // Find next available port starting from 8000
      const activeDeployments = await this.deploymentsRepository.find({
        where: { status: DeploymentStatus.RUNNING },
      });
      const usedPorts = new Set(
        activeDeployments.map((d) => d.port).filter((p) => p != null),
      );
      let nextPort = 8000;
      while (usedPorts.has(nextPort)) {
        nextPort++;
      }

      this.logger.log(
        `Assigning port ${nextPort} to deployment ${deploymentId}`,
      );

      const userEmail =
        deployment.modelVersion.model.user?.email || 'unknown@unknown.com';
      const emailPrefix = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      const modelName = deployment.modelVersion.model.name.replace(
        /[^a-zA-Z0-9]/g,
        '',
      );
      const shortDeployId = deploymentId.split('-')[0];
      const containerName =
        `${emailPrefix}_${modelName}_v${deployment.modelVersion.versionNumber}_${shortDeployId}`.toLowerCase();

      const isLlm = deployment.modelVersion.model.type === ModelType.LLM_GGUF;
      const containerPort = isLlm ? '8080/tcp' : '8000/tcp';
      const urlPort = isLlm ? 8080 : 8000;

      const ownerId = deployment.modelVersion.model.user?.id;
      let ownerApiKey = '';
      if (ownerId) {
        const apiKeyEntity = await this.dataSource.getRepository(ApiKey).findOne({
          where: { user: { id: ownerId }, isActive: true },
        });
        ownerApiKey = apiKeyEntity?.key || '';
      }

      // Ensure the network 'ai-platform_default' exists
      const networks = await this.docker.listNetworks();
      const hasNetwork = networks.some((n) => n.Name === 'ai-platform_default');
      if (!hasNetwork) {
        this.logger.log('Creating network ai-platform_default...');
        await this.docker.createNetwork({ Name: 'ai-platform_default' });
      }

      const container = await this.docker.createContainer({
        name: containerName,
        Image: imageName,
        ExposedPorts: {
          [containerPort]: {},
        },
        Env: [
          `MODEL_PATH=/app/model.pkl`,
          `API_KEY=${ownerApiKey}`,
        ],
        HostConfig: {
          PortBindings: {
            [containerPort]: [{ HostPort: nextPort.toString() }],
          },
          NetworkMode: 'ai-platform_default',
        },
      });

      await container.start();

      // Since the backend might be running directly on the host (like during dev),
      // we check if we are running in a docker container to resolve URLs correctly.
      // If running on host, communicate via hostPort on localhost.
      const isDocker = fs.existsSync('/.dockerenv');
      const url = isDocker
        ? `http://${containerName}:${urlPort}`
        : `http://127.0.0.1:${nextPort}`;

      this.logger.log(
        `Successfully deployed container ${container.id} at ${url} on HostPort ${nextPort}`,
      );

      await this.deploymentsRepository.update(deploymentId, {
        status: DeploymentStatus.RUNNING,
        containerId: container.id,
        port: nextPort,
        url: url,
        errorMessage: null,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to deploy container for deployment ${deploymentId}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.deploymentsRepository.update(deploymentId, {
        status: DeploymentStatus.FAILED,
        errorMessage: message || 'Unknown error during deployment',
      });
      throw error;
    }
  }
}
