import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ModelType, VersionStatus } from '../../models';
import { Model } from '../../models/entities/model.entity';
import { DeploymentStatus, DeploymentsService } from '../../deployments';
import { Deployment } from '../../deployments/entities/deployment.entity';

@Injectable()
export class InferenceDeploymentResolverService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly deploymentsService: DeploymentsService,
  ) {}

  async resolveDeploymentUrl(
    model: Model,
    versionNumber?: number,
  ): Promise<{ url: string; deploymentId: string }> {
    if (versionNumber) {
      const running = await this.dataSource.getRepository(Deployment).findOne({
        where: {
          modelVersion: { model: { id: model.id }, versionNumber },
          status: DeploymentStatus.RUNNING,
        },
        order: { createdAt: 'DESC' },
        relations: ['modelVersion'],
      });
      if (running && running.url) {
        return { url: running.url, deploymentId: running.id };
      }
    } else {
      const runningDeployments = await this.dataSource
        .getRepository(Deployment)
        .find({
          where: {
            modelVersion: { model: { id: model.id } },
            status: DeploymentStatus.RUNNING,
          },
          relations: ['modelVersion'],
        });
      const withUrl = runningDeployments.filter((d) => d.url);
      const selected = this.pickWeighted(withUrl);
      if (selected) {
        return { url: selected.url as string, deploymentId: selected.id };
      }
    }

    const targetVersion = versionNumber
      ? model.versions?.find((v) => v.versionNumber === versionNumber)
      : model.versions && model.versions.length
        ? [...model.versions].sort(
            (a, b) => b.versionNumber - a.versionNumber,
          )[0]
        : null;

    if (!targetVersion) {
      throw new NotFoundException(
        versionNumber
          ? `Version v${versionNumber} is not found for this model.`
          : 'No versions available for this model to deploy.',
      );
    }
    if (targetVersion.status !== VersionStatus.READY) {
      throw new BadRequestException(
        `Version v${targetVersion.versionNumber} is not ready (status: ${targetVersion.status}). Cannot deploy automatically.`,
      );
    }

    let pending = await this.dataSource.getRepository(Deployment).findOne({
      where: {
        modelVersion: { id: targetVersion.id },
        status: DeploymentStatus.STARTING,
      },
      order: { createdAt: 'DESC' },
    });
    if (!pending) {
      pending = await this.deploymentsService.deployVersion(targetVersion.id);
    }

    const isLlm = model.type === ModelType.LLM_GGUF;
    const url = await this.waitForDeployment(
      pending.id,
      isLlm ? 300000 : 30000,
    );
    return { url, deploymentId: pending.id };
  }

  private pickWeighted(deployments: Deployment[]): Deployment | null {
    if (deployments.length === 0) return null;
    if (deployments.length === 1) return deployments[0];

    const totalWeight = deployments.reduce(
      (sum, d) => sum + Math.max(0, d.trafficWeight ?? 100),
      0,
    );
    if (totalWeight <= 0) {
      return deployments[Math.floor(Math.random() * deployments.length)];
    }

    let roll = Math.random() * totalWeight;
    for (const d of deployments) {
      roll -= Math.max(0, d.trafficWeight ?? 100);
      if (roll <= 0) return d;
    }
    return deployments[deployments.length - 1];
  }

  private async waitForDeployment(
    deploymentId: string,
    timeoutMs = 30000,
  ): Promise<string> {
    const startTime = Date.now();
    const interval = 500;

    while (Date.now() - startTime < timeoutMs) {
      const dep = await this.deploymentsService.getDeployment(deploymentId);
      if (dep) {
        if (dep.status === DeploymentStatus.RUNNING && dep.url) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          return dep.url;
        }
        if (dep.status === DeploymentStatus.FAILED) {
          throw new BadRequestException(
            `Auto-deployment failed: ${dep.errorMessage || 'Unknown error'}`,
          );
        }
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new BadRequestException(
      'Auto-deployment timed out. Please try again.',
    );
  }
}
