import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Docker from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';
import { getDockerOptions } from './docker.util';

/**
 * Describes one of the platform's four base Docker images used by
 * `BuildProcessor` when generating per-model-version Dockerfiles.
 */
interface BaseImageSpec {
  /** The local Docker image tag, e.g. `ai-platform-pytorch-base:latest`. */
  tag: string;
  /** Absolute path to the Dockerfile used to build this image locally. */
  dockerfilePath: string;
  /** The build context directory to pass to `docker build`. */
  contextDir: string;
}

/**
 * B7: Pre-warms the platform's four base Docker images (pytorch, tensorflow,
 * sklearn, diffusion) on backend startup, so the very first model build of a
 * cold Docker host doesn't pay the full multi-GB pip-install cost inline
 * mid-build (which previously fell back silently to vanilla
 * `python:3.11-slim` if the base image wasn't present).
 *
 * Investigation of this repo found `build-base-images.sh`/`.bat` at the repo
 * root, which build all four images locally via `docker build` from
 * `docker/base-images/*.Dockerfile` — there is no CI workflow or registry
 * push step for these images. Because of that, this warmer defaults to the
 * same local-build behavior. If `BASE_IMAGE_REGISTRY` is set, it prefers
 * pulling pre-built images from that registry instead (faster, and doesn't
 * require pip/network access to package indexes on every host).
 *
 * Both paths run in the background (fire-and-forget, logged) so backend
 * startup itself is never blocked waiting for a multi-minute image build.
 */
@Injectable()
export class BaseImageWarmerService implements OnModuleInit {
  private readonly docker: Docker;
  private readonly logger = new Logger(BaseImageWarmerService.name);

  /**
   * Directory containing the four base-image Dockerfiles. When running
   * inside the backend's own Docker container, `docker-compose.yml` bind-
   * mounts the repo-root `docker/base-images` directory to
   * `/usr/src/docker/base-images` (the repo root itself isn't otherwise
   * available inside the container — only `./backend` is). When running
   * directly on the host (e.g. `npm run dev`), the repo-root `docker/`
   * directory is one level up from `process.cwd()` (`backend/`).
   */
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

  /**
   * Kicks off warming of all four base images in the background. Does not
   * await completion — NestJS module bootstrap continues immediately.
   */
  onModuleInit(): void {
    this.warmAll().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Base image warming failed unexpectedly: ${message}`);
    });
  }

  /**
   * Checks and warms each base image sequentially in the background.
   * Sequential (not parallel) to avoid saturating the host with four
   * simultaneous multi-GB pip installs / pulls on cold start.
   */
  private async warmAll(): Promise<void> {
    this.logger.log('Starting base image warm-up check...');
    for (const image of this.images) {
      try {
        await this.docker.getImage(image.tag).inspect();
        this.logger.log(`Base image ${image.tag} already present. Skipping.`);
        continue;
      } catch {
        // Not present locally — fall through to pull or build.
      }

      const registry = process.env.BASE_IMAGE_REGISTRY;
      if (registry) {
        await this.pullFromRegistry(image, registry);
      } else {
        await this.buildLocally(image);
      }
    }
    this.logger.log('Base image warm-up check complete.');
  }

  /**
   * Pulls a pre-built base image from the configured registry and re-tags it
   * to the local tag `BuildProcessor` expects.
   */
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

  /**
   * Builds a base image locally from its Dockerfile, mirroring
   * `build-base-images.sh`/`.bat` at the repo root.
   */
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
