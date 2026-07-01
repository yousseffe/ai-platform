import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Deployment } from '../../../modules/deployments/entities/deployment.entity';
import { DeploymentStatus } from '../../../modules/deployments/enums/deployment-status.enum';
import { ModelType } from '../../../modules/models/enums/model-type.enum';
import { ApiKey } from '../../../modules/auth/entities/api-key.entity';
import { ApiKeyType } from '../../../modules/auth/enums/api-key-type.enum';
import * as Docker from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { DeployJobPayload } from '../interfaces/queue.interface';
import { getDockerOptions } from '../../docker/docker.util';
import { RedisService } from '../../redis/redis.service';

/**
 * BullMQ processor responsible for scheduling and launching containerized
 * model versions as running server instances inside isolated Docker containers.
 */
@Processor('deploy-queue', {
  concurrency: 1,
  lockDuration: 300000, // 5 minutes lock duration to prevent stall if pulling base image (e.g. llama.cpp)
  stalledInterval: 300000,
})
export class DeployProcessor extends WorkerHost {
  private readonly docker: Docker;
  private readonly logger = new Logger(DeployProcessor.name);

  constructor(
    @InjectRepository(Deployment)
    private readonly deploymentsRepository: Repository<Deployment>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    @InjectQueue('deploy-queue') private readonly deployQueue: Queue,
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
  async process(job: Job<any, void, string>): Promise<void> {
    if (job.name === 'check-idle-deployments') {
      await this.checkIdleDeployments();
      return;
    }

    if (job.name === 'verify-deployment-health') {
      await this.verifyDeploymentHealth(job);
      return;
    }

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
      const isLlm = deployment.modelVersion.model.type === ModelType.LLM_GGUF;
      const imageName = isLlm
        ? 'ghcr.io/ggml-org/llama.cpp:server'
        : `model-version-${deployment.modelVersion.id}`;

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

      const containerPort = isLlm ? '8080/tcp' : '8000/tcp';
      const urlPort = isLlm ? 8080 : 8000;

      const ownerId = deployment.modelVersion.model.user?.id;
      let ownerApiKey = '';
      if (ownerId) {
        const apiKeyEntity = await this.dataSource
          .getRepository(ApiKey)
          .findOne({
            where: {
              user: { id: ownerId },
              type: ApiKeyType.LIVE,
              isActive: true,
            },
          });
        ownerApiKey = apiKeyEntity?.key || '';
      }

      // Ensure the isolated sandbox network 'ai-platform_models' exists
      const networks = await this.docker.listNetworks();
      const hasNetwork = networks.some((n) => n.Name === 'ai-platform_models');
      if (!hasNetwork) {
        this.logger.log('Creating network ai-platform_models...');
        await this.docker.createNetwork({
          Name: 'ai-platform_models',
          Driver: 'bridge',
        });
      }

      // Memory-based eviction check
      const TIER_RAM_MAP: Record<string, number> = {
        SMALL: 512, // 512 MB
        MEDIUM: 1024, // 1 GB
        LARGE: 2048, // 2 GB
      };

      const newModelTier =
        deployment.modelVersion.model.tier?.toUpperCase() || 'SMALL';
      const newModelRamMb = TIER_RAM_MAP[newModelTier] || 512;
      const MAX_SYSTEM_RAM_MB = parseInt(
        process.env.MAX_SYSTEM_RAM_MB || '3072',
        10,
      ); // Default: 3 GB (3072 MB)

      this.logger.log(
        `Checking memory limits for deploying ${deploymentId} (Tier: ${newModelTier}, footprint: ${newModelRamMb}MB)`,
      );

      // Calculate total RAM used by currently running containers
      const runningDeployments = await this.deploymentsRepository.find({
        where: { status: DeploymentStatus.RUNNING },
        relations: ['modelVersion', 'modelVersion.model'],
      });

      let currentSystemRamMb = runningDeployments.reduce((sum, dep) => {
        const tier = dep.modelVersion.model.tier?.toUpperCase() || 'SMALL';
        return sum + (TIER_RAM_MAP[tier] || 512);
      }, 0);

      this.logger.log(
        `Current memory usage: ${currentSystemRamMb}MB / ${MAX_SYSTEM_RAM_MB}MB`,
      );

      if (currentSystemRamMb + newModelRamMb > MAX_SYSTEM_RAM_MB) {
        this.logger.warn(
          `Memory threshold exceeded (${currentSystemRamMb + newModelRamMb}MB > ${MAX_SYSTEM_RAM_MB}MB). Starting eviction...`,
        );

        // Fetch last active times from Redis for all running deployments
        const runningWithActiveTimes = await Promise.all(
          runningDeployments.map(async (dep) => {
            const lastActiveStr = await this.redisService.get(
              `model:last-active:${dep.id}`,
            );
            const lastActiveTime = lastActiveStr
              ? parseInt(lastActiveStr, 10)
              : dep.createdAt.getTime();
            return { dep, lastActiveTime };
          }),
        );

        // Sort by last active time ascending (oldest/least recently active first)
        runningWithActiveTimes.sort(
          (a, b) => a.lastActiveTime - b.lastActiveTime,
        );

        for (const item of runningWithActiveTimes) {
          if (currentSystemRamMb + newModelRamMb <= MAX_SYSTEM_RAM_MB) {
            break;
          }

          const depToStop = item.dep;
          const depTier =
            depToStop.modelVersion.model.tier?.toUpperCase() || 'SMALL';
          const depRamMb = TIER_RAM_MAP[depTier] || 512;

          this.logger.warn(
            `Evicting deployment ${depToStop.id} (Tier: ${depTier}, ${depRamMb}MB) to free up memory. Last active: ${new Date(
              item.lastActiveTime,
            ).toISOString()}`,
          );

          await this.stopDeployment(depToStop.id);
          currentSystemRamMb -= depRamMb;
        }
      }

      // Ensure the GGUF base image exists locally by checking and pulling it if needed
      if (isLlm) {
        try {
          await this.docker.getImage(imageName).inspect();
        } catch (e) {
          this.logger.log(
            `Base image ${imageName} not found locally. Pulling from registry...`,
          );
          await new Promise<void>((resolve, reject) => {
            this.docker.pull(imageName, {}, (err, stream) => {
              if (err) return reject(err);
              if (!stream)
                return reject(new Error('Docker pull stream is undefined'));
              this.docker.modem.followProgress(stream, (followErr) => {
                if (followErr) return reject(followErr);
                resolve();
              });
            });
          });
          this.logger.log(`Successfully pulled base image ${imageName}`);
        }
      }

      const hostConfig: Docker.HostConfig = {
        PortBindings: {
          [containerPort]: [{ HostPort: nextPort.toString() }],
        },
        NetworkMode: 'ai-platform_models',
      };

      if (!isLlm) {
        hostConfig.Memory = newModelRamMb * 1024 * 1024;
      } else {
        // Mount GGUF model file dynamically from the host filesystem
        const storageDirEnv = process.env.GGUF_STORAGE_PATH;
        const ggufStorageDir = storageDirEnv
          ? path.resolve(storageDirEnv)
          : path.join(process.cwd(), 'uploads', 'gguf-models');
        const ggufPath = path.join(
          ggufStorageDir,
          `${deployment.modelVersion.id}.gguf`,
        );

        hostConfig.Binds = [`${ggufPath}:/models/model.gguf:ro`];
      }

      const containerOptions: any = {
        name: containerName,
        Image: imageName,
        ExposedPorts: {
          [containerPort]: {},
        },
        Env: [
          `API_KEY=${ownerApiKey}`,
          `MODEL_ID=${deployment.modelVersion.model.id}`,
          `VERSION_ID=${deployment.modelVersion.id}`,
          `USER_ID=${ownerId}`,
          `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318`,
          `OTEL_SERVICE_NAME=model-${deployment.modelVersion.model.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
        ],
        HostConfig: hostConfig,
      };

      if (isLlm) {
        containerOptions.Entrypoint = [
          '/app/llama-server',
          '-m',
          '/models/model.gguf',
          '--port',
          '8080',
          '--host',
          '0.0.0.0',
          '-np',
          '2',
          '-c',
          '4096',
        ];
      }

      const container = await this.docker.createContainer(containerOptions);

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
        status: DeploymentStatus.STARTING,
        containerId: container.id,
        port: nextPort,
        url: url,
        errorMessage: null,
      });

      await this.addPrometheusTarget(
        containerName,
        urlPort,
        deployment.modelVersion.model.id,
        deployment.modelVersion.id,
        ownerId || '',
        deployment.modelVersion.model.type,
      );

      // Schedule the first health check attempt in 2 seconds
      await this.deployQueue.add(
        'verify-deployment-health',
        { deploymentId, attempt: 1 },
        { delay: 2000 },
      );
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

  private async checkIdleDeployments(): Promise<void> {
    this.logger.log('Scanning for idle deployments to auto-stop...');
    try {
      const runningDeployments = await this.deploymentsRepository.find({
        where: { status: DeploymentStatus.RUNNING },
      });

      const IDLE_TIMEOUT_MS = parseInt(
        process.env.IDLE_TIMEOUT_MS || '300000',
        10,
      ); // Default: 5 minutes (300000 ms)
      const now = Date.now();

      for (const deployment of runningDeployments) {
        const lastActiveStr = await this.redisService.get(
          `model:last-active:${deployment.id}`,
        );
        const lastActiveTime = lastActiveStr
          ? parseInt(lastActiveStr, 10)
          : deployment.createdAt.getTime();

        if (now - lastActiveTime >= IDLE_TIMEOUT_MS) {
          this.logger.log(
            `Auto-stopping idle deployment ${deployment.id} (inactive for ${Math.round((now - lastActiveTime) / 1000)}s)`,
          );
          await this.stopDeployment(deployment.id);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error checking idle deployments: ${message}`);
    }
  }

  private async stopDeployment(deploymentId: string): Promise<void> {
    const deployment = await this.deploymentsRepository.findOne({
      where: { id: deploymentId },
      relations: [
        'modelVersion',
        'modelVersion.model',
        'modelVersion.model.user',
      ],
    });
    if (!deployment) return;

    if (deployment.containerId) {
      try {
        const container = this.docker.getContainer(deployment.containerId);

        // Remove Prometheus target before stopping container
        const containerName = this.getContainerName(deployment);
        await this.removePrometheusTarget(containerName);

        try {
          await container.stop();
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(`Error stopping container: ${message}`);
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
  }

  private async verifyDeploymentHealth(
    job: Job<any, void, string>,
  ): Promise<void> {
    const { deploymentId, attempt = 1 } = job.data;

    const deployment = await this.deploymentsRepository.findOne({
      where: { id: deploymentId },
      relations: ['modelVersion', 'modelVersion.model'],
    });

    if (!deployment) {
      this.logger.warn(
        `verifyDeploymentHealth: Deployment ${deploymentId} not found.`,
      );
      return;
    }

    // If it's already running or stopped/failed, we don't need to do anything
    if (deployment.status !== DeploymentStatus.STARTING) {
      this.logger.log(
        `verifyDeploymentHealth: Deployment ${deploymentId} is in status ${deployment.status}. Skipping.`,
      );
      return;
    }

    const isLlm = deployment.modelVersion.model.type === ModelType.LLM_GGUF;
    const url = deployment.url;

    if (!url) {
      this.logger.error(
        `verifyDeploymentHealth: Deployment ${deploymentId} has no URL.`,
      );
      await this.deploymentsRepository.update(deploymentId, {
        status: DeploymentStatus.FAILED,
        errorMessage: 'Deployment URL not set.',
      });
      return;
    }

    this.logger.log(
      `Checking health of deployment ${deploymentId} at ${url} (Attempt ${attempt})...`,
    );

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for health probe

      const response = await fetch(`${url}/health`, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });
      clearTimeout(timeoutId);

      this.logger.log(
        `Health check response status for ${deploymentId}: ${response.status}`,
      );

      let isHealthy = false;
      if (isLlm) {
        // llama-server returns 200 when ready, and 503 when still loading
        if (response.status === 200) {
          isHealthy = true;
        }
      } else {
        // For non-LLM, uvicorn binds only when loaded. So 200, 404, or 405 are all valid responses
        // showing the server is up and listening!
        if (response.status < 500) {
          isHealthy = true;
        }
      }

      if (isHealthy) {
        this.logger.log(
          `Deployment ${deploymentId} is healthy! Flipping status to RUNNING.`,
        );
        await this.deploymentsRepository.update(deploymentId, {
          status: DeploymentStatus.RUNNING,
        });

        // Set last-active time in Redis to start idle tracking
        await this.redisService.set(
          `model:last-active:${deploymentId}`,
          Date.now().toString(),
        );
        return;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.log(
        `Health check failed for deployment ${deploymentId}: ${message}`,
      );
    }

    // If health check failed/loading, decide to retry or fail
    const maxAttempts = isLlm ? 60 : 15; // 60 attempts for LLM (5 mins), 15 for others (75s)
    if (attempt >= maxAttempts) {
      this.logger.error(
        `Deployment ${deploymentId} failed to become healthy after ${attempt} attempts. Marking as FAILED.`,
      );

      await this.stopDeployment(deploymentId);

      await this.deploymentsRepository.update(deploymentId, {
        status: DeploymentStatus.FAILED,
        errorMessage: isLlm
          ? 'LLM server failed to load the model within 5 minutes.'
          : 'Model container failed to start responding within 75 seconds.',
      });
    } else {
      // Re-queue health check with 5s delay
      await this.deployQueue.add(
        'verify-deployment-health',
        { deploymentId, attempt: attempt + 1 },
        { delay: 5000 },
      );
    }
  }

  private getTargetsFilePath(): string {
    return path.join(
      process.cwd(),
      '..',
      'docker',
      'observability',
      'targets.json',
    );
  }

  private async addPrometheusTarget(
    containerName: string,
    port: number,
    modelId: string,
    versionId: string,
    userId: string,
    modelType: string,
  ): Promise<void> {
    try {
      const filePath = this.getTargetsFilePath();
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]', 'utf8');
      }
      const content = fs.readFileSync(filePath, 'utf8');
      const targets = JSON.parse(content || '[]');

      // Remove existing target for this container name if any
      const filtered = targets.filter(
        (t: any) => t.labels?.container_name !== containerName,
      );

      // Add new target
      filtered.push({
        targets: [`${containerName}:${port}`],
        labels: {
          container_name: containerName,
          model_id: modelId,
          version_id: versionId,
          user_id: userId,
          model_type: modelType,
        },
      });

      fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf8');
      this.logger.log(
        `Added Prometheus scrape target for container: ${containerName}`,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to update Prometheus targets.json (add): ${err.message}`,
      );
    }
  }

  private async removePrometheusTarget(containerName: string): Promise<void> {
    try {
      const filePath = this.getTargetsFilePath();
      if (!fs.existsSync(filePath)) return;
      const content = fs.readFileSync(filePath, 'utf8');
      const targets = JSON.parse(content || '[]');

      const filtered = targets.filter(
        (t: any) => t.labels?.container_name !== containerName,
      );

      fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf8');
      this.logger.log(
        `Removed Prometheus scrape target for container: ${containerName}`,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to update Prometheus targets.json (remove): ${err.message}`,
      );
    }
  }

  private getContainerName(deployment: any): string {
    const userEmail =
      deployment.modelVersion?.model?.user?.email || 'unknown@unknown.com';
    const emailPrefix = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    const modelName = (deployment.modelVersion?.model?.name || '').replace(
      /[^a-zA-Z0-9]/g,
      '',
    );
    const shortDeployId = deployment.id.split('-')[0];
    return `${emailPrefix}_${modelName}_v${deployment.modelVersion?.versionNumber}_${shortDeployId}`.toLowerCase();
  }
}
