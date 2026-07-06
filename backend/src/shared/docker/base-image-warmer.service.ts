import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Docker from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';
import { getDockerOptions } from './docker.util';

interface BaseImageSpec {
  tag: string;

  dockerfilePath: string;

  contextDir: string;
}

@Injectable()
export class BaseImageWarmerService implements OnModuleInit {
  private readonly docker: Docker;
  private readonly logger = new Logger(BaseImageWarmerService.name);

  private readonly baseImagesDir = fs.existsSync('/.dockerenv')
    ? '/usr/src/docker/base-images'
    : path.resolve(process.cwd(), '..', 'docker', 'base-images');

  private readonly images: BaseImageSpec[] = [
    {
      tag: 'ai-platform-sklearn-base:latest',
      dockerfilePath: path.join(this.baseImagesDir, 'sklearn-base.Dockerfile'),
      contextDir: this.baseImagesDir,
    },
    {
      tag: 'ai-platform-pytorch-base:latest',
      dockerfilePath: path.join(this.baseImagesDir, 'pytorch-base.Dockerfile'),
      contextDir: this.baseImagesDir,
    },
    {
      tag: 'ai-platform-tensorflow-base:latest',
      dockerfilePath: path.join(
        this.baseImagesDir,
        'tensorflow-base.Dockerfile',
      ),
      contextDir: this.baseImagesDir,
    },
    {
      tag: 'ai-platform-diffusion-base:latest',
      dockerfilePath: path.join(
        this.baseImagesDir,
        'diffusion-base.Dockerfile',
      ),
      contextDir: this.baseImagesDir,
    },
  ];

  constructor() {
    this.docker = new Docker(getDockerOptions());
  }

  onModuleInit(): void {
    this.warmAll().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Base image warming failed unexpectedly: ${message}`);
    });
  }

  private async warmAll(): Promise<void> {
    this.logger.log('Starting base image warm-up check...');
    for (const image of this.images) {
      try {
        await this.docker.getImage(image.tag).inspect();
        this.logger.log(`Base image ${image.tag} already present. Skipping.`);
        continue;
      } catch {}

      const registry = process.env.BASE_IMAGE_REGISTRY;
      if (registry) {
        await this.pullFromRegistry(image, registry);
      } else {
        await this.buildLocally(image);
      }
    }
    this.logger.log('Base image warm-up check complete.');
  }

  private async pullFromRegistry(
    image: BaseImageSpec,
    registry: string,
  ): Promise<void> {
    const remoteRef = `${registry.replace(/\/$/, '')}/${image.tag}`;
    this.logger.log(
      `Base image ${image.tag} not found locally. Pulling from registry: ${remoteRef}`,
    );
    try {
      await new Promise<void>((resolve, reject) => {
        this.docker.pull(remoteRef, {}, (err, stream) => {
          if (err) return reject(err);
          if (!stream)
            return reject(new Error('Docker pull stream is undefined'));
          this.docker.modem.followProgress(stream, (followErr) => {
            if (followErr) return reject(followErr);
            resolve();
          });
        });
      });
      const pulled = this.docker.getImage(remoteRef);
      await pulled.tag({
        repo: image.tag.split(':')[0],
        tag: image.tag.split(':')[1] || 'latest',
      });
      this.logger.log(
        `Successfully pulled and tagged ${image.tag} from registry.`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to pull base image ${image.tag} from registry ${registry}: ${message}. ` +
          `Builds needing this image will fall back to python:3.11-slim until it is available.`,
      );
    }
  }

  private async buildLocally(image: BaseImageSpec): Promise<void> {
    if (!fs.existsSync(image.dockerfilePath)) {
      this.logger.warn(
        `Dockerfile for ${image.tag} not found at ${image.dockerfilePath}. Skipping local build.`,
      );
      return;
    }

    this.logger.log(
      `Base image ${image.tag} not found locally. Building in background from ${image.dockerfilePath}...`,
    );
    try {
      const pack = await this.docker.buildImage(
        {
          context: image.contextDir,
          src: fs.readdirSync(image.contextDir),
        },
        {
          t: image.tag,
          dockerfile: path.basename(image.dockerfilePath),
        },
      );

      await new Promise<void>((resolve, reject) => {
        this.docker.modem.followProgress(
          pack,
          (err: Error | null, res: unknown[] | undefined) => {
            if (err) return reject(err);
            if (res && Array.isArray(res)) {
              const errorObj = res.find(
                (r) =>
                  r &&
                  typeof r === 'object' &&
                  'errorDetail' in r &&
                  (r as { errorDetail?: unknown }).errorDetail,
              ) as { error: string } | undefined;
              if (errorObj) return reject(new Error(errorObj.error));
            }
            resolve();
          },
          (event: { stream?: string; status?: string }) => {
            if (event?.stream?.trim()) {
              this.logger.log(
                `[BaseImageWarmer] [${image.tag}] ${event.stream.trim()}`,
              );
            }
          },
        );
      });

      this.logger.log(`Successfully built base image ${image.tag}.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to build base image ${image.tag} locally: ${message}. ` +
          `Builds needing this image will fall back to python:3.11-slim until it is available.`,
      );
    }
  }
}
