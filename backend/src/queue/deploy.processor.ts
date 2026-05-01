import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deployment, DeploymentStatus } from '../deployments/deployment.entity';
import * as Docker from 'dockerode';
import { Logger } from '@nestjs/common';

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

  async process(job: Job<any, any, string>): Promise<any> {
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
      const containerIp =
        (info as any).NetworkSettings.IPAddress ||
        (info as any).NetworkSettings.Networks?.bridge?.IPAddress ||
        '127.0.0.1';
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
