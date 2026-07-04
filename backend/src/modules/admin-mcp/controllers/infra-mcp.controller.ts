import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as Docker from 'dockerode';
import { ApiKeyOrJwtGuard } from '../../auth/guards/api-key-or-jwt.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { getDockerOptions } from '../../../shared/docker/docker.util';
import { MinioService } from '../../../shared/minio/minio.service';

/**
 * Read-only infrastructure health surface consumed by the
 * `observability_get_queue_status`, `observability_list_containers`, and
 * `observability_get_storage_stats` MCP tools. None of this is visible
 * anywhere else today — the dashboard has no BullMQ, Docker container, or
 * MinIO storage inventory view, only Prometheus/Loki-derived metrics.
 */
@Controller('admin-mcp')
@UseGuards(ApiKeyOrJwtGuard, AdminGuard)
export class InfraMcpController {
  private readonly docker: Docker;

  constructor(
    @InjectQueue('build-queue') private readonly buildQueue: Queue,
    @InjectQueue('deploy-queue') private readonly deployQueue: Queue,
    private readonly minioService: MinioService,
  ) {
    this.docker = new Docker(getDockerOptions());
  }

  /**
   * Reports BullMQ job counts (waiting/active/completed/failed/delayed) for the
   * build and deploy queues.
   *
   * @returns Job counts per queue.
   */
  @Get('queue-status')
  async getQueueStatus() {
    const [buildCounts, deployCounts] = await Promise.all([
      this.buildQueue.getJobCounts(),
      this.deployQueue.getJobCounts(),
    ]);

    return {
      buildQueue: buildCounts,
      deployQueue: deployCounts,
    };
  }

  /**
   * Lists every Docker container visible to the host, running or stopped.
   *
   * @returns Container inventory (id, image, status, uptime, ports).
   */
  @Get('containers')
  async listContainers() {
    const containers = await this.docker.listContainers({ all: true });
    return containers.map((c) => ({
      id: c.Id.substring(0, 12),
      names: c.Names,
      image: c.Image,
      state: c.State,
      status: c.Status,
      createdAt: new Date(c.Created * 1000).toISOString(),
      ports: c.Ports.map((p) => ({
        privatePort: p.PrivatePort,
        publicPort: p.PublicPort ?? null,
        type: p.Type,
      })),
    }));
  }

  /**
   * Reports aggregate object storage usage for the model artifact bucket.
   *
   * @returns Bucket name, object count, and total size in bytes.
   */
  @Get('storage')
  async getStorageStats() {
    return this.minioService.getStorageStats();
  }
}
