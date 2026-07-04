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
  concurrency: parseInt(process.env.DEPLOY_QUEUE_CONCURRENCY || '3', 10),
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
      const usedPorts = new Set<number>(
        activeDeployments.map((d) => d.port).filter((p) => p != null),
      );

      // Query Docker daemon for any containers already mapping host ports
      try {
        const containers = await this.docker.listContainers({ all: true });
        for (const container of containers) {
          if (container.Ports) {
            for (const p of container.Ports) {
              if (p.PublicPort) {
                usedPorts.add(p.PublicPort);
              }
            }
          }
        }
      } catch (dockerErr) {
        this.logger.warn(
          `Could not list docker containers for port check: ${dockerErr}`,
        );
      }

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

      // Diffusion pipelines (UNet + VAE + text encoder + safety checker,
      // loaded at fp32 on CPU) need well over 512MB even for a "tiny"
      // model — the billing tier alone (which defaults new models to SMALL)
      // isn't a reliable proxy for actual memory footprint for this model
      // type. Enforce a floor so these don't get OOM-killed (exit 137)
      // regardless of tier. Applied consistently everywhere TIER_RAM_MAP
      // is used below so eviction accounting stays accurate.
      const DIFFUSION_MIN_RAM_MB = 2048;
      const getRamMb = (model: { tier?: string; type?: ModelType }): number => {
        const tier = model.tier?.toUpperCase() || 'SMALL';
        const tierRam = TIER_RAM_MAP[tier] || 512;
        return model.type === ModelType.DIFFUSION
          ? Math.max(tierRam, DIFFUSION_MIN_RAM_MB)
          : tierRam;
      };

      const newModelTier =
        deployment.modelVersion.model.tier?.toUpperCase() || 'SMALL';
      const newModelRamMb = getRamMb(deployment.modelVersion.model);
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
        return sum + getRamMb(dep.modelVersion.model);
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
          const depRamMb = getRamMb(depToStop.modelVersion.model);

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

        // C1: mount the shared model-weights volume read-only at /weights
        // when build.processor.ts successfully relocated this version's
        // weights out of the Docker image (see build.processor.ts's
        // `weightsRelocated` flag). We detect this on disk rather than via a
        // DB column, mirroring the existing GGUF convention of using the
        // filesystem as the source of truth for weight location. If the
        // version's weights were never relocated (e.g. an older build, or
        // the relocation step failed and fell back to COPY-based image), no
        // bind is added and the image's own COPY'd weights are used as
        // before — this keeps both old and new images deployable.
        const weightsStorageEnv = process.env.WEIGHTS_STORAGE_PATH;
        const weightsStorageRoot = weightsStorageEnv
          ? path.resolve(weightsStorageEnv)
          : path.join(process.cwd(), 'uploads', 'model-weights');
        const versionWeightsDir = path.join(
          weightsStorageRoot,
          deployment.modelVersion.id,
        );
        // Check for actual content, not just directory presence — build.processor.ts
        // may leave an empty per-version directory behind if relocation failed
        // partway through, which must not be mistaken for a successful relocation.
        const hasRelocatedWeights =
          fs.existsSync(versionWeightsDir) &&
          fs.readdirSync(versionWeightsDir).length > 0;
        if (hasRelocatedWeights) {
          hostConfig.Binds = [`ai-platform_model_weights:/weights:ro`];
        }
      } else {
        // Mount the GGUF named volume directly for native WSL2 I/O speeds
        hostConfig.Binds = [`ai-platform_llm_models:/models:ro`];
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
          `/models/${deployment.modelVersion.id}.gguf`,
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

  /**
   * B4: Computes an increasing health-check re-poll delay so early attempts
   * (while the container is most likely to become healthy soon) poll
   * frequently, while later attempts back off to reduce unnecessary load on
   * the backend/Docker daemon during long framework-import waits (e.g.
   * PyTorch/TensorFlow/diffusion cold starts).
   *
   * @param attempt - The 1-indexed attempt number that is about to be scheduled.
   * @returns The delay, in milliseconds, before the next health-check attempt.
   */
  private getHealthCheckBackoffMs(attempt: number): number {
    if (attempt <= 5) return 2000;
    if (attempt <= 15) return 5000;
    return 10000;
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
      const probeTimeoutMs = parseInt(
        process.env.HEALTH_PROBE_TIMEOUT_MS || '5000',
        10,
      );
      const timeoutId = setTimeout(() => controller.abort(), probeTimeoutMs);

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
      // Re-queue health check with an increasing backoff delay (B4):
      // denser early on, sparser for long-running framework-import waits.
      const nextAttempt = attempt + 1;
      await this.deployQueue.add(
        'verify-deployment-health',
        { deploymentId, attempt: nextAttempt },
        { delay: this.getHealthCheckBackoffMs(nextAttempt) },
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
