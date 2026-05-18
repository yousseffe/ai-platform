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
      relations: ['modelVersion', 'modelVersion.model', 'modelVersion.model.user'],
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

      const userEmail = deployment.modelVersion.model.user.email;
      const emailPrefix = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      const modelName = deployment.modelVersion.model.name.replace(/[^a-zA-Z0-9]/g, '');
      const shortDeployId = deploymentId.split('-')[0];
      const containerName = `${emailPrefix}_${modelName}_v${deployment.modelVersion.versionNumber}_${shortDeployId}`.toLowerCase();

      const isLlm = deployment.modelVersion.model.type === 'LLM_GGUF';
      const containerPort = isLlm ? '8080/tcp' : '8000/tcp';
      const urlPort = isLlm ? 8080 : 8000;

      const container = await this.docker.createContainer({
        name: containerName,
        Image: imageName,
        ExposedPorts: {
          [containerPort]: {},
        },
        HostConfig: {
          PortBindings: {
            [containerPort]: [{ HostPort: nextPort.toString() }],
          },
          NetworkMode: 'ai-platform_default',
        },
      });

      await container.start();

      // Since the container is now in the same docker-compose network,
      // the backend can resolve it by its container name!
      const url = `http://${containerName}:${urlPort}`;

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
