import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deployment } from '../../../modules/deployments/entities/deployment.entity';
import { DeploymentStatus } from '../../../modules/deployments/enums/deployment-status.enum';
import * as Docker from 'dockerode';
import { Logger } from '@nestjs/common';
import { DeployJobPayload } from '../interfaces/queue.interface';

/**
 * BullMQ processor responsible for scheduling and launching containerized
 * model versions as running server instances inside isolated Docker containers.
 */
@Processor('deploy-queue')
export class DeployProcessor extends WorkerHost {
  private docker: Docker;
  private readonly logger = new Logger(DeployProcessor.name);

  constructor(
    @InjectRepository(Deployment)
    private deploymentsRepository: Repository<Deployment>,
  ) {
    super();
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
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
      relations: ['modelVersion'],
    });

    if (!deployment) return;

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

      const container = await this.docker.createContainer({
        Image: imageName,
        ExposedPorts: {
          '8000/tcp': {},
        },
        HostConfig: {
          PortBindings: {
            '8000/tcp': [{ HostPort: nextPort.toString() }],
          },
        },
      });

      await container.start();

      const info = await container.inspect();

      // In docker-compose, "localhost" inside the backend container won't reach the model container exposed port on host.
      // Wait, since both are in same docker host, we can just use the container's IP address in the bridge network!
      const networkSettings = info.NetworkSettings as Record<string, unknown>;
      const ipAddress =
        typeof networkSettings.IPAddress === 'string'
          ? networkSettings.IPAddress
          : undefined;
      const bridgeIp = info.NetworkSettings?.Networks?.bridge?.IPAddress;
      const containerIp = ipAddress || bridgeIp || '127.0.0.1';
      const url = `http://${containerIp}:8000`;

      this.logger.log(
        `Successfully deployed container ${container.id} at ${url} on HostPort ${nextPort}`,
      );
      await this.deploymentsRepository.update(deploymentId, {
        status: DeploymentStatus.RUNNING,
        containerId: container.id,
        port: nextPort,
        url: url,
        errorMessage: undefined,
      });
    } catch (e) {
      const error = e as Error;
      this.logger.error(
        `Failed to deploy container for deployment ${deploymentId}: ${error.message}`,
        error.stack,
      );
      await this.deploymentsRepository.update(deploymentId, {
        status: DeploymentStatus.FAILED,
        errorMessage: error.message || 'Unknown error during deployment',
      });
      throw error;
    }
  }
}
