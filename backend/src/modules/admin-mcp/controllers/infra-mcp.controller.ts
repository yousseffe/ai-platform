import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as Docker from 'dockerode';
import { ApiKeyOrJwtGuard } from '../../../shared/guards/api-key-or-jwt.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { getDockerOptions } from '../../../shared/docker/docker.util';
import { MinioService } from '../../../shared/minio/minio.service';

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

  @Get('storage')
  async getStorageStats() {
    return this.minioService.getStorageStats();
  }
}
